import { describe, expect, it } from 'vitest'

import {
  getListMarkerText,
  isOrderedListMarkerType,
  parseListStylePositionValue,
  parseListStyleShorthand,
  parseListStyleTypeValue,
} from '../src/handler/list-style.js'
import {
  listStyleTypes,
  orderedListStyleTypes,
} from '../src/handler/list-style-types.js'

describe('list-style helpers', () => {
  it('should parse list-style-type keywords and quoted strings', () => {
    expect(parseListStyleTypeValue('SQUARE')).toBe('square')
    expect(parseListStyleTypeValue('lower-hexadecimal')).toBe(
      'lower-hexadecimal'
    )
    expect(parseListStyleTypeValue('upper-hexadecimal')).toBe(
      'upper-hexadecimal'
    )
    expect(parseListStyleTypeValue('armenian')).toBe('armenian')
    expect(parseListStyleTypeValue('lower-armenian')).toBe('lower-armenian')
    expect(parseListStyleTypeValue('georgian')).toBe('georgian')
    expect(parseListStyleTypeValue('lower-cyrillic')).toBe('lower-cyrillic')
    expect(parseListStyleTypeValue('UPPER-CYRILLIC')).toBe('upper-cyrillic')
    expect(parseListStyleTypeValue('hiragana')).toBe('hiragana')
    expect(parseListStyleTypeValue('KATAKANA')).toBe('katakana')
    expect(parseListStyleTypeValue('"->"')).toBe('"->"')
    expect(parseListStyleTypeValue('unknown')).toBeUndefined()
  })

  it('keeps parser and ordered marker classification registries in sync', () => {
    for (const type of listStyleTypes) {
      expect(parseListStyleTypeValue(type.toUpperCase())).toBe(type)
    }

    for (const type of orderedListStyleTypes) {
      expect(listStyleTypes.has(type)).toBe(true)
      expect(isOrderedListMarkerType(type)).toBe(true)
    }

    expect(isOrderedListMarkerType('disc')).toBe(false)
    expect(isOrderedListMarkerType('square')).toBe(false)
    expect(isOrderedListMarkerType('disclosure-open')).toBe(false)
  })

  it('should parse list-style shorthand tokens', () => {
    expect(parseListStyleShorthand('square inside')).toEqual({
      listStyleType: 'square',
      listStylePosition: 'inside',
    })

    expect(parseListStyleShorthand("url('x.png') outside decimal")).toEqual({
      listStyleImage: "url('x.png')",
      listStylePosition: 'outside',
      listStyleType: 'decimal',
    })
  })

  it('should parse list-style-position values', () => {
    expect(parseListStylePositionValue('inside')).toBe('inside')
    expect(parseListStylePositionValue('OUTSIDE')).toBe('outside')
    expect(parseListStylePositionValue('center')).toBeUndefined()
  })

  it('should format marker text for counters and strings', () => {
    expect(getListMarkerText('decimal', 3)).toBe('3.')
    expect(getListMarkerText('lower-hexadecimal', 16)).toBe('10.')
    expect(getListMarkerText('upper-hexadecimal', 26)).toBe('1A.')
    expect(getListMarkerText('armenian', 12)).toBe('ԺԲ.')
    expect(getListMarkerText('lower-armenian', 12)).toBe('ժբ.')
    expect(getListMarkerText('georgian', 12)).toBe('იბ.')
    expect(getListMarkerText('lower-cyrillic', 1)).toBe('а.')
    expect(getListMarkerText('upper-cyrillic', 33)).toBe('АА.')
    expect(getListMarkerText('hiragana', 1)).toBe('あ.')
    expect(getListMarkerText('katakana', 2)).toBe('イ.')
    expect(getListMarkerText('lower-roman', 4)).toBe('iv.')
    expect(getListMarkerText('"\\2192"', 1)).toBe('\u2192')
    expect(getListMarkerText('none', 1)).toBeNull()
  })

  it('should detect ordered list marker types', () => {
    expect(isOrderedListMarkerType('decimal')).toBe(true)
    expect(isOrderedListMarkerType('lower-hexadecimal')).toBe(true)
    expect(isOrderedListMarkerType('upper-hexadecimal')).toBe(true)
    expect(isOrderedListMarkerType('armenian')).toBe(true)
    expect(isOrderedListMarkerType('lower-armenian')).toBe(true)
    expect(isOrderedListMarkerType('georgian')).toBe(true)
    expect(isOrderedListMarkerType('lower-cyrillic')).toBe(true)
    expect(isOrderedListMarkerType('upper-cyrillic')).toBe(true)
    expect(isOrderedListMarkerType('hiragana')).toBe(true)
    expect(isOrderedListMarkerType('katakana')).toBe(true)
    expect(isOrderedListMarkerType('disc')).toBe(false)
    expect(isOrderedListMarkerType('"→"')).toBe(false)
  })
})
