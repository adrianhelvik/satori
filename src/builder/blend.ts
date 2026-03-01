import type { SerializedStyle } from '../handler/style-types.js'
import type { YogaNode } from '../yoga.js'
import type { BlendPrimitive } from './rect.js'
import cssColorParse from 'parse-css-color'

interface BlendMeta {
  node?: YogaNode
  type?: string
  style?: SerializedStyle
}

export function resolveBlendPrimitive(
  meta: BlendMeta | undefined,
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
