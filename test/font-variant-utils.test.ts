import { describe, expect, it } from 'vitest'

import {
  parseFontVariantShorthand,
  tokenizeFontVariant,
} from '../src/text/font-variant.js'

describe('font-variant utilities', () => {
  it('tokenizes font-variant shorthand from strings and arrays', () => {
    expect(tokenizeFontVariant(' small-caps   super ')).toEqual([
      'small-caps',
      'super',
    ])
    expect(tokenizeFontVariant(['small-caps', ' super'])).toEqual([
      'small-caps',
      'super',
    ])
  })

  it('parses shorthand tokens into supported longhands', () => {
    expect(parseFontVariantShorthand('small-caps super')).toEqual({
      tokens: ['small-caps', 'super'],
      fontVariantCaps: 'small-caps',
      fontVariantPosition: 'super',
    })
  })

  it('keeps parsing deterministic when repeated supported tokens are present', () => {
    expect(
      parseFontVariantShorthand('small-caps all-small-caps super sub')
    ).toEqual({
      tokens: ['small-caps', 'all-small-caps', 'super', 'sub'],
      fontVariantCaps: 'all-small-caps',
      fontVariantPosition: 'sub',
    })
  })

  it('retains tokens while leaving unsupported entries unresolved', () => {
    expect(parseFontVariantShorthand('historical-forms oldstyle-nums')).toEqual(
      {
        tokens: ['historical-forms', 'oldstyle-nums'],
      }
    )
  })
})
