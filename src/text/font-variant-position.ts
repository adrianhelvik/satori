import {
  normalizeFontVariantPositionToken,
  resolveFontVariantPositionFromShorthand,
} from './font-variant.js'

export type FontVariantPosition = 'normal' | 'sub' | 'super'

export type FontVariantPositionMetrics = {
  fontSizeScale: number
  baselineShift: number
}

export function resolveFontVariantPosition(
  value: unknown,
  fontVariant?: unknown
): FontVariantPosition {
  const explicit = normalizeFontVariantPositionToken(value)
  if (explicit) return explicit

  const shorthand = resolveFontVariantPositionFromShorthand(fontVariant)
  if (shorthand) return shorthand

  return 'normal'
}

export function getFontVariantPositionMetrics(
  position: FontVariantPosition,
  fontSize: number
): FontVariantPositionMetrics {
  // Approximation when dedicated OpenType glyph forms are unavailable.
  if (position === 'super') {
    return {
      fontSizeScale: 0.8,
      baselineShift: -0.3 * fontSize,
    }
  }
  if (position === 'sub') {
    return {
      fontSizeScale: 0.8,
      baselineShift: 0.18 * fontSize,
    }
  }

  return {
    fontSizeScale: 1,
    baselineShift: 0,
  }
}
