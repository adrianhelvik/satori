import { normalizePositionValue } from './handler/position.js'
import type { SerializedStyle } from './handler/style-types.js'
import { parseFiniteNumber } from './style-number.js'
import { isTransformInput } from './builder/transform.js'
import { lengthToNumber } from './utils.js'

const FIXED_ISOLATED_INHERITED_PROPS: ReadonlyArray<keyof SerializedStyle> = [
  'transform',
  'filter',
  'perspective',
  'contain',
  'willChange',
]

function hasNonNoneFilter(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const normalized = value.trim().toLowerCase()
  return normalized !== '' && normalized !== 'none'
}

function hasPerspectiveContainingBlock(value: unknown): boolean {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0
  }
  if (typeof value !== 'string') return false
  const normalized = value.trim().toLowerCase()
  if (!normalized || normalized === 'none') return false
  if (normalized === '0' || normalized === '0px') return false
  return true
}

function hasContainContainingBlock(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const tokens = value.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return (
    tokens.includes('strict') ||
    tokens.includes('content') ||
    tokens.includes('layout') ||
    tokens.includes('paint')
  )
}

function hasWillChangeContainingBlock(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const tokens = value
    .trim()
    .toLowerCase()
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
  return (
    tokens.includes('transform') ||
    tokens.includes('filter') ||
    tokens.includes('perspective') ||
    tokens.includes('contain')
  )
}

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

export function createsFixedContainingBlock(style: SerializedStyle): boolean {
  return (
    isTransformInput(style.transform) ||
    hasNonNoneFilter(style.filter) ||
    hasPerspectiveContainingBlock(style.perspective) ||
    hasContainContainingBlock(style.contain) ||
    hasWillChangeContainingBlock(style.willChange)
  )
}

export function resolveFixedPosition(
  layoutBox: { left: number; top: number; width: number; height: number },
  style: SerializedStyle,
  inheritedStyle: SerializedStyle,
  viewportDimensions: { width: number; height: number }
): { left: number; top: number } {
  const viewportWidth = viewportDimensions.width
  const viewportHeight = viewportDimensions.height

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
