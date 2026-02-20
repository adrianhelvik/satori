import { buildXMLString } from '../utils.js'
import radius from './border-radius.js'
import cssColorParse from 'parse-css-color'

type BorderSide = 'Top' | 'Right' | 'Bottom' | 'Left'

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function mixChannel(channel: number, target: number, ratio: number): number {
  return clampByte(channel + (target - channel) * ratio)
}

function shadeBorderColor(
  color: string,
  tone: 'light' | 'dark',
  ratio = tone === 'light' ? 0 : 0.5
): string {
  const parsed = cssColorParse(color)
  if (!parsed) return color

  const [r, g, b] = parsed.values
  const alpha = parsed.alpha ?? 1
  const target = tone === 'light' ? 255 : 0

  return `rgba(${mixChannel(r, target, ratio)},${mixChannel(
    g,
    target,
    ratio
  )},${mixChannel(b, target, ratio)},${alpha})`
}

function normalizeInsetOutsetBorders(
  style: Record<string, number | string>,
  asContentMask: boolean
): Record<string, number | string> {
  if (asContentMask) return style

  const normalized = { ...style }
  const sides: BorderSide[] = ['Top', 'Right', 'Bottom', 'Left']

  for (const side of sides) {
    const styleKey = `border${side}Style`
    const colorKey = `border${side}Color`
    const borderStyle = String(normalized[styleKey] || '')

    if (
      borderStyle !== 'inset' &&
      borderStyle !== 'outset' &&
      borderStyle !== 'groove' &&
      borderStyle !== 'ridge'
    ) {
      continue
    }

    normalized[styleKey] = 'solid'
    if (borderStyle === 'groove' || borderStyle === 'ridge') {
      continue
    }

    const topOrLeft = side === 'Top' || side === 'Left'
    const tone =
      borderStyle === 'inset'
        ? topOrLeft
          ? 'dark'
          : 'light'
        : topOrLeft
        ? 'light'
        : 'dark'

    const borderColor = normalized[colorKey]
    if (typeof borderColor === 'string') {
      normalized[colorKey] = shadeBorderColor(borderColor, tone)
    }
  }

  return normalized
}

function getBorderStrokeProps(
  w: number,
  borderStyle: string,
  asContentMask: boolean
): Record<string, string | undefined> {
  if (asContentMask) return {}

  if (borderStyle === 'dashed') {
    return { 'stroke-dasharray': w * 2 + ' ' + w }
  }
  if (borderStyle === 'dotted') {
    return {
      'stroke-dasharray': '0 ' + w * 2,
      'stroke-linecap': 'round',
    }
  }
  return {}
}

function buildBorderPath(
  w: number,
  currentStyle: any[],
  asContentMask: boolean | undefined,
  props: any,
  dims: { left: number; top: number; width: number; height: number },
  style: Record<string, number | string>,
  partialSides: boolean[]
): string {
  const borderStyleValue = currentStyle[1] as string
  const d = radius(dims, style as Record<string, number>, partialSides)

  if (!asContentMask && borderStyleValue === 'double' && w >= 3) {
    // Double border: two lines at 1/3 width each, separated by 1/3 gap.
    // Outer line: full width stroke clipped to outer 1/3
    // Inner line: full width stroke clipped to inner 1/3
    const outerW = Math.round(w / 3)
    const innerW = outerW
    // We approximate by using two strokes offset by adjusting stroke-width.
    // Outer stroke at full size, inner stroke at reduced size.
    return (
      buildXMLString('path', {
        ...dims,
        ...props,
        fill: 'none',
        stroke: currentStyle[2],
        'stroke-width': outerW * 2,
        d,
      }) +
      buildXMLString('path', {
        ...dims,
        ...props,
        fill: 'none',
        stroke: currentStyle[2],
        'stroke-width': innerW * 2,
        d: radius(
          {
            left: dims.left,
            top: dims.top,
            width: dims.width,
            height: dims.height,
          },
          // Inset by 2/3 of border width for the inner line.
          {
            ...style,
            borderTopWidth: Math.max(
              0,
              ((style.borderTopWidth as number) || 0) - outerW * 2
            ),
            borderRightWidth: Math.max(
              0,
              ((style.borderRightWidth as number) || 0) - outerW * 2
            ),
            borderBottomWidth: Math.max(
              0,
              ((style.borderBottomWidth as number) || 0) - outerW * 2
            ),
            borderLeftWidth: Math.max(
              0,
              ((style.borderLeftWidth as number) || 0) - outerW * 2
            ),
          } as Record<string, number>,
          partialSides
        ),
      })
    )
  }

  const strokeProps = getBorderStrokeProps(w, borderStyleValue, !!asContentMask)

  return buildXMLString('path', {
    ...dims,
    ...props,
    fill: 'none',
    stroke: asContentMask ? '#000' : currentStyle[2],
    'stroke-width': w * 2,
    ...strokeProps,
    d,
  })
}

function compareBorderDirections(a: string, b: string, style: any) {
  return (
    style[a + 'Width'] === style[b + 'Width'] &&
    style[a + 'Style'] === style[b + 'Style'] &&
    style[a + 'Color'] === style[b + 'Color']
  )
}

export function getBorderClipPath(
  {
    id,
    // Can be `overflow: hidden` from parent containers.
    currentClipPathId,
    borderPath,
    borderType,
    left,
    top,
    width,
    height,
  }: {
    id: string
    currentClipPathId?: string | number
    borderPath?: string
    borderType?: 'rect' | 'path'
    left: number
    top: number
    width: number
    height: number
  },
  style: Record<string, number | string>
) {
  const hasBorder =
    style.borderTopWidth ||
    style.borderRightWidth ||
    style.borderBottomWidth ||
    style.borderLeftWidth

  if (!hasBorder) return null

  // In SVG, stroke is always centered on the path and there is no
  // existing property to make it behave like CSS border. So here we
  // 2x the border width and introduce another clip path to clip the
  // overflowed part.
  const rectClipId = `satori_bc-${id}`
  const defs = buildXMLString(
    'clipPath',
    {
      id: rectClipId,
      'clip-path': currentClipPathId ? `url(#${currentClipPathId})` : undefined,
    },
    buildXMLString(borderType, {
      x: left,
      y: top,
      width,
      height,
      d: borderPath ? borderPath : undefined,
    })
  )

  return [defs, rectClipId]
}

export default function border(
  {
    left,
    top,
    width,
    height,
    props,
    asContentMask,
    maskBorderOnly,
  }: {
    left: number
    top: number
    width: number
    height: number
    props: any
    asContentMask?: boolean
    maskBorderOnly?: boolean
  },
  style: Record<string, number | string>
) {
  const normalizedStyle = normalizeInsetOutsetBorders(style, !!asContentMask)
  const directions = ['borderTop', 'borderRight', 'borderBottom', 'borderLeft']

  // No border
  if (
    !asContentMask &&
    !directions.some((direction) => normalizedStyle[direction + 'Width'])
  )
    return ''

  let fullBorder = ''

  let start = 0
  while (
    start > 0 &&
    compareBorderDirections(
      directions[start],
      directions[(start + 3) % 4],
      normalizedStyle
    )
  ) {
    start = (start + 3) % 4
  }

  let partialSides = [false, false, false, false]
  let currentStyle = []
  for (let _i = 0; _i < 4; _i++) {
    const i = (start + _i) % 4
    const ni = (start + _i + 1) % 4

    const d = directions[i]
    const nd = directions[ni]

    partialSides[i] = true
    currentStyle = [
      normalizedStyle[d + 'Width'],
      normalizedStyle[d + 'Style'],
      normalizedStyle[d + 'Color'],
      d,
    ]

    if (!compareBorderDirections(d, nd, normalizedStyle)) {
      const w =
        (currentStyle[0] || 0) +
        (asContentMask && !maskBorderOnly
          ? normalizedStyle[d.replace('border', 'padding')] || 0
          : 0)
      if (w) {
        fullBorder += buildBorderPath(
          w,
          currentStyle,
          asContentMask,
          props,
          { left, top, width, height },
          normalizedStyle,
          partialSides
        )
      }
      partialSides = [false, false, false, false]
    }
  }

  if (partialSides.some(Boolean)) {
    const w =
      (currentStyle[0] || 0) +
      (asContentMask && !maskBorderOnly
        ? normalizedStyle[currentStyle[3].replace('border', 'padding')] || 0
        : 0)
    if (w) {
      fullBorder += buildBorderPath(
        w,
        currentStyle,
        asContentMask,
        props,
        { left, top, width, height },
        normalizedStyle,
        partialSides
      )
    }
  }

  return fullBorder
}
