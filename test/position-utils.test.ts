import { describe, expect, it } from 'vitest'

import { normalizePositionValue } from '../src/handler/position.js'

describe('position utils', () => {
  it('should preserve fixed positioning keyword', () => {
    expect(normalizePositionValue(' fixed ')).toBe('fixed')
  })

  it('should map sticky to static in non-scroll rendering', () => {
    expect(normalizePositionValue('sticky')).toBe('static')
  })

  it('should normalize unaliased position keywords', () => {
    expect(normalizePositionValue(' Relative ')).toBe('relative')
  })

  it('should keep unknown string values normalized for downstream validation', () => {
    expect(normalizePositionValue(' BOGUS ')).toBe('bogus')
  })

  it('should keep non-string values unchanged', () => {
    expect(normalizePositionValue(123)).toBe(123)
  })
})
