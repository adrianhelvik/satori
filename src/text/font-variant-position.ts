export type FontVariantPosition = 'normal' | 'sub' | 'super'

export type FontVariantPositionMetrics = {
  fontSizeScale: number
  baselineShift: number
}

export function resolveFontVariantPosition(
  value: unknown
): FontVariantPosition {
  if (typeof value !== 'string') return 'normal'

  const normalized = value.trim().toLowerCase()
  if (normalized === 'sub' || normalized === 'super') {
    return normalized
  }
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
