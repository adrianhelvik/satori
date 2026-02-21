import { describe, expect, it } from 'vitest'

import {
  markerAdditive,
  markerAlphabetic,
  markerDecimal,
  markerDecimalLeadingZero,
  markerEthiopicNumeric,
  markerHebrew,
  markerLowerHex,
  markerNumeric,
  markerRoman,
  markerUpperHex,
  markerText,
  toNumericBySymbols,
} from '../src/handler/list-marker-formatters.js'

describe('list marker formatters', () => {
  it('formats basic decimal and hex markers', () => {
    expect(markerDecimal(3)).toBe('3.')
    expect(markerDecimalLeadingZero(3)).toBe('03.')
    expect(markerLowerHex(16)).toBe('10.')
    expect(markerUpperHex(26)).toBe('1A.')
  })

  it('formats roman, alphabetic, numeric, additive, and text markers', () => {
    expect(markerRoman(true)(4)).toBe('IV.')
    expect(markerRoman(false)(4)).toBe('iv.')
    expect(markerAlphabetic(['a', 'b', 'c'])(4)).toBe('aa.')
    expect(
      markerNumeric(['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'])(42)
    ).toBe('٤٢.')
    expect(
      markerAdditive([
        [10, 'X'],
        [2, 'II'],
      ])(12)
    ).toBe('XII.')
    expect(markerText('•')(1)).toBe('•')
    expect(markerText(null)(1)).toBeNull()
  })

  it('formats hebrew markers with traditional 15/16 forms', () => {
    expect(markerHebrew(1)).toBe('א.')
    expect(markerHebrew(15)).toBe('טו.')
    expect(markerHebrew(16)).toBe('טז.')
    expect(markerHebrew(42)).toBe('מב.')
  })

  it('formats ethiopic-numeric markers', () => {
    expect(markerEthiopicNumeric(1)).toBe('፩/')
    expect(markerEthiopicNumeric(10)).toBe('፲/')
    expect(markerEthiopicNumeric(11)).toBe('፲፩/')
    expect(markerEthiopicNumeric(100)).toBe('፻/')
    expect(markerEthiopicNumeric(1000)).toBe('፲፻/')
    expect(markerEthiopicNumeric(10000)).toBe('፼/')
  })

  it('converts decimal digits via symbol tables', () => {
    expect(toNumericBySymbols(19, '〇一二三四五六七八九'.split(''))).toBe(
      '一九'
    )
    expect(toNumericBySymbols(-12, '٠١٢٣٤٥٦٧٨٩'.split(''))).toBe('-١٢')
  })
})
