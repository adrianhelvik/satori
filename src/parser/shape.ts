import { lengthToNumber } from '../utils.js'
import { default as buildBorderRadius } from '../builder/border-radius.js'
import { getStylesForProperty } from 'css-to-react-native'

const regexMap = {
  circle: /circle\((.+)\)/,
  ellipse: /ellipse\((.+)\)/,
  path: /path\((.+)\)/,
  polygon: /polygon\((.+)\)/,
  inset: /inset\((.+)\)/,
  xywh: /xywh\((.+)\)/,
}

type ParsedShape = { type: string; [key: string]: string | number | undefined }

const HORIZONTAL_KEYWORDS = new Set(['left', 'right'])
const VERTICAL_KEYWORDS = new Set(['top', 'bottom'])

export function createShapeParser(
  {
    width,
    height,
  }: {
    width: number
    height: number
  },
  style: Record<string, string | number>,
  inheritedStyle: Record<string, string | number>
) {
  const fontSize = inheritedStyle.fontSize as number
  const diagonal = Math.hypot(width, height) / Math.sqrt(2)

  function resolveLength(
    value: string | number,
    relativeTo: number
  ): number | undefined {
    return lengthToNumber(value, fontSize, relativeTo, inheritedStyle, true)
  }

  function resolveLengthOrZero(value: string | number, relativeTo: number) {
    return resolveLength(value, relativeTo) ?? 0
  }

  function resolveDirectionalValues(
    parsed: Record<string, string | number>
  ): [number, number, number, number] {
    const values = Object.values(parsed).map((token, index) =>
      resolveLengthOrZero(
        String(token),
        index === 0 || index === 2 ? height : width
      )
    )
    return [values[0] ?? 0, values[1] ?? 0, values[2] ?? 0, values[3] ?? 0]
  }

  function splitRoundValues(value: string): [string, string] {
    const match = value.match(/\bround\b/i)
    if (!match || typeof match.index !== 'number') {
      return [value.trim(), '0']
    }

    const before = value.slice(0, match.index).trim()
    const after = value.slice(match.index + match[0].length).trim()
    return [before, after || '0']
  }

  function parseCircle(str: string) {
    const res = str.match(regexMap['circle'])

    if (!res) return null

    const [, value] = res
    const [radius, pos = ''] = value.split('at').map((v) => v.trim())
    const { x, y } = resolvePosition(pos, width, height)

    return {
      type: 'circle',
      r: resolveLength(radius, diagonal),
      cx: resolveLength(x, width),
      cy: resolveLength(y, height),
    }
  }

  function parseEllipse(str: string) {
    const res = str.match(regexMap['ellipse'])

    if (!res) return null

    const [, value] = res
    const [radius, pos = ''] = value.split('at').map((v) => v.trim())
    const [rx, ry] = radius.split(' ')
    const { x, y } = resolvePosition(pos, width, height)

    return {
      type: 'ellipse',
      rx: resolveLength(rx || '50%', width),
      ry: resolveLength(ry || '50%', height),
      cx: resolveLength(x, width),
      cy: resolveLength(y, height),
    }
  }

  function parsePath(str: string) {
    const res = str.match(regexMap['path'])

    if (!res) return null

    const [fillRule, d] = resolveFillRule(res[1])

    return {
      type: 'path',
      d,
      'fill-rule': fillRule,
    }
  }

  function parsePolygon(str: string) {
    const res = str.match(regexMap['polygon'])

    if (!res) return null

    const [fillRule, points] = resolveFillRule(res[1])

    return {
      type: 'polygon',
      'fill-rule': fillRule,
      points: points
        .split(',')
        .map((point) =>
          point
            .trim()
            .split(/\s+/)
            .map((token, index) =>
              resolveLength(token, index === 0 ? width : height)
            )
            .join(' ')
        )
        .join(','),
    }
  }

  function parseInset(str: string) {
    const res = str.match(regexMap['inset'])

    if (!res) return null

    const [insetValue, radiusValue] = splitRoundValues(res[1])
    const radiusMap = getStylesForProperty('borderRadius', radiusValue, true)
    const r = resolveDirectionalValues(radiusMap)
    const offsets = resolveDirectionalValues(
      getStylesForProperty('margin', insetValue, true)
    )
    const x = offsets[3]
    const y = offsets[0]
    const w = width - (offsets[1] + offsets[3])
    const h = height - (offsets[0] + offsets[2])

    if (r.some((v) => v > 0)) {
      const d = buildBorderRadius(
        { left: x, top: y, width: w, height: h },
        { ...style, ...radiusMap }
      )

      return { type: 'path', d }
    }

    return {
      type: 'rect',
      x,
      y,
      width: w,
      height: h,
    }
  }

  function parseXywh(str: string) {
    const res = str.match(regexMap['xywh'])
    if (!res) return null

    const value = res[1].trim()
    const [boxPart, roundPart = ''] = value.split(/\bround\b/i)
    const tokens = boxPart.trim().split(/\s+/).filter(Boolean)
    if (tokens.length !== 4) return null

    const x = resolveLengthOrZero(tokens[0], width)
    const y = resolveLengthOrZero(tokens[1], height)
    const w = resolveLengthOrZero(tokens[2], width)
    const h = resolveLengthOrZero(tokens[3], height)

    if (!roundPart.trim()) {
      return {
        type: 'rect',
        x,
        y,
        width: w,
        height: h,
      }
    }

    const radiusMap = getStylesForProperty('borderRadius', roundPart, true)
    const d = buildBorderRadius(
      { left: x, top: y, width: w, height: h },
      { ...style, ...radiusMap }
    )

    return { type: 'path', d }
  }

  return {
    parseCircle,
    parseEllipse,
    parsePath,
    parsePolygon,
    parseInset,
    parseXywh,
  }
}

function resolveFillRule(str: string) {
  const [, fillRule = 'nonzero', d] =
    str.replace(/('|")/g, '').match(/^(nonzero|evenodd)?,?(.+)/) || []

  return [fillRule, d]
}

function resolvePosition(position: string, xDelta: number, yDelta: number) {
  const pos = position.trim().split(/\s+/).filter(Boolean)
  const res: { x: number | string; y: number | string } = {
    x: pos[0] || '50%',
    y: pos[1] || '50%',
  }

  if (pos.length === 0) return res

  // `center` should be axis-aware. For example, `top center` and
  // `center top` both mean top-centered, not fully centered.
  let hasX = false
  let hasY = false

  // Single-token `center` maps to both axes.
  if (pos.length === 1 && pos[0] === 'center') {
    return { x: xDelta / 2, y: yDelta / 2 }
  }

  for (const v of pos) {
    if (v === 'top') {
      res.y = 0
      hasY = true
    } else if (v === 'bottom') {
      res.y = yDelta
      hasY = true
    } else if (v === 'left') {
      res.x = 0
      hasX = true
    } else if (v === 'right') {
      res.x = xDelta
      hasX = true
    } else if (v === 'center') {
      if (!hasX) {
        res.x = xDelta / 2
        hasX = true
      } else if (!hasY) {
        res.y = yDelta / 2
        hasY = true
      }
    } else {
      const axis = !hasX || (!hasY && VERTICAL_KEYWORDS.has(pos[0])) ? 'x' : 'y'
      if (axis === 'x' && !HORIZONTAL_KEYWORDS.has(v)) {
        res.x = v
        hasX = true
      } else if (axis === 'y' && !VERTICAL_KEYWORDS.has(v)) {
        res.y = v
        hasY = true
      }
    }
  }

  return res
}
