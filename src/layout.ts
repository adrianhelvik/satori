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
import computeStyle from './handler/compute.js'
import FontLoader from './font.js'
import buildTextNodes from './text/index.js'
import rect, { type BlendPrimitive } from './builder/rect.js'
import { Locale, normalizeLocale } from './language.js'
import { SerializedStyle } from './handler/expand.js'
import cssColorParse from 'parse-css-color'

interface ListItemContext {
  listType: 'ul' | 'ol'
  index: number
  styleType?: string
  stylePosition?: string
  styleImage?: string
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

function toAlphabeticIndex(index: number, upper: boolean): string {
  if (index <= 0) return '0'
  const chars = upper
    ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    : 'abcdefghijklmnopqrstuvwxyz'
  let result = ''
  let n = index
  while (n > 0) {
    n -= 1
    result = chars[n % 26] + result
    n = Math.floor(n / 26)
  }
  return result
}

function toRomanIndex(index: number, upper: boolean): string {
  if (index <= 0 || index >= 4000) return String(index)

  const numerals: [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ]

  let n = index
  let result = ''
  for (const [value, symbol] of numerals) {
    while (n >= value) {
      result += symbol
      n -= value
    }
  }

  return upper ? result : result.toLowerCase()
}

function getListMarkerText(
  type: string | undefined,
  index: number
): string | null {
  const markerType = (type || '').trim().toLowerCase()
  switch (markerType) {
    case 'none':
      return null
    case 'circle':
      return '◦'
    case 'square':
      return '▪'
    case 'decimal':
      return `${index}.`
    case 'decimal-leading-zero':
      return `${String(index).padStart(2, '0')}.`
    case 'upper-alpha':
    case 'upper-latin':
      return `${toAlphabeticIndex(index, true)}.`
    case 'lower-alpha':
    case 'lower-latin':
      return `${toAlphabeticIndex(index, false)}.`
    case 'upper-roman':
      return `${toRomanIndex(index, true)}.`
    case 'lower-roman':
      return `${toRomanIndex(index, false)}.`
    case 'disc':
    default:
      return '•'
  }
}

function buildListItemChildren(
  children: ReactNode,
  marker: { text: string | null; image: string | null; position: string },
  fontSize: number,
  markerTextWidth?: number
): ReactNode[] {
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

  const markerWrapper: Record<string, string | number> = {
    display: 'flex',
    flexShrink: 0,
    marginRight: markerGap,
    justifyContent: marker.position === 'inside' ? 'flex-start' : 'flex-end',
    alignItems: 'flex-start',
  }
  if (typeof markerBoxWidth !== 'undefined') {
    markerWrapper.width = markerBoxWidth
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

  return [markerNode, contentNode]
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
  if (!isInheritingTransform) {
    ;(computedStyle.transform as any).__parent = inheritedStyle.transform
  }

  // If the element has clipping overflow or clip-path set, we need to create a
  // clip path and use it in all its children.
  if (
    computedStyle.overflow === 'hidden' ||
    computedStyle.overflow === 'clip' ||
    computedStyle.overflowX === 'hidden' ||
    computedStyle.overflowX === 'clip' ||
    computedStyle.overflowY === 'hidden' ||
    computedStyle.overflowY === 'clip' ||
    (computedStyle.clipPath && computedStyle.clipPath !== 'none')
  ) {
    newInheritableStyle._inheritedClipPathId = `satori_cp-${id}`
    newInheritableStyle._inheritedMaskId = `satori_om-${id}`
  }

  if (computedStyle.maskImage) {
    newInheritableStyle._inheritedMaskId = `satori_mi-${id}`
  }

  if (computedStyle.backgroundColor) {
    newInheritableStyle._parentBackgroundColor = computedStyle.backgroundColor
  }

  // If the element has `background-clip: text` set, we need to create a clip
  // path and use it in all its children.
  if (computedStyle.backgroundClip === 'text') {
    const mutateRefValue = { value: '' } as any
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
    const markerText = getListMarkerText(listStyleType, listItemContext.index)

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
      children = buildListItemChildren(
        children,
        {
          text: markerText,
          image: listStyleImage,
          position: listStylePosition.trim().toLowerCase(),
        },
        markerFontSize,
        markerTextWidth
      )
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
  const parentBackgroundColor = inheritedStyle._parentBackgroundColor as
    | string
    | undefined

  if (type === 'img') {
    const src = computedStyle.__src as string
    baseRenderResult = await rect(
      {
        id,
        left,
        top,
        width,
        height,
        src,
        isInheritingTransform,
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
        debug,
      },
      computedStyle,
      newInheritableStyle,
      siblingBlendBackdrops,
      parentBackgroundColor
    )
  } else {
    const display = String(style?.display || computedStyle.display || '')
      .trim()
      .toLowerCase()
    if (
      type === 'div' &&
      children &&
      typeof children !== 'string' &&
      display !== 'flex' &&
      display !== 'block' &&
      display !== 'inline' &&
      display !== 'inline-block' &&
      display !== 'inline-flex' &&
      display !== 'list-item' &&
      display !== '-webkit-box' &&
      display !== 'none' &&
      display !== 'contents'
    ) {
      throw new Error(
        `Expected <div> to have explicit "display: flex", "display: contents", or "display: none" if it has more than one child node.`
      )
    }
    baseRenderResult = await rect(
      { id, left, top, width, height, isInheritingTransform, debug },
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
      (computedStyle._inheritedBackgroundClipTextPath as any).value
    )
  }

  return depsRenderResult + baseRenderResult + childrenRenderResult
}
