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
    expect(DISPLAY_VALUE_TO_CANONICAL['flow-root']).toBe('flex')
    expect(DISPLAY_VALUE_TO_CANONICAL.grid).toBe('flex')
    expect(DISPLAY_VALUE_TO_CANONICAL['inline-grid']).toBe('flex')
    expect(DISPLAY_VALUE_TO_CANONICAL.table).toBe('flex')
    expect(DISPLAY_VALUE_TO_CANONICAL['inline-table']).toBe('flex')
    expect(DISPLAY_VALUE_TO_CANONICAL['table-row']).toBe('flex')
    expect(DISPLAY_VALUE_TO_CANONICAL['table-cell']).toBe('flex')
    expect(DISPLAY_VALUE_TO_CANONICAL['table-caption']).toBe('flex')
    expect(DISPLAY_VALUE_TO_CANONICAL.contents).toBe('contents')
    expect(DISPLAY_VALUE_TO_CANONICAL.none).toBe('none')
  })

  it('detects supported display values', () => {
    expect(isSupportedDisplayValue('inline-block')).toBe(true)
    expect(isSupportedDisplayValue(' contents ')).toBe(true)
    expect(isSupportedDisplayValue('grid')).toBe(true)
    expect(isSupportedDisplayValue('inline-grid')).toBe(true)
    expect(isSupportedDisplayValue('table')).toBe(true)
    expect(isSupportedDisplayValue('inline-table')).toBe(true)
    expect(isSupportedDisplayValue('table-row')).toBe(true)
    expect(isSupportedDisplayValue('table-cell')).toBe(true)
    expect(isSupportedDisplayValue('flow-root')).toBe(true)
  })
})
