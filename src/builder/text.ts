import escapeHTML from 'escape-html'
import type { ParsedTransformOrigin } from '../transform-origin.js'
import type { SerializedStyle } from '../handler/expand.js'
import transform, {
  isTransformInput,
  type TransformInput,
} from './transform.js'
import { buildXMLString } from '../utils.js'

export function container(
  {
    left,
    top,
    width,
    height,
    isInheritingTransform,
    parentTransform,
    parentTransformSize,
  }: {
    left: number
    top: number
    width: number
    height: number
    isInheritingTransform: boolean
    parentTransform?: TransformInput
    parentTransformSize?: { width: number; height: number }
  },
  style: SerializedStyle
) {
  let matrix = ''
  let opacity = 1

  if (isTransformInput(style.transform)) {
    matrix = transform(
      {
        left,
        top,
        width,
        height,
      },
      style.transform,
      isInheritingTransform,
      style.transformOrigin as ParsedTransformOrigin | undefined,
      parentTransform,
      parentTransformSize
    )
  }

  if (style.opacity !== undefined) {
    opacity = +style.opacity
  }

  return { matrix, opacity }
}

export default function buildText(
  {
    id,
    content,
    filter,
    left,
    top,
    width,
    height,
    matrix,
    opacity,
    image,
    clipPathId,
    debug,
    shape,
    decorationShape,
  }: {
    content: string
    filter: string
    id: string
    left: number
    top: number
    width: number
    height: number
    matrix: string
    opacity: number
    image: string | null
    clipPathId?: string
    debug?: boolean
    shape?: boolean
    decorationShape?: string
  },
  style: SerializedStyle
) {
  const textStyle = style as Record<string, string | number | undefined>
  const serializedStyle = [
    textStyle.filter ? `filter:${textStyle.filter}` : '',
    textStyle.touchAction ? `touch-action:${textStyle.touchAction}` : '',
    textStyle.userSelect ? `user-select:${textStyle.userSelect}` : '',
  ]
    .filter(Boolean)
    .join(';')

  let extra = ''
  if (debug) {
    extra = buildXMLString('rect', {
      x: left,
      y: top - height,
      width,
      height,
      fill: 'transparent',
      stroke: '#575eff',
      'stroke-width': 1,
      transform: matrix || undefined,
      'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
    })
  }

  // This grapheme should be rendered as an image.
  if (image) {
    const shapeProps = {
      href: image,
      x: left,
      y: top,
      width,
      height,
      transform: matrix || undefined,
      'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
      style: serializedStyle || undefined,
      'pointer-events': textStyle.pointerEvents || undefined,
      cursor: textStyle.cursor || undefined,
    }
    return [
      (filter ? `${filter}<g filter="url(#satori_s-${id})">` : '') +
        buildXMLString('image', {
          ...shapeProps,
          opacity: opacity !== 1 ? opacity : undefined,
        }) +
        (decorationShape || '') +
        (filter ? '</g>' : '') +
        extra,
      // SVG doesn't support `<image>` as the shape.
      '',
    ]
  }

  // Do not embed the font, use <text> with the raw content instead.
  const shapeProps = {
    x: left,
    y: top,
    width,
    height,
    'font-weight': textStyle.fontWeight,
    'font-style': textStyle.fontStyle,
    'font-size': textStyle.fontSize,
    'font-family': textStyle.fontFamily,
    'font-kerning': textStyle.fontKerning || undefined,
    'letter-spacing': textStyle.letterSpacing || undefined,
    transform: matrix || undefined,
    'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
    style: serializedStyle || undefined,
    'pointer-events': textStyle.pointerEvents || undefined,
    cursor: textStyle.cursor || undefined,
    'stroke-width': textStyle.WebkitTextStrokeWidth
      ? `${textStyle.WebkitTextStrokeWidth}px`
      : undefined,
    stroke: textStyle.WebkitTextStrokeWidth
      ? textStyle.WebkitTextStrokeColor
      : undefined,
    'stroke-linejoin': textStyle.WebkitTextStrokeWidth ? 'round' : undefined,
    'paint-order': textStyle.WebkitTextStrokeWidth ? 'stroke' : undefined,
  }
  return [
    (filter ? `${filter}<g filter="url(#satori_s-${id})">` : '') +
      buildXMLString(
        'text',
        {
          ...shapeProps,
          fill: textStyle.color,
          opacity: opacity !== 1 ? opacity : undefined,
        },
        escapeHTML(content)
      ) +
      (decorationShape || '') +
      (filter ? '</g>' : '') +
      extra,
    shape ? buildXMLString('text', shapeProps, escapeHTML(content)) : '',
  ]
}
