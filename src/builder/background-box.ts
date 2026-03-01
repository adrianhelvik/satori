export type BackgroundBox = 'border-box' | 'padding-box' | 'content-box'

export interface BackgroundBoxRect {
  left: number
  top: number
  width: number
  height: number
}

const supportedBackgroundBlendModes = new Set([
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity',
  'plus-lighter',
])

export function parseBackgroundBlendModes(value: unknown): string[] {
  if (typeof value !== 'string' || !value.trim()) return []
  return value
    .split(',')
    .map((mode) => mode.trim().toLowerCase())
    .filter(Boolean)
    .map((mode) => (supportedBackgroundBlendModes.has(mode) ? mode : 'normal'))
}

export function resolveBackgroundBlendMode(
  modes: string[],
  layerIndex: number
): string {
  if (!modes.length) return 'normal'
  return modes[layerIndex % modes.length]
}

function normalizeBackgroundToken(
  value: string | undefined,
  fallback: string
): string {
  return (value || fallback).trim().toLowerCase().replace(/\s+/g, ' ')
}

export function isSolidBlendEligibleBackgroundLayer(layer: {
  repeat?: string
  size?: string
  position?: string
}): boolean {
  const repeat = normalizeBackgroundToken(layer.repeat, 'repeat')
  const size = normalizeBackgroundToken(layer.size, 'auto')
  const position = normalizeBackgroundToken(layer.position, '0% 0%')

  const repeatDefault = repeat === 'repeat' || repeat === 'repeat repeat'
  const sizeDefault = size === 'auto' || size === 'auto auto'
  const positionDefault =
    position === '0% 0%' ||
    position === '0px 0px' ||
    position === 'left top' ||
    position === 'top left'

  return repeatDefault && sizeDefault && positionDefault
}

function toStyleNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

export function normalizeBackgroundBoxValue(
  value: unknown,
  fallback: BackgroundBox,
  useLastLayer = false
): BackgroundBox {
  if (typeof value !== 'string') return fallback

  const tokens = value
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
  if (!tokens.length) return fallback

  const token = useLastLayer ? tokens[tokens.length - 1] : tokens[0]
  if (
    token === 'border-box' ||
    token === 'padding-box' ||
    token === 'content-box'
  ) {
    return token
  }
  return fallback
}

export function resolveBackgroundBoxRect(
  borderBox: BackgroundBoxRect,
  style: Record<string, number | string | object>,
  box: BackgroundBox
): BackgroundBoxRect {
  const borderLeft = toStyleNumber(style.borderLeftWidth)
  const borderRight = toStyleNumber(style.borderRightWidth)
  const borderTop = toStyleNumber(style.borderTopWidth)
  const borderBottom = toStyleNumber(style.borderBottomWidth)
  const paddingLeft = toStyleNumber(style.paddingLeft)
  const paddingRight = toStyleNumber(style.paddingRight)
  const paddingTop = toStyleNumber(style.paddingTop)
  const paddingBottom = toStyleNumber(style.paddingBottom)

  let next: BackgroundBoxRect = { ...borderBox }

  if (box !== 'border-box') {
    next = {
      left: next.left + borderLeft,
      top: next.top + borderTop,
      width: Math.max(0, next.width - borderLeft - borderRight),
      height: Math.max(0, next.height - borderTop - borderBottom),
    }
  }

  if (box === 'content-box') {
    next = {
      left: next.left + paddingLeft,
      top: next.top + paddingTop,
      width: Math.max(0, next.width - paddingLeft - paddingRight),
      height: Math.max(0, next.height - paddingTop - paddingBottom),
    }
  }

  return next
}

export function isSameBackgroundBoxRect(
  first: BackgroundBoxRect,
  second: BackgroundBoxRect
): boolean {
  const epsilon = 0.0001
  return (
    Math.abs(first.left - second.left) < epsilon &&
    Math.abs(first.top - second.top) < epsilon &&
    Math.abs(first.width - second.width) < epsilon &&
    Math.abs(first.height - second.height) < epsilon
  )
}
