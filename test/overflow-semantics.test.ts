import { describe, expect, it } from 'vitest'

import { isClippedOverflow } from '../src/overflow-semantics.js'

describe('overflow semantics', () => {
  it('treats clipped overflow values as clipping', () => {
    expect(isClippedOverflow('hidden')).toBe(true)
    expect(isClippedOverflow('clip')).toBe(true)
    expect(isClippedOverflow('auto')).toBe(true)
    expect(isClippedOverflow('scroll')).toBe(true)
  })

  it('does not treat non-clipping values as clipping', () => {
    expect(isClippedOverflow('visible')).toBe(false)
    expect(isClippedOverflow('inherit')).toBe(false)
    expect(isClippedOverflow(undefined)).toBe(false)
    expect(isClippedOverflow(null)).toBe(false)
  })
})
