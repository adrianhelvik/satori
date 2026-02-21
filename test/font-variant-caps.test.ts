import { describe, expect, it } from 'vitest'

import { preprocess } from '../src/text/processor.js'

describe('font-variant-caps', () => {
  it('should synthesize small-caps via uppercase for fontVariantCaps', () => {
    const result = preprocess('Alpha beta gamma', {
      fontVariantCaps: 'small-caps',
    } as any)

    expect(result.processedContent).toBe('ALPHA BETA GAMMA')
  })

  it('should synthesize small-caps from fontVariant shorthand values', () => {
    const result = preprocess('Alpha beta gamma', {
      fontVariant: ['small-caps'],
    } as any)

    expect(result.processedContent).toBe('ALPHA BETA GAMMA')
  })

  it('should not transform content for fontVariantCaps: normal', () => {
    const result = preprocess('Alpha beta gamma', {
      fontVariantCaps: 'normal',
    } as any)

    expect(result.processedContent).toBe('Alpha beta gamma')
  })
})
