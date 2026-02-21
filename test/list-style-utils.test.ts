import { describe, expect, it } from 'vitest'

import {
  getListMarkerText,
  isOrderedListMarkerType,
  parseListStylePositionValue,
  parseListStyleShorthand,
  parseListStyleTypeValue,
} from '../src/handler/list-style.js'

describe('list-style helpers', () => {
  it('should parse list-style-type keywords and quoted strings', () => {
    expect(parseListStyleTypeValue('SQUARE')).toBe('square')
    expect(parseListStyleTypeValue('lower-hexadecimal')).toBe(
      'lower-hexadecimal'
    )
    expect(parseListStyleTypeValue('"->"')).toBe('"->"')
    expect(parseListStyleTypeValue('unknown')).toBeUndefined()
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
    expect(getListMarkerText('lower-roman', 4)).toBe('iv.')
    expect(getListMarkerText('"\\2192"', 1)).toBe('\u2192')
    expect(getListMarkerText('none', 1)).toBeNull()
  })

  it('should detect ordered list marker types', () => {
    expect(isOrderedListMarkerType('decimal')).toBe(true)
    expect(isOrderedListMarkerType('lower-hexadecimal')).toBe(true)
    expect(isOrderedListMarkerType('disc')).toBe(false)
    expect(isOrderedListMarkerType('"→"')).toBe(false)
  })
})
