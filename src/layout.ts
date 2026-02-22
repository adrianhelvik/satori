/**
 * This module is used to calculate the layout of the current sub-tree.
 */

import type { ReactNode } from 'react'
import {
  isReactElement,
  isClass,
  buildXMLString,
  normalizeChildren,
  hasDangerouslySetInnerHTMLProp,
  isReactComponent,
  isForwardRefComponent,
  lengthToNumber,
} from './utils.js'
import { getYoga, YogaNode } from './yoga.js'
import { SVGNodeToImage } from './handler/preprocess.js'
import {
  isSupportedDisplayValue,
  normalizeDisplayValue,
} from './handler/display.js'
import computeStyle from './handler/compute.js'
import FontLoader from './font.js'
import buildTextNodes from './text/index.js'
import { isTransformInput, type TransformInput } from './builder/transform.js'
import rect, { type BlendPrimitive } from './builder/rect.js'
import { Locale, normalizeLocale } from './language.js'
import type { SerializedStyle } from './handler/style-types.js'
import {
  getListMarkerText,
  isOrderedListMarkerType,
} from './handler/list-style.js'
import {
  applyListItemCounterStyles,
  buildListItemChildren,
  measureListMarkerTextWidth,
  parseListImageURL,
  type OrderedListCounterState,
} from './list-markers.js'
import { isClippedOverflow } from './overflow-semantics.js'
import {
  createMissingFontsPhase,
  createRenderInput,
  expectMissingFontsPhase,
  expectReadyForRenderPhase,
  READY_FOR_RENDER_PHASE,
  type LayoutPhase,
  type LayoutRenderInput,
  type MissingFontSegment,
} from './layout-protocol.js'
import cssColorParse from 'parse-css-color'
import { parseFiniteNumber } from './style-number.js'
import { normalizePositionValue } from './handler/position.js'

interface ListItemContext {
  listType: 'ul' | 'ol'
  index: number
  styleType?: string
  stylePosition?: string
  styleImage?: string
  orderedCounter?: OrderedListCounterState
}

export interface LayoutContext {
  id: string
  parentStyle: SerializedStyle
  inheritedStyle: SerializedStyle
  isInheritingTransform?: boolean
  parent: YogaNode
  font: FontLoader
  embedFont: boolean
  debug?: boolean
  graphemeImages?: Record<string, string>
  canLoadAdditionalAssets: boolean
  locale?: Locale
  getTwStyles: (
    tw: string,
    style: Record<string, unknown> | undefined
  ) => Record<string, unknown>
  onNodeDetected?: (node: SatoriNode) => void
  listItemContext?: ListItemContext
  childRenderMeta?: ChildRenderMeta
}

interface ChildRenderMeta {
  node?: YogaNode
  type?: string
  style?: SerializedStyle
}

export interface SatoriNode {
  // Layout information.
  left: number
  top: number
  width: number
  height: number
  type: string
  key?: string | number
  props: Record<string, any>
  textContent?: string
}

interface ChildSortMeta {
  child: ReactNode
  order: number
  zIndex: number
  originalIndex: number
}

interface TableCellPlacement {
  cell: ReactNode
  row: number
  column: number
  rowSpan: number
  colSpan: number
}

const FIXED_ISOLATED_INHERITED_PROPS: ReadonlyArray<keyof SerializedStyle> = [
  'transform',
  '_inheritedClipPathId',
  '_inheritedMaskId',
  '_inheritedBackgroundClipTextPath',
]

const TABLE_CONTAINER_DISPLAYS = new Set(['table', 'inline-table'])
const TABLE_ROW_GROUP_DISPLAYS = new Set([
  'table-row-group',
  'table-header-group',
  'table-footer-group',
])

function isFixedPositionStyle(
  style: Record<string, unknown> | undefined
): boolean {
  if (!style) return false
  return normalizePositionValue(style.position) === 'fixed'
}

function resolveFixedInset(
  value: unknown,
  viewportLength: number,
  style: SerializedStyle,
  inheritedStyle: SerializedStyle
): number | undefined {
  if (typeof value === 'undefined' || value === 'auto') return undefined

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }

  if (typeof value !== 'string') return undefined

  const baseFontSize = parseFiniteNumber(
    style.fontSize,
    parseFiniteNumber(inheritedStyle.fontSize, 16)
  )

  return lengthToNumber(
    value,
    baseFontSize,
    viewportLength,
    style as Record<string, string | number | object>,
    true
  )
}

function resolveFixedPosition(
  layoutBox: { left: number; top: number; width: number; height: number },
  style: SerializedStyle,
  inheritedStyle: SerializedStyle
): { left: number; top: number } {
  const viewportWidth = parseFiniteNumber(
    style._viewportWidth,
    parseFiniteNumber(inheritedStyle._viewportWidth, 0)
  )
  const viewportHeight = parseFiniteNumber(
    style._viewportHeight,
    parseFiniteNumber(inheritedStyle._viewportHeight, 0)
  )

  const leftInset = resolveFixedInset(
    style.left,
    viewportWidth,
    style,
    inheritedStyle
  )
  const rightInset = resolveFixedInset(
    style.right,
    viewportWidth,
    style,
    inheritedStyle
  )
  const topInset = resolveFixedInset(
    style.top,
    viewportHeight,
    style,
    inheritedStyle
  )
  const bottomInset = resolveFixedInset(
    style.bottom,
    viewportHeight,
    style,
    inheritedStyle
  )

  let left = layoutBox.left
  let top = layoutBox.top

  if (typeof leftInset === 'number') {
    left = leftInset
  } else if (typeof rightInset === 'number') {
    left = viewportWidth - rightInset - layoutBox.width
  }

  if (typeof topInset === 'number') {
    top = topInset
  } else if (typeof bottomInset === 'number') {
    top = viewportHeight - bottomInset - layoutBox.height
  }

  return { left, top }
}

function isolateFixedInheritance(
  inheritedStyle: SerializedStyle
): SerializedStyle {
  const nextInheritedStyle = { ...inheritedStyle }
  for (const key of FIXED_ISOLATED_INHERITED_PROPS) {
    delete nextInheritedStyle[key]
  }
  return nextInheritedStyle
}

function resolveBlendPrimitive(
  meta: ChildRenderMeta | undefined,
  parentLeft: number,
  parentTop: number
): BlendPrimitive | null {
  if (!meta?.node || !meta?.style) return null
  if (meta.type !== 'div') return null

  const {
    mixBlendMode,
    transform,
    backgroundImage,
    clipPath,
    maskImage,
    filter,
    opacity,
    backgroundColor,
    borderLeftWidth,
    borderTopWidth,
    borderRightWidth,
    borderBottomWidth,
  } = meta.style

  if (mixBlendMode && mixBlendMode !== 'normal') return null
  if (transform) return null
  if (backgroundImage) return null
  if (clipPath && clipPath !== 'none') return null
  if (maskImage && maskImage !== 'none') return null
  if (filter && filter !== 'none') return null
  if (typeof opacity === 'number' && opacity < 1) return null
  if (
    (borderLeftWidth as number) > 0 ||
    (borderTopWidth as number) > 0 ||
    (borderRightWidth as number) > 0 ||
    (borderBottomWidth as number) > 0
  ) {
    return null
  }

  if (typeof backgroundColor !== 'string') return null
  const parsed = cssColorParse(backgroundColor)
  if (!parsed || (parsed.alpha ?? 1) < 1) return null

  const { left, top, width, height } = meta.node.getComputedLayout()
  if (width <= 0 || height <= 0) return null

  return {
    left: parentLeft + left,
    top: parentTop + top,
    width,
    height,
    color: backgroundColor,
  }
}

function getChildSortMeta(
  child: ReactNode,
  originalIndex: number,
  getTwStyles: LayoutContext['getTwStyles']
): ChildSortMeta {
  const childStyle = resolveElementStyle(child, getTwStyles)
  if (!childStyle) {
    return { child, order: 0, zIndex: 0, originalIndex }
  }

  return {
    child,
    order: parseFiniteNumber(childStyle?.order, 0),
    zIndex: parseFiniteNumber(childStyle?.zIndex, 0),
    originalIndex,
  }
}

function resolveElementStyle(
  child: ReactNode,
  getTwStyles: LayoutContext['getTwStyles']
) {
  if (!isReactElement(child) || typeof child.type !== 'string') return

  const childProps = child.props || {}
  let childStyle = childProps.style

  if (childProps.tw) {
    const twStyles = getTwStyles(childProps.tw, childStyle)
    childStyle = Object.assign(twStyles, childStyle)
  }

  return childStyle
}

function parsePositiveInteger(value: unknown): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
      ? parseInt(value, 10)
      : NaN

  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return Math.floor(parsed)
}

function isTableContainerElement(
  type: string,
  style: Record<string, unknown> | undefined
): boolean {
  if (type === 'table') return true
  return TABLE_CONTAINER_DISPLAYS.has(normalizeDisplayValue(style?.display))
}

function isTableRowElement(
  child: ReactNode,
  getTwStyles: LayoutContext['getTwStyles']
): boolean {
  if (!isReactElement(child) || typeof child.type !== 'string') return false

  if (child.type === 'tr') return true

  const childStyle = resolveElementStyle(child, getTwStyles)
  return normalizeDisplayValue(childStyle?.display) === 'table-row'
}

function isTableRowGroupElement(
  child: ReactNode,
  getTwStyles: LayoutContext['getTwStyles']
): boolean {
  if (!isReactElement(child) || typeof child.type !== 'string') return false

  if (
    child.type === 'thead' ||
    child.type === 'tbody' ||
    child.type === 'tfoot'
  ) {
    return true
  }

  const childStyle = resolveElementStyle(child, getTwStyles)
  return TABLE_ROW_GROUP_DISPLAYS.has(
    normalizeDisplayValue(childStyle?.display)
  )
}

function isTableCellElement(
  child: ReactNode,
  getTwStyles: LayoutContext['getTwStyles']
): boolean {
  if (!isReactElement(child) || typeof child.type !== 'string') return false

  if (child.type === 'td' || child.type === 'th') return true

  const childStyle = resolveElementStyle(child, getTwStyles)
  return normalizeDisplayValue(childStyle?.display) === 'table-cell'
}

function collectTableRows(
  children: ReactNode,
  getTwStyles: LayoutContext['getTwStyles']
): ReactNode[] {
  const rows: ReactNode[] = []
  for (const child of normalizeChildren(children)) {
    if (isTableRowElement(child, getTwStyles)) {
      rows.push(child)
      continue
    }

    if (!isReactElement(child) || !isTableRowGroupElement(child, getTwStyles)) {
      continue
    }

    for (const groupChild of normalizeChildren(child.props?.children)) {
      if (isTableRowElement(groupChild, getTwStyles)) {
        rows.push(groupChild)
      }
    }
  }
  return rows
}

function buildTableMatrix(
  rows: ReactNode[],
  getTwStyles: LayoutContext['getTwStyles']
): {
  placements: TableCellPlacement[]
  columnCount: number
  rowCount: number
} | null {
  const placements: TableCellPlacement[] = []
  const occupied: boolean[][] = []
  let columnCount = 0

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]
    if (!isReactElement(row)) continue

    const rowChildren = normalizeChildren(row.props?.children)
    const cells = rowChildren.filter((child) =>
      isTableCellElement(child, getTwStyles)
    )
    if (cells.length === 0) continue

    occupied[rowIndex] ||= []
    let columnIndex = 0

    for (const cell of cells) {
      while (occupied[rowIndex][columnIndex]) {
        columnIndex++
      }

      if (!isReactElement(cell)) continue
      const cellProps = cell.props || {}
      const rowSpan = parsePositiveInteger(
        cellProps.rowSpan ?? cellProps.rowspan
      )
      const colSpan = parsePositiveInteger(
        cellProps.colSpan ?? cellProps.colspan
      )

      placements.push({
        cell,
        row: rowIndex,
        column: columnIndex,
        rowSpan,
        colSpan,
      })

      for (let r = rowIndex; r < rowIndex + rowSpan; r++) {
        occupied[r] ||= []
        for (let c = columnIndex; c < columnIndex + colSpan; c++) {
          occupied[r][c] = true
        }
      }

      columnIndex += colSpan
    }

    columnCount = Math.max(columnCount, occupied[rowIndex].length)
  }

  if (placements.length === 0 || columnCount === 0) {
    return null
  }

  const rowCount = Math.max(
    occupied.length,
    ...placements.map((placement) => placement.row + placement.rowSpan)
  )
  if (!Number.isFinite(rowCount) || rowCount <= 0) return null

  return {
    placements,
    columnCount,
    rowCount,
  }
}

function convertTableElement(
  element: ReactNode,
  type: string,
  style: Record<string, unknown> | undefined,
  children: ReactNode,
  getTwStyles: LayoutContext['getTwStyles']
): ReactNode | null {
  if (!isTableContainerElement(type, style)) return null
  if (!isReactElement(element)) return null

  const rows = collectTableRows(children, getTwStyles)
  if (rows.length === 0) return null

  const matrix = buildTableMatrix(rows, getTwStyles)
  if (!matrix) return null

  const tableStyle = { ...(style || {}) }
  const normalizedPosition = normalizePositionValue(tableStyle.position)
  if (typeof normalizedPosition === 'string') {
    tableStyle.position = normalizedPosition
  }
  if (!tableStyle.position || tableStyle.position === 'static') {
    tableStyle.position = 'relative'
  }
  tableStyle.display = 'flex'
  if (typeof tableStyle.width === 'undefined') {
    tableStyle.width = matrix.columnCount * 80
  }
  if (typeof tableStyle.height === 'undefined') {
    tableStyle.height = matrix.rowCount * 40
  }

  const convertedChildren = matrix.placements.map((placement, index) => {
    if (!isReactElement(placement.cell)) {
      return placement.cell
    }

    const placementStyle = resolveElementStyle(placement.cell, getTwStyles)
    const cellStyle: Record<string, unknown> = {
      ...(placementStyle as Record<string, unknown>),
      position: 'absolute',
      left: `${(placement.column / matrix.columnCount) * 100}%`,
      top: `${(placement.row / matrix.rowCount) * 100}%`,
      width: `${(placement.colSpan / matrix.columnCount) * 100}%`,
      height: `${(placement.rowSpan / matrix.rowCount) * 100}%`,
      display: 'flex',
      boxSizing: placementStyle?.boxSizing || 'border-box',
    }

    const cellProps = placement.cell.props || {}
    const {
      style: _style,
      tw: _tw,
      rowSpan: _rowSpan,
      rowspan: _rowspan,
      colSpan: _colSpan,
      colspan: _colspan,
      children: cellChildren,
      ...restCellProps
    } = cellProps

    return {
      type: 'div',
      key: placement.cell.key ?? `table-cell-${index}`,
      props: {
        ...restCellProps,
        style: cellStyle,
        children: cellChildren,
      },
    }
  })

  const elementProps = element.props || {}
  const {
    style: _style,
    tw: _tw,
    children: _children,
    ...restProps
  } = elementProps

  return {
    type: 'div',
    key: element.key,
    props: {
      ...restProps,
      style: tableStyle,
      children: convertedChildren,
    },
  }
}

function isListItemElement(
  child: ReactNode,
  getTwStyles: LayoutContext['getTwStyles']
) {
  if (!isReactElement(child) || typeof child.type !== 'string') return false

  if (child.type === 'li') return true

  const childStyle = resolveElementStyle(child, getTwStyles)
  return normalizeDisplayValue(childStyle?.display) === 'list-item'
}

export default async function* layout(
  element: ReactNode,
  context: LayoutContext
): AsyncGenerator<LayoutPhase, string, LayoutRenderInput> {
  const Yoga = await getYoga()
  const {
    id,
    inheritedStyle,
    parent,
    font,
    debug,
    locale,
    embedFont = true,
    graphemeImages,
    canLoadAdditionalAssets,
    getTwStyles,
    listItemContext,
    childRenderMeta,
  } = context

  // 1. Pre-process the node.
  if (element === null || typeof element === 'undefined') {
    yield createMissingFontsPhase([])
    yield READY_FOR_RENDER_PHASE
    return ''
  }

  // Not a regular element.
  if (!isReactElement(element) || isReactComponent(element.type)) {
    let iter: ReturnType<typeof layout>

    if (!isReactElement(element)) {
      // Process as text node.
      iter = buildTextNodes(String(element), context)
      const missingFontsResult = await iter.next()
      const missingFonts = expectMissingFontsPhase(
        missingFontsResult,
        `text node ${id}`
      )
      yield createMissingFontsPhase(missingFonts)
    } else {
      if (isClass(element.type as Function)) {
        throw new Error('Class component is not supported.')
      }

      let render: Function

      // This is a hack to support React.forwardRef wrapped components.
      // https://github.com/vercel/satori/issues/600
      if (isForwardRefComponent(element.type)) {
        render = (element.type as any).render
      } else {
        render = element.type as Function
      }

      // If it's a custom component, Satori strictly requires it to be pure,
      // stateless, and not relying on any React APIs such as hooks or suspense.
      // So we can safely evaluate it to render. Otherwise, an error will be
      // thrown by React.
      iter = layout(await render(element.props), context)
      const missingFontsResult = await iter.next()
      const missingFonts = expectMissingFontsPhase(
        missingFontsResult,
        `custom component ${id}`
      )
      yield createMissingFontsPhase(missingFonts)
    }

    const readyResult = await iter.next()
    expectReadyForRenderPhase(readyResult, `custom component ${id}`)

    const renderInput = yield READY_FOR_RENDER_PHASE
    const renderResult = await iter.next(renderInput)
    if (!renderResult.done) {
      throw new Error(
        `Layout pipeline did not complete during render phase (custom component ${id}).`
      )
    }
    return renderResult.value
  }

  // Process as element.
  const { type: $type, props } = element
  // type must be a string here.
  const type = $type as string

  if (props && hasDangerouslySetInnerHTMLProp(props)) {
    throw new Error(
      'dangerouslySetInnerHTML property is not supported. See documentation for more information https://github.com/vercel/satori#jsx.'
    )
  }
  let { style, children, tw, lang: _newLocale = locale } = props || {}
  const newLocale = normalizeLocale(_newLocale)

  // Extend Tailwind styles.
  if (tw) {
    const twStyles = getTwStyles(tw, style)
    style = Object.assign(twStyles, style)
  }

  const convertedTableElement = convertTableElement(
    element,
    type,
    style as Record<string, unknown> | undefined,
    children,
    getTwStyles
  )
  if (convertedTableElement) {
    const iter = layout(convertedTableElement, context)
    const missingFontsResult = await iter.next()
    const missingFonts = expectMissingFontsPhase(
      missingFontsResult,
      `table rewrite ${id}`
    )
    yield createMissingFontsPhase(missingFonts)

    const readyResult = await iter.next()
    expectReadyForRenderPhase(readyResult, `table rewrite ${id}`)

    const renderInput = yield READY_FOR_RENDER_PHASE
    const renderResult = await iter.next(renderInput)
    if (!renderResult.done) {
      throw new Error(
        `Layout pipeline did not complete during render phase (table rewrite ${id}).`
      )
    }
    return renderResult.value
  }

  const styleObject =
    style && typeof style === 'object'
      ? (style as Record<string, unknown>)
      : undefined
  const effectiveInheritedStyle = isFixedPositionStyle(styleObject)
    ? isolateFixedInheritance(inheritedStyle)
    : inheritedStyle

  const node = Yoga.Node.create()
  parent.insertChild(node, parent.getChildCount())

  const [computedStyle, newInheritableStyle] = await computeStyle(
    node,
    type,
    effectiveInheritedStyle,
    style,
    props
  )

  if (childRenderMeta) {
    childRenderMeta.node = node
    childRenderMeta.style = computedStyle
    childRenderMeta.type = type
  }
  // Post-process styles to attach inheritable properties for Satori.

  // If the element is inheriting the parent `transform`, or applying its own.
  // This affects the coordinate system.
  const isInheritingTransform =
    computedStyle.transform === effectiveInheritedStyle.transform

  // If the element has clipping overflow or clip-path set, we need to create a
  // clip path and use it in all its children.
  if (
    isClippedOverflow(computedStyle.overflow) ||
    isClippedOverflow(computedStyle.overflowX) ||
    isClippedOverflow(computedStyle.overflowY) ||
    (computedStyle.clipPath && computedStyle.clipPath !== 'none')
  ) {
    newInheritableStyle._inheritedClipPathId = `satori_cp-${id}`
    newInheritableStyle._inheritedMaskId = `satori_om-${id}`
  }

  if (computedStyle.maskImage) {
    newInheritableStyle._inheritedMaskId = `satori_mi-${id}`
  }

  if (typeof computedStyle.backgroundColor === 'string') {
    newInheritableStyle._parentBackgroundColor = computedStyle.backgroundColor
  }

  // If the element has `background-clip: text` set, we need to create a clip
  // path and use it in all its children.
  if (computedStyle.backgroundClip === 'text') {
    const mutateRefValue: NonNullable<
      SerializedStyle['_inheritedBackgroundClipTextPath']
    > = { value: '' }
    newInheritableStyle._inheritedBackgroundClipTextPath = mutateRefValue
    computedStyle._inheritedBackgroundClipTextPath = mutateRefValue
  }

  const shouldApplyListMarker =
    !!listItemContext &&
    (type === 'li' ||
      normalizeDisplayValue(computedStyle.display) === 'list-item')

  if (shouldApplyListMarker && listItemContext) {
    const listStyleType =
      (computedStyle.listStyleType as string | undefined) ||
      listItemContext.styleType ||
      (listItemContext.listType === 'ol' ? 'decimal' : 'disc')
    const listStylePosition =
      ((computedStyle.listStylePosition as string | undefined) ||
        listItemContext.stylePosition ||
        'outside') + ''
    const listStyleImage = parseListImageURL(
      (computedStyle.listStyleImage as string | undefined) ||
        listItemContext.styleImage
    )
    let markerIndex = listItemContext.index
    if (listItemContext.orderedCounter) {
      applyListItemCounterStyles(
        listItemContext.orderedCounter,
        computedStyle,
        1
      )
      markerIndex = listItemContext.orderedCounter.value
    }
    const markerText = getListMarkerText(listStyleType, markerIndex)

    if (listStyleImage || markerText) {
      const markerFontSize = parseFiniteNumber(
        computedStyle.fontSize,
        parseFiniteNumber(effectiveInheritedStyle.fontSize, 16)
      )
      const markerTextWidth = measureListMarkerTextWidth(
        markerText,
        markerFontSize,
        computedStyle,
        font,
        newLocale
      )
      const normalizedMarkerPosition = listStylePosition.trim().toLowerCase()
      const listItemChildren = buildListItemChildren(
        children,
        {
          text: markerText,
          image: listStyleImage,
          position: normalizedMarkerPosition,
        },
        markerFontSize,
        markerTextWidth
      )
      children = listItemChildren.children

      if (
        listItemChildren.requiresRelativePosition &&
        (!computedStyle.position || computedStyle.position === 'static')
      ) {
        computedStyle.position = 'relative'
      }
    }
  }

  // 2. Do layout recursively for its children.
  const sortedChildren = normalizeChildren(children)
    .map((child, originalIndex) =>
      getChildSortMeta(child, originalIndex, getTwStyles)
    )
    .sort((a, b) => a.order - b.order || a.originalIndex - b.originalIndex)
  const iterators: {
    iter: ReturnType<typeof layout>
    orderIndex: number
    zIndex: number
    renderMeta: ChildRenderMeta
  }[] = []

  let i = 0
  const isListContainer = type === 'ul' || type === 'ol'
  const listStyleType =
    (computedStyle.listStyleType as string | undefined) ||
    (type === 'ol' ? 'decimal' : 'disc')
  const listStylePosition =
    ((computedStyle.listStylePosition as string | undefined) || 'outside') + ''
  const listStyleImage =
    ((computedStyle.listStyleImage as string | undefined) || 'none') + ''
  let orderedListCounter: OrderedListCounterState | undefined
  const hasOrderedListMarkers =
    type === 'ol' ||
    (typeof listStyleType === 'string' &&
      isOrderedListMarkerType(listStyleType))
  if (hasOrderedListMarkers) {
    orderedListCounter = { value: 0 }
    applyListItemCounterStyles(orderedListCounter, computedStyle, 0)
  }
  let listItemIndex = 0
  const segmentsMissingFont: MissingFontSegment[] = []
  for (let orderIndex = 0; orderIndex < sortedChildren.length; orderIndex++) {
    const { child, zIndex } = sortedChildren[orderIndex]
    let childListItemContext: ListItemContext | undefined
    if (isListItemElement(child, getTwStyles)) {
      childListItemContext = {
        listType: isListContainer ? (type as 'ul' | 'ol') : 'ul',
        index: ++listItemIndex,
        styleType: listStyleType,
        stylePosition: listStylePosition,
        styleImage: listStyleImage,
        orderedCounter: orderedListCounter,
      }
    }
    const renderMeta: ChildRenderMeta = {}
    const iter = layout(child, {
      id: id + '-' + i++,
      parentStyle: computedStyle,
      inheritedStyle: newInheritableStyle,
      isInheritingTransform: true,
      parent: node,
      font,
      embedFont,
      debug,
      graphemeImages,
      canLoadAdditionalAssets,
      locale: newLocale,
      getTwStyles,
      onNodeDetected: context.onNodeDetected,
      listItemContext: childListItemContext,
      childRenderMeta: renderMeta,
    })
    const childMissingFontsResult = await iter.next()
    const childMissingFonts = expectMissingFontsPhase(
      childMissingFontsResult,
      `child ${id}-${orderIndex}`
    )
    if (canLoadAdditionalAssets) {
      segmentsMissingFont.push(...childMissingFonts)
    }
    iterators.push({ iter, orderIndex, zIndex, renderMeta })
  }
  yield createMissingFontsPhase(segmentsMissingFont)
  for (const { iter, orderIndex } of iterators) {
    const readyResult = await iter.next()
    expectReadyForRenderPhase(readyResult, `child ${id}-${orderIndex}`)
  }

  // 3. Post-process the node.
  const renderInput = yield READY_FOR_RENDER_PHASE
  const [x, y] = renderInput.offset
  const siblingBlendBackdrops = renderInput.siblingBlendBackdrops || []
  let { left, top, width, height } = node.getComputedLayout()
  if (computedStyle.position === 'fixed') {
    const fixedPosition = resolveFixedPosition(
      { left, top, width, height },
      computedStyle,
      effectiveInheritedStyle
    )
    left = fixedPosition.left
    top = fixedPosition.top
  } else {
    // Attach offset to the current node.
    left += x
    top += y
  }

  let childrenRenderResult = ''
  let baseRenderResult = ''
  let depsRenderResult = ''

  // Emit event for the current node. We don't pass the children prop to the
  // event handler because everything is already flattened, unless it's a text
  // node.
  const { children: childrenNode, ...restProps } = props
  context.onNodeDetected?.({
    left,
    top,
    width,
    height,
    type,
    props: restProps,
    key: element.key,
    textContent: isReactElement(childrenNode) ? undefined : childrenNode,
  })

  // Generate the rendered markup for the current node.
  const parentBackgroundColor = effectiveInheritedStyle._parentBackgroundColor
  const parentLayout = parent.getComputedLayout()
  const parentTransform: TransformInput | undefined = isTransformInput(
    effectiveInheritedStyle.transform
  )
    ? effectiveInheritedStyle.transform
    : undefined

  if (type === 'img') {
    const src = computedStyle.__src
    if (typeof src !== 'string') {
      throw new Error('Image source is missing after image resolution.')
    }
    baseRenderResult = await rect(
      {
        id,
        left,
        top,
        width,
        height,
        src,
        isInheritingTransform,
        parentTransform,
        parentTransformSize: {
          width: parentLayout.width,
          height: parentLayout.height,
        },
        debug,
      },
      computedStyle,
      newInheritableStyle,
      siblingBlendBackdrops,
      parentBackgroundColor
    )
  } else if (type === 'svg') {
    // When entering a <svg> node, we need to convert it to a <img> with the
    // SVG data URL embedded.
    const currentColor = computedStyle.color
    const src = await SVGNodeToImage(element, currentColor, width, height)
    baseRenderResult = await rect(
      {
        id,
        left,
        top,
        width,
        height,
        src,
        isInheritingTransform,
        parentTransform,
        parentTransformSize: {
          width: parentLayout.width,
          height: parentLayout.height,
        },
        debug,
      },
      computedStyle,
      newInheritableStyle,
      siblingBlendBackdrops,
      parentBackgroundColor
    )
  } else {
    const display = normalizeDisplayValue(
      style?.display || computedStyle.display
    )
    if (
      type === 'div' &&
      children &&
      typeof children !== 'string' &&
      !isSupportedDisplayValue(display)
    ) {
      throw new Error(
        `Expected <div> to have explicit "display: flex", "display: contents", or "display: none" if it has more than one child node.`
      )
    }
    baseRenderResult = await rect(
      {
        id,
        left,
        top,
        width,
        height,
        isInheritingTransform,
        parentTransform,
        parentTransformSize: {
          width: parentLayout.width,
          height: parentLayout.height,
        },
        debug,
      },
      computedStyle,
      newInheritableStyle,
      siblingBlendBackdrops,
      parentBackgroundColor
    )
  }

  // Generate the rendered markup for the children.
  const paintIterators = [...iterators].sort(
    (a, b) => a.zIndex - b.zIndex || a.orderIndex - b.orderIndex
  )
  const paintedBlendPrimitives: BlendPrimitive[] = []
  for (const { iter, renderMeta, orderIndex } of paintIterators) {
    const childRenderResult = await iter.next(
      createRenderInput([left, top], paintedBlendPrimitives)
    )
    if (!childRenderResult.done) {
      throw new Error(
        `Layout pipeline did not complete during child render (${id}-${orderIndex}).`
      )
    }
    childrenRenderResult += childRenderResult.value
    const primitive = resolveBlendPrimitive(renderMeta, left, top)
    if (primitive) {
      paintedBlendPrimitives.push(primitive)
    }
  }

  // An extra pass to generate the special background-clip shape collected from
  // children.
  if (computedStyle._inheritedBackgroundClipTextPath) {
    depsRenderResult += buildXMLString(
      'clipPath',
      {
        id: `satori_bct-${id}`,
        'clip-path': computedStyle._inheritedClipPathId
          ? `url(#${computedStyle._inheritedClipPathId})`
          : undefined,
      },
      computedStyle._inheritedBackgroundClipTextPath.value
    )
  }

  return depsRenderResult + baseRenderResult + childrenRenderResult
}
