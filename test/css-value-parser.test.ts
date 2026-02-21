import { describe, expect, it } from 'vitest'

import {
  parseSimpleCalcTerms,
  splitByWhitespaceOutsideParens,
} from '../src/css-value-parser.js'

describe('css value parser helpers', () => {
  it('splits whitespace-separated tokens outside parentheses', () => {
    expect(splitByWhitespaceOutsideParens('left center')).toEqual([
      'left',
      'center',
    ])
    expect(
      splitByWhitespaceOutsideParens('calc(100% - 10px) bottom 20px')
    ).toEqual(['calc(100% - 10px)', 'bottom', '20px'])
  })

  it('parses simple calc terms with signs', () => {
    expect(parseSimpleCalcTerms('calc(100% - 10px + 2px)')).toEqual([
      { sign: 1, value: '100%' },
      { sign: -1, value: '10px' },
      { sign: 1, value: '2px' },
    ])
    expect(parseSimpleCalcTerms('CALC(25% + 3px)')).toEqual([
      { sign: 1, value: '25%' },
      { sign: 1, value: '3px' },
    ])
  })

  it('returns undefined for non-calc and invalid calc tokens', () => {
    expect(parseSimpleCalcTerms('10px')).toBeUndefined()
    expect(parseSimpleCalcTerms('calc()')).toBeUndefined()
    expect(parseSimpleCalcTerms('calc(+)')).toBeUndefined()
  })
})
