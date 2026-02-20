import { buildXMLString, lengthToNumber } from '../utils.js'
import type { GlyphBox } from '../font.js'

function buildSkipInkSegments(
  start: number,
  end: number,
  glyphBoxes: GlyphBox[],
  y: number,
  strokeWidth: number,
  baseline: number
) {
  const halfStroke = strokeWidth / 2
  const bleed = Math.max(halfStroke, strokeWidth * 1.25)
  const skipRanges: [number, number][] = []

  for (const box of glyphBoxes) {
    // Only skip glyphs that actually cross the underline position and extend below the baseline.
    if (box.y2 < baseline + halfStroke || box.y1 > y + halfStroke) continue

    const from = Math.max(start, box.x1 - bleed)
    const to = Math.min(end, box.x2 + bleed)

    if (from >= to) continue
    if (skipRanges.length === 0) {
      skipRanges.push([from, to])
      continue
    }

    const last = skipRanges[skipRanges.length - 1]
    if (from <= last[1]) {
      last[1] = Math.max(last[1], to)
    } else {
      skipRanges.push([from, to])
    }
  }

  if (!skipRanges.length) {
    return [[start, end]] as [number, number][]
  }

  const segments: [number, number][] = []
  let cursor = start

  for (const [from, to] of skipRanges) {
    if (from > cursor) {
      segments.push([cursor, from])
    }
    cursor = Math.max(cursor, to)
    if (cursor >= end) break
  }

  if (cursor < end) {
    segments.push([cursor, end])
  }

  return segments
}

function resolveLengthOrPercentage(
  value: unknown,
  fontSize: number,
  style: Record<string, any>
): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return

  const normalized = value.trim()
  if (!normalized || normalized === 'auto' || normalized === 'from-font') {
    return
  }

  const resolved = lengthToNumber(
    normalized,
    fontSize,
    fontSize,
    style as Record<string, string | number | object>,
    true
  )
  return typeof resolved === 'number' && Number.isFinite(resolved)
    ? resolved
    : undefined
}

export default function buildDecoration(
  {
    width,
    left,
    top,
    ascender,
    clipPathId,
    matrix,
    glyphBoxes,
  }: {
    width: number
    left: number
    top: number
    ascender: number
    clipPathId?: string
    matrix?: string
    glyphBoxes?: GlyphBox[]
  },
  style: Record<string, any>
) {
  const {
    textDecorationColor,
    textDecorationStyle,
    textDecorationLine,
    textDecorationSkipInk,
    fontSize,
    color,
  } = style
  if (!textDecorationLine || textDecorationLine === 'none') return ''

  const textDecorationThickness = style.textDecorationThickness
  const textDecorationThicknessFromFont =
    typeof style._textDecorationThicknessFromFont === 'number'
      ? style._textDecorationThicknessFromFont
      : undefined
  const textUnderlineOffset = style.textUnderlineOffset
  const textUnderlinePosition = String(
    style.textUnderlinePosition || 'auto'
  ).toLowerCase()
  const textUnderlinePositionFromFont =
    typeof style._textUnderlineOffsetFromFont === 'number'
      ? style._textUnderlineOffsetFromFont
      : undefined

  // The UA should use such font-based information when choosing auto line thicknesses wherever appropriate.
  // https://drafts.csswg.org/css-text-decor-4/#text-decoration-thickness
  let height = Math.max(1, fontSize * 0.1)
  if (
    typeof textDecorationThickness === 'number' &&
    textDecorationThickness > 0
  ) {
    height = textDecorationThickness
  } else if (typeof textDecorationThickness === 'string') {
    const normalized = textDecorationThickness.trim().toLowerCase()
    if (
      normalized === 'from-font' &&
      typeof textDecorationThicknessFromFont === 'number' &&
      textDecorationThicknessFromFont > 0
    ) {
      height = textDecorationThicknessFromFont
    } else {
      const resolved = resolveLengthOrPercentage(normalized, fontSize, style)
      if (typeof resolved === 'number' && resolved > 0) {
        height = resolved
      }
    }
  }

  const resolvedUnderlineOffset = resolveLengthOrPercentage(
    textUnderlineOffset,
    fontSize,
    style
  )
  const underlineOffset =
    typeof resolvedUnderlineOffset === 'number' ? resolvedUnderlineOffset : 0

  // Support multiple decoration lines (e.g. "underline overline")
  const lines = textDecorationLine.split(/\s+/)

  let result = ''
  for (const line of lines) {
    if (line === 'none') continue
    result += buildDecorationLine(line, {
      top,
      left,
      width,
      ascender,
      height,
      underlineOffset,
      underlinePosition: textUnderlinePosition,
      underlinePositionFromFont: textUnderlinePositionFromFont,
      clipPathId,
      matrix,
      glyphBoxes,
      textDecorationColor: textDecorationColor || color,
      textDecorationStyle,
      textDecorationSkipInk,
    })
  }
  return result
}

function buildDecorationLine(
  line: string,
  {
    top,
    left,
    width,
    ascender,
    height,
    underlineOffset,
    underlinePosition,
    underlinePositionFromFont,
    clipPathId,
    matrix,
    glyphBoxes,
    textDecorationColor,
    textDecorationStyle,
    textDecorationSkipInk,
  }: {
    top: number
    left: number
    width: number
    ascender: number
    height: number
    underlineOffset: number
    underlinePosition: string
    underlinePositionFromFont?: number
    clipPathId?: string
    matrix?: string
    glyphBoxes?: GlyphBox[]
    textDecorationColor: string
    textDecorationStyle: string
    textDecorationSkipInk: string
  }
): string {
  const underlinePositionTokens = underlinePosition.split(/\s+/)
  const hasUnderPosition = underlinePositionTokens.includes('under')
  const hasFromFontPosition = underlinePositionTokens.includes('from-font')
  const underlinePositionOffset = hasUnderPosition ? Math.max(height, 1) : 0
  const baseline = top + ascender
  const autoUnderlineY = top + ascender * 1.1
  const fromFontUnderlineY =
    hasFromFontPosition && typeof underlinePositionFromFont === 'number'
      ? baseline + underlinePositionFromFont
      : autoUnderlineY

  const y =
    line === 'line-through'
      ? top + ascender * 0.7
      : line === 'underline'
      ? fromFontUnderlineY + underlineOffset + underlinePositionOffset
      : line === 'overline'
      ? top + ascender * 0.1
      : top

  const dasharray =
    textDecorationStyle === 'dashed'
      ? `${height * 1.2} ${height * 2}`
      : textDecorationStyle === 'dotted'
      ? `0 ${height * 2}`
      : undefined

  const applySkipInk =
    line === 'underline' &&
    (textDecorationSkipInk || 'auto') !== 'none' &&
    glyphBoxes?.length

  const segments = applySkipInk
    ? buildSkipInkSegments(left, left + width, glyphBoxes, y, height, baseline)
    : ([[left, left + width]] as [number, number][])

  // https://www.w3.org/TR/css-backgrounds-3/#valdef-line-style-double
  const extraLine =
    textDecorationStyle === 'double'
      ? segments
          .map(([x1, x2]) =>
            buildXMLString('line', {
              x1,
              y1: y + height + 1,
              x2,
              y2: y + height + 1,
              stroke: textDecorationColor,
              'stroke-width': height,
              'stroke-linecap': 'square',
              transform: matrix,
            })
          )
          .join('')
      : ''

  // Wavy decoration: alternating quadratic Bézier arcs (half-wave steps).
  // Each half-wave is a single Q command so short segments scale gracefully.
  if (textDecorationStyle === 'wavy') {
    const amplitude = height * 1.5
    const halfWave = height * 2
    return (
      (clipPathId ? `<g clip-path="url(#${clipPathId})">` : '') +
      segments
        .map(([x1, x2]) => {
          let d = `M ${x1} ${y}`
          let up = true
          for (let x = x1; x < x2; x += halfWave) {
            const nextX = Math.min(x + halfWave, x2)
            const cpX = (x + nextX) / 2
            const cpY = up ? y - amplitude : y + amplitude
            d += ` Q ${cpX} ${cpY} ${nextX} ${y}`
            up = !up
          }
          return buildXMLString('path', {
            d,
            fill: 'none',
            stroke: textDecorationColor,
            'stroke-width': height,
            transform: matrix,
          })
        })
        .join('') +
      (clipPathId ? '</g>' : '')
    )
  }

  return (
    (clipPathId ? `<g clip-path="url(#${clipPathId})">` : '') +
    segments
      .map(([x1, x2]) =>
        buildXMLString('line', {
          x1,
          y1: y,
          x2,
          y2: y,
          stroke: textDecorationColor,
          'stroke-width': height,
          'stroke-dasharray': dasharray,
          'stroke-linecap':
            textDecorationStyle === 'dotted' ? 'round' : 'square',
          transform: matrix,
        })
      )
      .join('') +
    extraLine +
    (clipPathId ? '</g>' : '')
  )
}
