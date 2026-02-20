import { describe, expect, it } from 'vitest'

import {
  parseOverflowClipMargin,
  resolveOverflowClipBox,
} from '../src/builder/overflow-utils.js'

describe('overflow helpers', () => {
  it('should resolve padding-box by default', () => {
    const box = resolveOverflowClipBox(
      {
        borderLeftWidth: 4,
        borderTopWidth: 5,
        borderRightWidth: 6,
        borderBottomWidth: 7,
        paddingLeft: 8,
        paddingTop: 9,
        paddingRight: 10,
        paddingBottom: 11,
      },
      10,
      20,
      100,
      60
    )

    expect(box).toEqual({
      x: 14,
      y: 25,
      width: 90,
      height: 48,
    })
  })

  it('should resolve content-box and border-box', () => {
    const commonStyle = {
      borderLeftWidth: 4,
      borderTopWidth: 5,
      borderRightWidth: 6,
      borderBottomWidth: 7,
      paddingLeft: 8,
      paddingTop: 9,
      paddingRight: 10,
      paddingBottom: 11,
    }
    const contentBox = resolveOverflowClipBox(
      {
        ...commonStyle,
        overflowClipMarginBox: 'content-box',
      },
      10,
      20,
      100,
      60
    )
    const borderBox = resolveOverflowClipBox(
      {
        ...commonStyle,
        overflowClipMarginBox: 'border-box',
      },
      10,
      20,
      100,
      60
    )

    expect(contentBox).toEqual({
      x: 22,
      y: 34,
      width: 72,
      height: 28,
    })
    expect(borderBox).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 60,
    })
  })

  it('should parse overflow-clip-margin to non-negative numbers', () => {
    expect(parseOverflowClipMargin({ overflowClipMargin: 12 })).toBe(12)
    expect(parseOverflowClipMargin({ overflowClipMargin: '15' })).toBe(15)
    expect(parseOverflowClipMargin({ overflowClipMargin: -3 })).toBe(0)
    expect(parseOverflowClipMargin({ overflowClipMargin: 'invalid' })).toBe(0)
  })
})
