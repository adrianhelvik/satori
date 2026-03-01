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
import { resolveBlendPrimitive } from './builder/blend.js'
import { Locale, normalizeLocale } from './language.js'
import type { SerializedStyle } from './handler/style-types.js'
import { resolveElementStyle } from './element-style.js'
import { isOrderedListMarkerType } from './handler/list-style.js'
import {
  applyListItemCounterStyles,
  type OrderedListCounterState,
} from './list-markers.js'
import {
  resolveListMarker,
  type ListItemContext,
} from './builder/list-marker.js'
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
import { parseFiniteNumber } from './style-number.js'
import { convertTableElement } from './table-layout.js'
import { convertGridElement } from './grid-layout.js'
import {
  createsFixedContainingBlock,
  isolateFixedInheritance,
  isFixedPositionStyle,
  resolveFixedPosition,
} from './fixed-position.js'
import {
  type RenderContext,
  deriveChildRenderContext,
  BackgroundClipTextPathCollector,
} from './render-context.js'

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
  renderContext: RenderContext
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

function isInlineLikeDisplay(value: unknown): boolean {
  const normalized = normalizeDisplayValue(value)
  return (
    normalized === 'inline' ||
    normalized === 'inline-block' ||
    normalized === 'inline-flex' ||
    normalized === 'inline-grid' ||
    normalized === 'inline-table'
  )
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

function isListItemElement(
  child: ReactNode,
  getTwStyles: LayoutContext['getTwStyles']
) {
  if (!isReactElement(child) || typeof child.type !== 'string') return false

  if (child.type === 'li') return true

  const childStyle = resolveElementStyle(child, getTwStyles)
  return normalizeDisplayValue(childStyle?.display) === 'list-item'
}

async function* delegateLayoutPipeline(
  iter: AsyncGenerator<LayoutPhase, string, LayoutRenderInput>,
  contextLabel: string
): AsyncGenerator<LayoutPhase, string, LayoutRenderInput> {
  const missingFontsResult = await iter.next()
  const missingFonts = expectMissingFontsPhase(missingFontsResult, contextLabel)
  yield createMissingFontsPhase(missingFonts)

  const readyResult = await iter.next()
  expectReadyForRenderPhase(readyResult, contextLabel)

  const renderInput = yield READY_FOR_RENDER_PHASE
  const renderResult = await iter.next(renderInput)
  if (!renderResult.done) {
    throw new Error(
      `Layout pipeline did not complete during render phase (${contextLabel}).`
    )
  }
  return renderResult.value
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
    let iter: AsyncGenerator<LayoutPhase, string, LayoutRenderInput>
    let label = `custom component ${id}`

    if (!isReactElement(element)) {
      // Process as text node.
      iter = buildTextNodes(String(element), context)
      label = `text node ${id}`
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
    }

    return yield* delegateLayoutPipeline(iter, label)
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
    return yield* delegateLayoutPipeline(
      layout(convertedTableElement, context),
      `table rewrite ${id}`
    )
  }

  const convertedGridElement = convertGridElement(
    element,
    style as Record<string, unknown> | undefined,
    children,
    getTwStyles
  )
  if (convertedGridElement) {
    return yield* delegateLayoutPipeline(
      layout(convertedGridElement, context),
      `grid rewrite ${id}`
    )
  }

  const styleObject =
    style && typeof style === 'object'
      ? (style as Record<string, unknown>)
      : undefined
  const hasExplicitFlexDirection = Boolean(
    styleObject &&
      Object.prototype.hasOwnProperty.call(styleObject, 'flexDirection')
  )
  const isFixedElement = isFixedPositionStyle(styleObject)
  const hasAncestorFixedContainingBlock =
    isFixedElement && createsFixedContainingBlock(inheritedStyle)
  const effectiveInheritedStyle =
    isFixedElement && !hasAncestorFixedContainingBlock
      ? isolateFixedInheritance(inheritedStyle)
      : inheritedStyle

  // Fixed elements escape ancestor clip/mask unless a containing block exists.
  const effectiveRenderContext =
    isFixedElement && !hasAncestorFixedContainingBlock
      ? deriveChildRenderContext(context.renderContext, {
          clipPathId: undefined,
          overflowMaskId: undefined,
          backgroundClipTextPath: undefined,
        })
      : context.renderContext

  const node = Yoga.Node.create()
  parent.insertChild(node, parent.getChildCount())

  const viewport = {
    width: effectiveRenderContext.viewportWidth,
    height: effectiveRenderContext.viewportHeight,
  }
  const {
    style: computedStyle,
    inheritedStyle: newInheritableStyle,
    imageMetadata,
  } = await computeStyle(
    node,
    type,
    effectiveInheritedStyle,
    style,
    props,
    viewport
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

  // Build render context overrides for child elements.
  const childRenderContextOverrides: Partial<RenderContext> = {}

  // If the element has clipping overflow or clip-path set, children need
  // the clip path and mask IDs.
  if (
    isClippedOverflow(computedStyle.overflow) ||
    isClippedOverflow(computedStyle.overflowX) ||
    isClippedOverflow(computedStyle.overflowY) ||
    (computedStyle.clipPath && computedStyle.clipPath !== 'none')
  ) {
    childRenderContextOverrides.clipPathId = `satori_cp-${id}`
    childRenderContextOverrides.overflowMaskId = `satori_om-${id}`
  }

  if (computedStyle.maskImage) {
    childRenderContextOverrides.overflowMaskId = `satori_mi-${id}`
  }

  if (typeof computedStyle.backgroundColor === 'string') {
    childRenderContextOverrides.parentBackgroundColor =
      computedStyle.backgroundColor
  }

  // If the element has `background-clip: text` set, create a collector
  // for children to append their text paths into.
  let ownBackgroundClipCollector: BackgroundClipTextPathCollector | undefined
  if (computedStyle.backgroundClip === 'text') {
    ownBackgroundClipCollector = new BackgroundClipTextPathCollector()
    childRenderContextOverrides.backgroundClipTextPath =
      ownBackgroundClipCollector
  }

  const shouldApplyListMarker =
    !!listItemContext &&
    (type === 'li' ||
      normalizeDisplayValue(computedStyle.display) === 'list-item')

  if (shouldApplyListMarker && listItemContext) {
    const markerResult = resolveListMarker(
      listItemContext,
      computedStyle,
      effectiveInheritedStyle,
      children,
      font,
      newLocale
    )
    if (markerResult) {
      children = markerResult.children
      if (
        markerResult.requiresRelativePosition &&
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

    // Build child render context with any overrides from this element.
    const childRenderContext = deriveChildRenderContext(
      effectiveRenderContext,
      childRenderContextOverrides
    )

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
      renderContext: childRenderContext,
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
  const isParentBlockLike = !isInlineLikeDisplay(computedStyle.display)
  if (
    !hasExplicitFlexDirection &&
    isParentBlockLike &&
    normalizeDisplayValue(computedStyle.display) !== 'flex'
  ) {
    const blockChildren = iterators
      .map(({ renderMeta }) => renderMeta)
      .filter(
        (renderMeta): renderMeta is ChildRenderMeta =>
          typeof renderMeta.style?.display === 'string' &&
          !isInlineLikeDisplay(renderMeta.style.display)
      )

    if (blockChildren.length === iterators.length && blockChildren.length > 0) {
      node.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)

      const firstChild = blockChildren[0]
      const firstChildStyle = firstChild.style as SerializedStyle
      const firstChildTopMargin = parseFiniteNumber(
        firstChildStyle?.marginTop,
        0
      )
      const parentVerticalPadding =
        parseFiniteNumber(computedStyle.paddingTop, 0) +
        parseFiniteNumber(computedStyle.paddingBottom, 0)
      const parentVerticalBorders =
        parseFiniteNumber(computedStyle.borderTopWidth, 0) +
        parseFiniteNumber(computedStyle.borderBottomWidth, 0)
      const parentOwnTopMargin = parseFiniteNumber(computedStyle.marginTop, 0)

      if (
        firstChildTopMargin > 0 &&
        parentVerticalPadding === 0 &&
        parentVerticalBorders === 0 &&
        parentOwnTopMargin === 0
      ) {
        node.setMargin(Yoga.EDGE_TOP, firstChildTopMargin)
        firstChild.node?.setMargin(Yoga.EDGE_TOP, 0)
        computedStyle.marginTop = firstChildTopMargin
        if (firstChildStyle) firstChildStyle.marginTop = 0
      }

      for (
        let childIndex = 1;
        childIndex < blockChildren.length;
        childIndex++
      ) {
        const prev = blockChildren[childIndex - 1]
        const current = blockChildren[childIndex]
        const prevMarginBottom = parseFiniteNumber(prev.style?.marginBottom, 0)
        const currentMarginTop = parseFiniteNumber(current.style?.marginTop, 0)
        const collapsedMargin = Math.max(prevMarginBottom, currentMarginTop)

        if (prev.node) {
          prev.node.setMargin(Yoga.EDGE_BOTTOM, 0)
          if (prev.style) prev.style.marginBottom = 0
        }
        if (current.node) {
          current.node.setMargin(Yoga.EDGE_TOP, collapsedMargin)
        }
        if (current.style) {
          current.style.marginTop = collapsedMargin
        }
      }
    }
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
  const parentLayout = parent.getComputedLayout()
  let { left, top, width, height } = node.getComputedLayout()
  if (computedStyle.position === 'fixed') {
    const fixedViewport = hasAncestorFixedContainingBlock
      ? { width: parentLayout.width, height: parentLayout.height }
      : {
          width: effectiveRenderContext.viewportWidth,
          height: effectiveRenderContext.viewportHeight,
        }
    const fixedPosition = resolveFixedPosition(
      { left, top, width, height },
      computedStyle,
      effectiveInheritedStyle,
      fixedViewport
    )
    left = hasAncestorFixedContainingBlock
      ? fixedPosition.left + x
      : fixedPosition.left
    top = hasAncestorFixedContainingBlock
      ? fixedPosition.top + y
      : fixedPosition.top
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
  const parentBackgroundColor = effectiveRenderContext.parentBackgroundColor
  const parentTransform: TransformInput | undefined = isTransformInput(
    effectiveInheritedStyle.transform
  )
    ? effectiveInheritedStyle.transform
    : undefined

  if (type === 'img') {
    if (!imageMetadata) {
      throw new Error('Image source is missing after image resolution.')
    }
    baseRenderResult = await rect(
      {
        id,
        left,
        top,
        width,
        height,
        src: imageMetadata.src,
        srcWidth: imageMetadata.width,
        srcHeight: imageMetadata.height,
        viewportWidth: effectiveRenderContext.viewportWidth,
        viewportHeight: effectiveRenderContext.viewportHeight,
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
      parentBackgroundColor,
      effectiveRenderContext.clipPathId,
      effectiveRenderContext.overflowMaskId
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
        viewportWidth: effectiveRenderContext.viewportWidth,
        viewportHeight: effectiveRenderContext.viewportHeight,
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
      parentBackgroundColor,
      effectiveRenderContext.clipPathId,
      effectiveRenderContext.overflowMaskId
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
        viewportWidth: effectiveRenderContext.viewportWidth,
        viewportHeight: effectiveRenderContext.viewportHeight,
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
      parentBackgroundColor,
      effectiveRenderContext.clipPathId,
      effectiveRenderContext.overflowMaskId
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
  if (ownBackgroundClipCollector && ownBackgroundClipCollector.hasContent) {
    depsRenderResult += buildXMLString(
      'clipPath',
      {
        id: `satori_bct-${id}`,
        'clip-path': effectiveRenderContext.clipPathId
          ? `url(#${effectiveRenderContext.clipPathId})`
          : undefined,
      },
      ownBackgroundClipCollector.build()
    )
  }

  return depsRenderResult + baseRenderResult + childrenRenderResult
}
