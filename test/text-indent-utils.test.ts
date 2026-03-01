import { describe, expect, it } from 'vitest'

import {
  getLineIndent,
  resolveTextIndentConfig,
} from '../src/text/text-indent.js'

describe('text-indent helpers', () => {
  const inheritedStyle = {}

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

  it('supports calc() length-percentage expressions', () => {
    expect(
      resolveTextIndentConfig('calc(25% - 10px)', 200, 16, inheritedStyle)
    ).toEqual({
      width: 40,
      eachLine: false,
      hanging: false,
    })

    expect(
      resolveTextIndentConfig(
        'calc(10% + 8px) each-line',
        200,
        16,
        inheritedStyle
      )
    ).toEqual({
      width: 28,
      eachLine: true,
      hanging: false,
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

    expect(
      resolveTextIndentConfig('calc(25% - bogus)', 200, 16, inheritedStyle)
    ).toEqual({
      width: 0,
      eachLine: false,
      hanging: false,
    })
  })

  it('computes line indentation by line position and modifiers', () => {
    const firstLineOnly = { width: 20, eachLine: false, hanging: false }
    expect(getLineIndent(0, firstLineOnly)).toBe(20)
    expect(getLineIndent(1, firstLineOnly)).toBe(0)

    const eachLine = { width: 20, eachLine: true, hanging: false }
    expect(getLineIndent(0, eachLine)).toBe(20)
    expect(getLineIndent(1, eachLine)).toBe(20)

    const hanging = { width: 20, eachLine: false, hanging: true }
    expect(getLineIndent(0, hanging)).toBe(0)
    expect(getLineIndent(1, hanging)).toBe(20)

    const eachLineHanging = { width: 20, eachLine: true, hanging: true }
    expect(getLineIndent(0, eachLineHanging)).toBe(0)
    expect(getLineIndent(1, eachLineHanging)).toBe(0)
  })
})
