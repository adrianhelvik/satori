import { describe, expect, it } from 'vitest'

import {
  getLineIndent,
  resolveTextIndentConfig,
} from '../src/text/text-indent.js'

describe('text-indent helpers', () => {
  const inheritedStyle = {
    _viewportWidth: 1200,
    _viewportHeight: 630,
  }

  it('resolves numeric and percentage text-indent values', () => {
    expect(resolveTextIndentConfig(24, 200, 16, inheritedStyle)).toEqual({
      width: 24,
      eachLine: false,
      hanging: false,
    })

    expect(resolveTextIndentConfig('25%', 200, 16, inheritedStyle)).toEqual({
      width: 50,
      eachLine: false,
      hanging: false,
    })
  })

  it('parses each-line and hanging modifiers', () => {
    expect(
      resolveTextIndentConfig('30px each-line hanging', 200, 16, inheritedStyle)
    ).toEqual({
      width: 30,
      eachLine: true,
      hanging: true,
    })
  })

  it('returns no indent for invalid text-indent syntax', () => {
    expect(
      resolveTextIndentConfig('30px 40px', 200, 16, inheritedStyle)
    ).toEqual({
      width: 0,
      eachLine: false,
      hanging: false,
    })

    expect(
      resolveTextIndentConfig(
        '30px each-line each-line',
        200,
        16,
        inheritedStyle
      )
    ).toEqual({
      width: 0,
      eachLine: false,
      hanging: false,
    })
  })

  it('computes line indentation by line position and forced-break context', () => {
    const firstLineOnly = { width: 20, eachLine: false, hanging: false }
    expect(getLineIndent(0, false, firstLineOnly)).toBe(20)
    expect(getLineIndent(1, false, firstLineOnly)).toBe(0)

    const eachLine = { width: 20, eachLine: true, hanging: false }
    expect(getLineIndent(1, true, eachLine)).toBe(20)
    expect(getLineIndent(1, false, eachLine)).toBe(0)

    const hanging = { width: 20, eachLine: false, hanging: true }
    expect(getLineIndent(0, false, hanging)).toBe(0)
    expect(getLineIndent(1, false, hanging)).toBe(20)
  })
})
