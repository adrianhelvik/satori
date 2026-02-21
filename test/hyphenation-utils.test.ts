import { describe, expect, it } from 'vitest'

import {
  applyHyphenateLimitChars,
  parseHyphenateLimitChars,
} from '../src/text/hyphenation.js'

describe('hyphenation helpers', () => {
  it('parses hyphenate-limit-chars values', () => {
    expect(parseHyphenateLimitChars(6)).toEqual({ total: 6 })
    expect(parseHyphenateLimitChars('8 3 2')).toEqual({
      total: 8,
      before: 3,
      after: 2,
    })
    expect(parseHyphenateLimitChars('8 auto 3')).toEqual({
      total: 8,
      before: undefined,
      after: 3,
    })
  })

  it('rejects invalid hyphenate-limit-chars values', () => {
    expect(parseHyphenateLimitChars('')).toBeNull()
    expect(parseHyphenateLimitChars('invalid')).toBeNull()
    expect(parseHyphenateLimitChars('8 -1 3')).toBeNull()
    expect(parseHyphenateLimitChars('8 2 3 4')).toBeNull()
  })

  it('removes disallowed discretionary break opportunities', () => {
    const words = ['co', 'operate']
    const requiredBreaks = [false, false, false]
    const softHyphenBreaks = [false, true, false]

    applyHyphenateLimitChars(
      words,
      requiredBreaks,
      softHyphenBreaks,
      parseHyphenateLimitChars('8 3 3')
    )

    expect(words).toEqual(['cooperate'])
    expect(requiredBreaks).toEqual([false, false])
    expect(softHyphenBreaks).toEqual([false, false])
  })

  it('keeps allowed discretionary break opportunities', () => {
    const words = ['co', 'operate']
    const requiredBreaks = [false, false, false]
    const softHyphenBreaks = [false, true, false]

    applyHyphenateLimitChars(
      words,
      requiredBreaks,
      softHyphenBreaks,
      parseHyphenateLimitChars('8 2 3')
    )

    expect(words).toEqual(['co', 'operate'])
    expect(requiredBreaks).toEqual([false, false, false])
    expect(softHyphenBreaks).toEqual([false, true, false])
  })
})
