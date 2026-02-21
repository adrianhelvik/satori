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
    expect(parseListStyleTypeValue('lower-norwegian')).toBe('lower-norwegian')
    expect(parseListStyleTypeValue('UPPER-DANISH')).toBe('upper-danish')
    expect(parseListStyleTypeValue('armenian')).toBe('armenian')
    expect(parseListStyleTypeValue('lower-armenian')).toBe('lower-armenian')
    expect(parseListStyleTypeValue('georgian')).toBe('georgian')
    expect(parseListStyleTypeValue('HEBREW')).toBe('hebrew')
    expect(parseListStyleTypeValue('lower-cyrillic')).toBe('lower-cyrillic')
    expect(parseListStyleTypeValue('UPPER-CYRILLIC')).toBe('upper-cyrillic')
    expect(parseListStyleTypeValue('hiragana')).toBe('hiragana')
    expect(parseListStyleTypeValue('hiragana-iroha')).toBe('hiragana-iroha')
    expect(parseListStyleTypeValue('KATAKANA')).toBe('katakana')
    expect(parseListStyleTypeValue('katakana-iroha')).toBe('katakana-iroha')
    expect(parseListStyleTypeValue('arabic-indic')).toBe('arabic-indic')
    expect(parseListStyleTypeValue('PERSIAN')).toBe('persian')
    expect(parseListStyleTypeValue('cjk-decimal')).toBe('cjk-decimal')
    expect(parseListStyleTypeValue('cambodian')).toBe('cambodian')
    expect(parseListStyleTypeValue('mongolian')).toBe('mongolian')
    expect(parseListStyleTypeValue('oriya')).toBe('oriya')
    expect(parseListStyleTypeValue('tibetan')).toBe('tibetan')
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
    expect(getListMarkerText('lower-norwegian', 27)).toBe('æ.')
    expect(getListMarkerText('lower-norwegian', 29)).toBe('å.')
    expect(getListMarkerText('upper-danish', 27)).toBe('Æ.')
    expect(getListMarkerText('arabic-indic', 27)).toBe('٢٧.')
    expect(getListMarkerText('persian', 305)).toBe('۳۰۵.')
    expect(getListMarkerText('devanagari', 42)).toBe('४२.')
    expect(getListMarkerText('thai', 19)).toBe('๑๙.')
    expect(getListMarkerText('cjk-decimal', 19)).toBe('一九、')
    expect(getListMarkerText('cambodian', 305)).toBe('៣០៥.')
    expect(getListMarkerText('mongolian', 42)).toBe('᠔᠒.')
    expect(getListMarkerText('oriya', 42)).toBe('୪୨.')
    expect(getListMarkerText('tibetan', 42)).toBe('༤༢.')
    expect(getListMarkerText('armenian', 12)).toBe('ԺԲ.')
    expect(getListMarkerText('lower-armenian', 12)).toBe('ժբ.')
    expect(getListMarkerText('georgian', 12)).toBe('იბ.')
    expect(getListMarkerText('hebrew', 1)).toBe('א.')
    expect(getListMarkerText('hebrew', 15)).toBe('טו.')
    expect(getListMarkerText('hebrew', 16)).toBe('טז.')
    expect(getListMarkerText('hebrew', 42)).toBe('מב.')
    expect(getListMarkerText('ethiopic-numeric', 1)).toBe('፩/')
    expect(getListMarkerText('ethiopic-numeric', 10)).toBe('፲/')
    expect(getListMarkerText('ethiopic-numeric', 100)).toBe('፻/')
    expect(getListMarkerText('ethiopic-numeric', 1000)).toBe('፲፻/')
    expect(getListMarkerText('ethiopic-numeric', 10000)).toBe('፼/')
    expect(getListMarkerText('lower-cyrillic', 1)).toBe('а.')
    expect(getListMarkerText('upper-cyrillic', 33)).toBe('АА.')
    expect(getListMarkerText('hiragana', 1)).toBe('あ.')
    expect(getListMarkerText('hiragana-iroha', 1)).toBe('い.')
    expect(getListMarkerText('hiragana-iroha', 2)).toBe('ろ.')
    expect(getListMarkerText('katakana', 2)).toBe('イ.')
    expect(getListMarkerText('katakana-iroha', 1)).toBe('イ.')
    expect(getListMarkerText('katakana-iroha', 2)).toBe('ロ.')
    expect(getListMarkerText('lower-roman', 4)).toBe('iv.')
    expect(getListMarkerText('"\\2192"', 1)).toBe('\u2192')
    expect(getListMarkerText('none', 1)).toBeNull()
  })

  it('should detect ordered list marker types', () => {
    expect(isOrderedListMarkerType('decimal')).toBe(true)
    expect(isOrderedListMarkerType('lower-hexadecimal')).toBe(true)
    expect(isOrderedListMarkerType('upper-hexadecimal')).toBe(true)
    expect(isOrderedListMarkerType('lower-norwegian')).toBe(true)
    expect(isOrderedListMarkerType('upper-norwegian')).toBe(true)
    expect(isOrderedListMarkerType('lower-danish')).toBe(true)
    expect(isOrderedListMarkerType('upper-danish')).toBe(true)
    expect(isOrderedListMarkerType('arabic-indic')).toBe(true)
    expect(isOrderedListMarkerType('persian')).toBe(true)
    expect(isOrderedListMarkerType('devanagari')).toBe(true)
    expect(isOrderedListMarkerType('bengali')).toBe(true)
    expect(isOrderedListMarkerType('gurmukhi')).toBe(true)
    expect(isOrderedListMarkerType('gujarati')).toBe(true)
    expect(isOrderedListMarkerType('kannada')).toBe(true)
    expect(isOrderedListMarkerType('malayalam')).toBe(true)
    expect(isOrderedListMarkerType('tamil')).toBe(true)
    expect(isOrderedListMarkerType('telugu')).toBe(true)
    expect(isOrderedListMarkerType('thai')).toBe(true)
    expect(isOrderedListMarkerType('lao')).toBe(true)
    expect(isOrderedListMarkerType('myanmar')).toBe(true)
    expect(isOrderedListMarkerType('khmer')).toBe(true)
    expect(isOrderedListMarkerType('cambodian')).toBe(true)
    expect(isOrderedListMarkerType('cjk-decimal')).toBe(true)
    expect(isOrderedListMarkerType('mongolian')).toBe(true)
    expect(isOrderedListMarkerType('oriya')).toBe(true)
    expect(isOrderedListMarkerType('tibetan')).toBe(true)
    expect(isOrderedListMarkerType('armenian')).toBe(true)
    expect(isOrderedListMarkerType('lower-armenian')).toBe(true)
    expect(isOrderedListMarkerType('georgian')).toBe(true)
    expect(isOrderedListMarkerType('hebrew')).toBe(true)
    expect(isOrderedListMarkerType('ethiopic-numeric')).toBe(true)
    expect(isOrderedListMarkerType('lower-cyrillic')).toBe(true)
    expect(isOrderedListMarkerType('upper-cyrillic')).toBe(true)
    expect(isOrderedListMarkerType('hiragana')).toBe(true)
    expect(isOrderedListMarkerType('hiragana-iroha')).toBe(true)
    expect(isOrderedListMarkerType('katakana')).toBe(true)
    expect(isOrderedListMarkerType('katakana-iroha')).toBe(true)
    expect(isOrderedListMarkerType('disc')).toBe(false)
    expect(isOrderedListMarkerType('"→"')).toBe(false)
  })

  it('keeps list-style aliases behaviorally aligned', () => {
    expect(getListMarkerText('upper-alpha', 28)).toBe(
      getListMarkerText('upper-latin', 28)
    )
    expect(getListMarkerText('lower-alpha', 54)).toBe(
      getListMarkerText('lower-latin', 54)
    )
    expect(getListMarkerText('armenian', 42)).toBe(
      getListMarkerText('upper-armenian', 42)
    )
    expect(getListMarkerText('lower-danish', 31)).toBe(
      getListMarkerText('lower-norwegian', 31)
    )
    expect(getListMarkerText('upper-danish', 31)).toBe(
      getListMarkerText('upper-norwegian', 31)
    )
  })
})
