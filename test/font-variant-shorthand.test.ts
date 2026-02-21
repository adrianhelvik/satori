import { describe, expect, it } from 'vitest'

import expand from '../src/handler/expand.js'

const inheritedStyle = {
  color: 'black',
  fontSize: 16,
  opacity: 1,
} as const

describe('font-variant shorthand expansion', () => {
  it('maps supported shorthand tokens to longhands', () => {
    const expanded = expand(
      { fontVariant: 'small-caps super' } as any,
      inheritedStyle as any
    )

    expect(expanded.fontVariant).toEqual(['small-caps', 'super'])
    expect(expanded.fontVariantCaps).toBe('small-caps')
    expect(expanded.fontVariantPosition).toBe('super')
  })

  it('defaults supported longhands to normal when omitted in shorthand', () => {
    const expanded = expand(
      { fontVariant: 'sub' } as any,
      inheritedStyle as any
    )

    expect(expanded.fontVariant).toEqual(['sub'])
    expect(expanded.fontVariantCaps).toBe('normal')
    expect(expanded.fontVariantPosition).toBe('sub')
  })
})
