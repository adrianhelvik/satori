import { normalizePositionValue } from './handler/position.js'
import type { SerializedStyle } from './handler/style-types.js'
import { parseFiniteNumber } from './style-number.js'
import { lengthToNumber } from './utils.js'

const FIXED_ISOLATED_INHERITED_PROPS: ReadonlyArray<keyof SerializedStyle> = [
  'transform',
  '_inheritedClipPathId',
  '_inheritedMaskId',
  '_inheritedBackgroundClipTextPath',
]

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

export function isFixedPositionStyle(
  style: Record<string, unknown> | undefined
): boolean {
  if (!style) return false
  return normalizePositionValue(style.position) === 'fixed'
}

export function resolveFixedPosition(
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

export function isolateFixedInheritance(
  inheritedStyle: SerializedStyle
): SerializedStyle {
  const nextInheritedStyle = { ...inheritedStyle }
  for (const key of FIXED_ISOLATED_INHERITED_PROPS) {
    delete nextInheritedStyle[key]
  }
  return nextInheritedStyle
}
