import { describe, expect, it } from 'vitest'

import {
  DISPLAY_VALUE_TO_CANONICAL,
  isSupportedDisplayValue,
  normalizeDisplayValue,
} from '../src/handler/display.js'

describe('display helpers', () => {
  it('normalizes display values', () => {
    expect(normalizeDisplayValue(' Inline-Flex ')).toBe('inline-flex')
    expect(normalizeDisplayValue(undefined)).toBe('')
    expect(normalizeDisplayValue(null)).toBe('')
  })

  it('maps supported display aliases to canonical display modes', () => {
    expect(DISPLAY_VALUE_TO_CANONICAL['inline-block']).toBe('flex')
    expect(DISPLAY_VALUE_TO_CANONICAL.block).toBe('flex')
    expect(DISPLAY_VALUE_TO_CANONICAL.contents).toBe('contents')
    expect(DISPLAY_VALUE_TO_CANONICAL.none).toBe('none')
  })

  it('detects supported display values', () => {
    expect(isSupportedDisplayValue('inline-block')).toBe(true)
    expect(isSupportedDisplayValue(' contents ')).toBe(true)
    expect(isSupportedDisplayValue('grid')).toBe(false)
  })
})
