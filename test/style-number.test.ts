import { describe, expect, it } from 'vitest'

import { parseFiniteNumber } from '../src/style-number.js'

describe('parseFiniteNumber', () => {
  it('returns finite numbers as-is', () => {
    expect(parseFiniteNumber(12, 3)).toBe(12)
  })

  it('parses numeric strings', () => {
    expect(parseFiniteNumber('42', 0)).toBe(42)
  })

  it('falls back for non-finite values', () => {
    expect(parseFiniteNumber('hello', 7)).toBe(7)
    expect(parseFiniteNumber(Infinity, 7)).toBe(7)
  })
})
