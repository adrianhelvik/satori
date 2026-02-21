import { describe, expect, it } from 'vitest'

import {
  getFontVariantPositionMetrics,
  resolveFontVariantPosition,
} from '../src/text/font-variant-position.js'

describe('font-variant-position helpers', () => {
  it('resolves supported values', () => {
    expect(resolveFontVariantPosition('normal')).toBe('normal')
    expect(resolveFontVariantPosition('sub')).toBe('sub')
    expect(resolveFontVariantPosition('SUPER')).toBe('super')
  })

  it('falls back to normal for unsupported values', () => {
    expect(resolveFontVariantPosition(undefined)).toBe('normal')
    expect(resolveFontVariantPosition('invalid')).toBe('normal')
  })

  it('computes synthetic metrics for sub/super', () => {
    expect(getFontVariantPositionMetrics('normal', 20)).toEqual({
      fontSizeScale: 1,
      baselineShift: 0,
    })
    expect(getFontVariantPositionMetrics('super', 20)).toEqual({
      fontSizeScale: 0.8,
      baselineShift: -6,
    })
    const subMetrics = getFontVariantPositionMetrics('sub', 20)
    expect(subMetrics.fontSizeScale).toBe(0.8)
    expect(subMetrics.baselineShift).toBeCloseTo(3.6, 6)
  })
})
