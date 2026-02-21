import { lengthToNumber } from '../utils.js'
import {
  parseSimpleCalcTerms,
  splitByWhitespaceOutsideParens,
} from '../css-value-parser.js'
import CssDimension from '../vendor/parse-css-dimension/index.js'

export interface ObjectPositionAxis {
  type: 'ratio' | 'length' | 'calc'
  value: number
  offset?: number
  fromEnd?: boolean
}

export interface ResolvedObjectPosition {
  x: ObjectPositionAxis
  y: ObjectPositionAxis
}

type ObjectPositionAxisName = 'x' | 'y'
type StyleValueMap = Record<string, number | string | object>

function parseObjectPositionLength(
  token: string,
  baseFontSize: number,
  inheritedStyle: StyleValueMap
): number | undefined {
  try {
    const parsed = new CssDimension(token)
    if (parsed.type === 'number') return parsed.value
    if (parsed.type !== 'length') return

    const resolved = lengthToNumber(
      `${parsed.value}${parsed.unit}`,
      baseFontSize,
      baseFontSize,
      inheritedStyle as Record<string, number | string>,
      false
    )
    if (typeof resolved === 'number') return resolved
    if (parsed.unit === 'px') return parsed.value
  } catch {
    return
  }
}

function parseObjectPositionCoordinate(
  token: string,
  baseFontSize: number,
  inheritedStyle: StyleValueMap
): ObjectPositionAxis | undefined {
  const raw = token.trim()

  let parsedDimension: CssDimension | undefined
  try {
    parsedDimension = new CssDimension(raw)
  } catch {
    // Continue handling non-CssDimension syntax like `calc(...)`.
  }
  if (parsedDimension?.type === 'percentage') {
    return {
      type: 'ratio',
      value: parsedDimension.value / 100,
    }
  }

  const terms = parseSimpleCalcTerms(raw)
  if (terms) {
    let ratio = 0
    let offset = 0

    for (const term of terms) {
      try {
        const parsedTerm = new CssDimension(term.value)
        if (parsedTerm.type === 'percentage') {
          ratio += (term.sign * parsedTerm.value) / 100
          continue
        }
      } catch {
        return
      }

      const lengthTerm = parseObjectPositionLength(
        term.value,
        baseFontSize,
        inheritedStyle
      )
      if (typeof lengthTerm !== 'number') return
      offset += term.sign * lengthTerm
    }

    return {
      type: 'calc',
      value: ratio,
      offset,
    }
  }

  const length = parseObjectPositionLength(raw, baseFontSize, inheritedStyle)
  if (typeof length === 'number') {
    return {
      type: 'length',
      value: length,
    }
  }
}

const horizontalObjectPositionKeywords = new Set(['left', 'center', 'right'])
const verticalObjectPositionKeywords = new Set(['top', 'center', 'bottom'])
const objectPositionKeywords = new Set([
  'left',
  'center',
  'right',
  'top',
  'bottom',
])

function buildObjectPositionAxisFromKeyword(
  axis: ObjectPositionAxisName,
  keyword: string,
  offset?: ObjectPositionAxis
): ObjectPositionAxis | undefined {
  if (axis === 'x') {
    if (!horizontalObjectPositionKeywords.has(keyword)) return
    if (keyword === 'center') {
      if (offset) return
      return { type: 'ratio', value: 0.5 }
    }

    if (!offset) {
      return { type: 'ratio', value: keyword === 'left' ? 0 : 1 }
    }

    if (offset.type === 'ratio') {
      return {
        type: 'ratio',
        value: offset.value,
        fromEnd: keyword === 'right',
      }
    }

    if (offset.type === 'calc') {
      return {
        type: 'calc',
        value: offset.value,
        offset: offset.offset,
        fromEnd: keyword === 'right',
      }
    }

    return {
      type: 'length',
      value: offset.value,
      fromEnd: keyword === 'right',
    }
  }

  if (!verticalObjectPositionKeywords.has(keyword)) return
  if (keyword === 'center') {
    if (offset) return
    return { type: 'ratio', value: 0.5 }
  }

  if (!offset) {
    return { type: 'ratio', value: keyword === 'top' ? 0 : 1 }
  }

  if (offset.type === 'ratio') {
    return {
      type: 'ratio',
      value: offset.value,
      fromEnd: keyword === 'bottom',
    }
  }

  if (offset.type === 'calc') {
    return {
      type: 'calc',
      value: offset.value,
      offset: offset.offset,
      fromEnd: keyword === 'bottom',
    }
  }

  return {
    type: 'length',
    value: offset.value,
    fromEnd: keyword === 'bottom',
  }
}

export function parseObjectPosition(
  position: unknown,
  baseFontSize: number,
  inheritedStyle: StyleValueMap
): ResolvedObjectPosition {
  const defaults: ResolvedObjectPosition = {
    x: { type: 'ratio', value: 0.5 },
    y: { type: 'ratio', value: 0.5 },
  }

  const raw = String(position || '')
    .trim()
    .toLowerCase()
  if (!raw) return defaults
  const parts = splitByWhitespaceOutsideParens(raw)
  if (!parts.length) return defaults

  let x: ObjectPositionAxis | undefined
  let y: ObjectPositionAxis | undefined

  let i = 0
  while (i < parts.length) {
    const token = parts[i]
    const next = parts[i + 1]

    if (horizontalObjectPositionKeywords.has(token) && token !== 'center') {
      if (x) return defaults
      const offset =
        next && !objectPositionKeywords.has(next)
          ? parseObjectPositionCoordinate(next, baseFontSize, inheritedStyle)
          : undefined
      if (next && !objectPositionKeywords.has(next) && !offset) {
        return defaults
      }
      const axis = buildObjectPositionAxisFromKeyword('x', token, offset)
      if (!axis) return defaults
      x = axis
      i += offset ? 2 : 1
      continue
    }

    if (verticalObjectPositionKeywords.has(token) && token !== 'center') {
      if (y) return defaults
      const offset =
        next && !objectPositionKeywords.has(next)
          ? parseObjectPositionCoordinate(next, baseFontSize, inheritedStyle)
          : undefined
      if (next && !objectPositionKeywords.has(next) && !offset) {
        return defaults
      }
      const axis = buildObjectPositionAxisFromKeyword('y', token, offset)
      if (!axis) return defaults
      y = axis
      i += offset ? 2 : 1
      continue
    }

    if (token === 'center') {
      if (!x) {
        x = { type: 'ratio', value: 0.5 }
      } else if (!y) {
        y = { type: 'ratio', value: 0.5 }
      } else {
        return defaults
      }
      i += 1
      continue
    }

    const coordinate = parseObjectPositionCoordinate(
      token,
      baseFontSize,
      inheritedStyle
    )
    if (!coordinate) return defaults

    if (!x) {
      x = coordinate
    } else if (!y) {
      y = coordinate
    } else {
      return defaults
    }

    i += 1
  }

  return {
    x: x || defaults.x,
    y: y || defaults.y,
  }
}

export function resolveObjectPositionOffset(
  coordinate: ObjectPositionAxis,
  containerSize: number,
  objectSize: number
): number {
  const freeSpace = containerSize - objectSize
  if (coordinate.type === 'ratio') {
    const ratio = coordinate.fromEnd ? 1 - coordinate.value : coordinate.value
    return freeSpace * ratio
  }
  if (coordinate.type === 'calc') {
    const startOffset = freeSpace * coordinate.value + (coordinate.offset || 0)
    return coordinate.fromEnd ? freeSpace - startOffset : startOffset
  }
  return coordinate.fromEnd ? freeSpace - coordinate.value : coordinate.value
}

export function resolveObjectFitImageSize(
  fit: string,
  containerWidth: number,
  containerHeight: number,
  intrinsicWidth: number,
  intrinsicHeight: number
) {
  const safeContainerWidth = Math.max(0, containerWidth)
  const safeContainerHeight = Math.max(0, containerHeight)
  const safeIntrinsicWidth = intrinsicWidth > 0 ? intrinsicWidth : 1
  const safeIntrinsicHeight = intrinsicHeight > 0 ? intrinsicHeight : 1

  if (fit === 'fill') {
    return {
      width: safeContainerWidth,
      height: safeContainerHeight,
    }
  }

  if (fit === 'none') {
    return {
      width: safeIntrinsicWidth,
      height: safeIntrinsicHeight,
    }
  }

  const containScale = Math.min(
    safeContainerWidth / safeIntrinsicWidth,
    safeContainerHeight / safeIntrinsicHeight
  )
  const coverScale = Math.max(
    safeContainerWidth / safeIntrinsicWidth,
    safeContainerHeight / safeIntrinsicHeight
  )

  if (fit === 'contain') {
    return {
      width: safeIntrinsicWidth * containScale,
      height: safeIntrinsicHeight * containScale,
    }
  }

  if (fit === 'cover') {
    return {
      width: safeIntrinsicWidth * coverScale,
      height: safeIntrinsicHeight * coverScale,
    }
  }

  if (fit === 'scale-down') {
    const scaleDownScale = Math.min(1, containScale)
    return {
      width: safeIntrinsicWidth * scaleDownScale,
      height: safeIntrinsicHeight * scaleDownScale,
    }
  }

  return {
    width: safeContainerWidth,
    height: safeContainerHeight,
  }
}
