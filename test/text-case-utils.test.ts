import { describe, expect, it } from 'vitest'

import {
  processTextTransform,
  resolveFontVariantCapsValue,
} from '../src/text/text-case.js'

describe('text-case helpers', () => {
  it('resolves font-variant-caps from longhand and shorthand values', () => {
    expect(resolveFontVariantCapsValue('small-caps', undefined)).toBe(
      'small-caps'
    )
    expect(resolveFontVariantCapsValue(undefined, ['all-small-caps'])).toBe(
      'all-small-caps'
    )
    expect(resolveFontVariantCapsValue(undefined, 'petite-caps')).toBe(
      'petite-caps'
    )
  })

  it('applies text-transform values before synthetic small-caps', () => {
    expect(
      processTextTransform('alpha beta', 'capitalize', 'normal', undefined)
    ).toBe('Alpha Beta')

    expect(
      processTextTransform('Alpha Beta', 'lowercase', 'small-caps', undefined)
    ).toBe('ALPHA BETA')
  })

  it('applies synthetic small-caps for supported values', () => {
    expect(
      processTextTransform('Alpha beta gamma', 'none', 'small-caps', undefined)
    ).toBe('ALPHA BETA GAMMA')
    expect(
      processTextTransform(
        'Alpha beta gamma',
        'none',
        undefined,
        'all-petite-caps'
      )
    ).toBe('ALPHA BETA GAMMA')
  })
})
