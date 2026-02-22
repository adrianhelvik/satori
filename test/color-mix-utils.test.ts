import { describe, expect, it } from 'vitest'

import { resolveColorMixFunctions } from '../src/color-mix.js'

describe('color-mix utilities', () => {
  it('mixes two colors equally by default', () => {
    expect(resolveColorMixFunctions('color-mix(in srgb, red, blue)')).toBe(
      'rgba(128, 0, 128, 1)'
    )
  })

  it('supports explicit and inferred percentages', () => {
    expect(resolveColorMixFunctions('color-mix(in srgb, red 20%, blue)')).toBe(
      'rgba(51, 0, 204, 1)'
    )
  })

  it('normalizes percentages that do not sum to 100', () => {
    expect(
      resolveColorMixFunctions('color-mix(in srgb, red 20%, blue 20%)')
    ).toBe('rgba(128, 0, 128, 1)')
  })

  it('resolves nested color-mix() expressions', () => {
    const resolved = resolveColorMixFunctions(
      'color-mix(in srgb, color-mix(in srgb, red, blue), white 25%)'
    )
    expect(resolved).toMatch(/^rgba\(/)
    expect(resolved.includes('color-mix(')).toBe(false)
  })

  it('supports oklch color-mix() interpolation', () => {
    expect(resolveColorMixFunctions('color-mix(in oklch, red, blue)')).toBe(
      'rgba(186, 0, 194, 1)'
    )
  })

  it('throws on unsupported color spaces', () => {
    expect(() =>
      resolveColorMixFunctions('color-mix(in hsl, red, blue)')
    ).toThrow('Only "srgb" and "oklch" are supported')
  })

  it('throws on invalid color tokens', () => {
    expect(() =>
      resolveColorMixFunctions('color-mix(in srgb, not-a-color, blue)')
    ).toThrow('Invalid color "not-a-color"')
  })
})
