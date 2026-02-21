/**
 * This module is used to calculate the layout of the current sub-tree.
 */

import { createElement, type ReactNode } from 'react'
import {
  isReactElement,
  isClass,
  buildXMLString,
  normalizeChildren,
  hasDangerouslySetInnerHTMLProp,
  isReactComponent,
  isForwardRefComponent,
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
import type { TransformInput } from './builder/transform.js'
import rect, { type BlendPrimitive } from './builder/rect.js'
import { Locale, normalizeLocale } from './language.js'
import { SerializedStyle } from './handler/expand.js'
import { getListMarkerText } from './handler/list-style.js'
import { isClippedOverflow } from './overflow-semantics.js'
import cssColorParse from 'parse-css-color'

interface ListItemContext {
  listType: 'ul' | 'ol'
  index: number
  styleType?: string
  stylePosition?: string
  styleImage?: string
  orderedCounter?: OrderedListCounterState
}

interface OrderedListCounterState {
  value: number
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
  getTwStyles: (tw: string, style: any) => any
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

function parseStyleNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

interface ParsedCounterProperty {
  explicit: boolean
  none: boolean
  values: Map<string, number>
}

const integerCounterToken = /^[+-]?\d+$/

function parseCounterProperty(
  value: unknown,
  defaultAmount: number
): ParsedCounterProperty {
  if (typeof value !== 'string') {
    return { explicit: false, none: false, values: new Map() }
  }

  const raw = value.trim()
  if (!raw) {
    return { explicit: false, none: false, values: new Map() }
  }

  if (raw.toLowerCase() === 'none') {
    return { explicit: true, none: true, values: new Map() }
  }

  const values = new Map<string, number>()
  const tokens = raw.split(/\s+/).filter(Boolean)
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (integerCounterToken.test(token)) continue

    const name = token.toLowerCase()
    let amount = defaultAmount
    const maybeAmount = tokens[i + 1]
    if (maybeAmount && integerCounterToken.test(maybeAmount)) {
      amount = Number.parseInt(maybeAmount, 10)
      i++
    }
    values.set(name, amount)
  }

  return { explicit: true, none: false, values }
}

function applyListItemCounterStyles(
  counter: OrderedListCounterState,
  style: SerializedStyle,
  defaultIncrement: number
) {
  const reset = parseCounterProperty(style.counterReset, 0)
  const resetListItem = reset.values.get('list-item')
  if (typeof resetListItem === 'number') {
    counter.value = resetListItem
  }

  const set = parseCounterProperty(style.counterSet, 0)
  const setListItem = set.values.get('list-item')
  if (typeof setListItem === 'number') {
    counter.value = setListItem
  }

  const increment = parseCounterProperty(style.counterIncrement, 1)
  if (increment.none) return

  if (increment.explicit) {
    const incrementListItem = increment.values.get('list-item')
    if (typeof incrementListItem === 'number') {
      counter.value += incrementListItem
    }
    return
  }

  if (defaultIncrement !== 0) {
    counter.value += defaultIncrement
  }
}

function getChildSortMeta(
  child: ReactNode,
  originalIndex: number,
  getTwStyles: LayoutContext['getTwStyles']
): ChildSortMeta {
  if (!isReactElement(child) || typeof child.type !== 'string') {
    return { child, order: 0, zIndex: 0, originalIndex }
  }

  const childProps = child.props || {}
  let childStyle = childProps.style

  if (childProps.tw) {
    const twStyles = getTwStyles(childProps.tw, childStyle)
    childStyle = Object.assign(twStyles, childStyle)
  }

  return {
    child,
    order: parseStyleNumber(childStyle?.order, 0),
    zIndex: parseStyleNumber(childStyle?.zIndex, 0),
    originalIndex,
  }
}

function parseListImageURL(value: string | undefined): string | null {
  if (!value) return null
  const normalized = value.trim()
  if (!normalized || normalized.toLowerCase() === 'none') return null
  const match = normalized.match(/^url\((.*)\)$/i)
  if (!match) return null
  return match[1].trim().replace(/(^['"])|(['"]$)/g, '')
}

function buildListItemChildren(
  children: ReactNode,
  marker: { text: string | null; image: string | null; position: string },
  fontSize: number,
  markerTextWidth?: number
): { children: ReactNode[]; requiresRelativePosition: boolean } {
  const markerGap = Math.max(4, Math.round(fontSize * 0.25))
  const markerBoxWidth =
    marker.position === 'inside'
      ? undefined
      : marker.image !== null
      ? Math.max(12, Math.round(fontSize * 1.25))
      : Math.max(
          12,
          Math.ceil(markerTextWidth || 0) +
            Math.max(2, Math.round(fontSize * 0.15))
        )
  const markerSize = Math.max(8, Math.round(fontSize * 0.75))

  const isOutsideMarker = marker.position !== 'inside'
  const markerWrapper: Record<string, string | number> = isOutsideMarker
    ? {
        display: 'flex',
        position: 'absolute',
        left: -((markerBoxWidth || markerSize) + markerGap),
        top: 0,
        width: markerBoxWidth || markerSize,
        justifyContent: 'flex-end',
        alignItems: 'flex-start',
        flexShrink: 0,
      }
    : {
        display: 'flex',
        flexShrink: 0,
        marginRight: markerGap,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
      }

  const markerNode =
    marker.image !== null
      ? createElement(
          'div',
          { key: '__satori-list-marker', style: markerWrapper },
          createElement('img', {
            src: marker.image,
            width: markerSize,
            height: markerSize,
            style: {
              display: 'flex',
              objectFit: 'contain',
              marginTop: Math.max(0, Math.round(fontSize * 0.1)),
            },
          })
        )
      : createElement(
          'div',
          { key: '__satori-list-marker', style: markerWrapper },
          marker.text
        )

  const contentNode = createElement(
    'div',
    {
      key: '__satori-list-content',
      style: {
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        minWidth: 0,
      },
    },
    children
  )

  return {
    children: [markerNode, contentNode],
    requiresRelativePosition: isOutsideMarker,
  }
}

function measureListMarkerTextWidth(
  markerText: string | null,
  fontSize: number,
  style: SerializedStyle,
  font: FontLoader,
  locale: Locale | undefined
): number | undefined {
  if (!markerText) return undefined

  try {
    const engine = font.getEngine(
      fontSize,
      (style.lineHeight as number | string | undefined) || 'normal',
      {
        fontFamily: style.fontFamily as string | string[] | undefined,
        fontWeight: style.fontWeight as any,
        fontStyle: style.fontStyle as any,
      },
      locale
    )
    return engine.measure(markerText, {
      fontSize,
      letterSpacing: parseStyleNumber(style.letterSpacing, 0),
      kerning: style.fontKerning !== 'none',
    })
  } catch {
    return undefined
  }
}

export default async function* layout(
  element: ReactNode,
  context: LayoutContext
): AsyncGenerator<
  { word: string; locale?: string }[],
  string,
  [number, number, BlendPrimitive[]?]
> {
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
    yield
    yield
    return ''
  }

  // Not a regular element.
  if (!isReactElement(element) || isReactComponent(element.type)) {
    let iter: ReturnType<typeof layout>

    if (!isReactElement(element)) {
      // Process as text node.
      iter = buildTextNodes(String(element), context)
      yield (await iter.next()).value as { word: string; locale?: Locale }[]
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
      yield (await iter.next()).value as { word: string; locale?: string }[]
    }

    await iter.next()
    const offset = yield
    return (await iter.next(offset)).value as string
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

  const node = Yoga.Node.create()
  parent.insertChild(node, parent.getChildCount())

  const [computedStyle, newInheritableStyle] = await computeStyle(
    node,
    type,
    inheritedStyle,
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
    computedStyle.transform === inheritedStyle.transform

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

    if (computedStyle.backgroundImage) {
      newInheritableStyle._inheritedBackgroundClipTextHasBackground = 'true'
      computedStyle._inheritedBackgroundClipTextHasBackground = 'true'
    }
  }

  if (type === 'li' && listItemContext) {
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
    if (listItemContext.listType === 'ol' && listItemContext.orderedCounter) {
      applyListItemCounterStyles(
        listItemContext.orderedCounter,
        computedStyle,
        1
      )
      markerIndex = listItemContext.orderedCounter.value
    }
    const markerText = getListMarkerText(listStyleType, markerIndex)

    if (listStyleImage || markerText) {
      const markerFontSize = parseStyleNumber(
        computedStyle.fontSize,
        parseStyleNumber(inheritedStyle.fontSize, 16)
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
  if (isListContainer && type === 'ol') {
    orderedListCounter = { value: 0 }
    applyListItemCounterStyles(orderedListCounter, computedStyle, 0)
  }
  let listItemIndex = 0
  const segmentsMissingFont: { word: string; locale?: string }[] = []
  for (let orderIndex = 0; orderIndex < sortedChildren.length; orderIndex++) {
    const { child, zIndex } = sortedChildren[orderIndex]
    let childListItemContext: ListItemContext | undefined
    if (
      isListContainer &&
      isReactElement(child) &&
      typeof child.type === 'string' &&
      child.type === 'li'
    ) {
      childListItemContext = {
        listType: type as 'ul' | 'ol',
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
    if (canLoadAdditionalAssets) {
      segmentsMissingFont.push(...(((await iter.next()).value as any) || []))
    } else {
      await iter.next()
    }
    iterators.push({ iter, orderIndex, zIndex, renderMeta })
  }
  yield segmentsMissingFont
  for (const { iter } of iterators) await iter.next()

  // 3. Post-process the node.
  const [x, y, siblingBlendBackdrops = []] = yield
  let { left, top, width, height } = node.getComputedLayout()
  // Attach offset to the current node.
  left += x
  top += y

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
  const parentBackgroundColor = inheritedStyle._parentBackgroundColor
  const parentLayout = parent.getComputedLayout()
  const parentTransform = inheritedStyle.transform as TransformInput | undefined

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
  for (const { iter, renderMeta } of paintIterators) {
    childrenRenderResult += (
      await iter.next([left, top, paintedBlendPrimitives])
    ).value
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
