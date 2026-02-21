import { describe, expect, it } from 'vitest'

import {
  parseObjectPosition,
  resolveObjectFitImageSize,
  resolveObjectPositionOffset,
} from '../src/builder/object-fit-position.js'

describe('object-fit-position helpers', () => {
  it('parses side-based and calc object-position values', () => {
    const sideBased = parseObjectPosition('right 10px bottom 20px', 16, {})
    expect(sideBased).toEqual({
      x: { type: 'length', value: 10, fromEnd: true },
      y: { type: 'length', value: 20, fromEnd: true },
    })

    const calcBased = parseObjectPosition(
      'calc(100% - 10px) calc(25% + 2px)',
      16,
      {}
    )
    expect(calcBased).toEqual({
      x: { type: 'calc', value: 1, offset: -10 },
      y: { type: 'calc', value: 0.25, offset: 2 },
    })
  })

  it('falls back to centered object-position for invalid input', () => {
    expect(parseObjectPosition('right nope', 16, {})).toEqual({
      x: { type: 'ratio', value: 0.5 },
      y: { type: 'ratio', value: 0.5 },
    })
  })

  it('resolves object-position offsets for ratio, calc, and length values', () => {
    expect(
      resolveObjectPositionOffset(
        { type: 'ratio', value: 0.25, fromEnd: true },
        100,
        20
      )
    ).toBe(60)

    expect(
      resolveObjectPositionOffset(
        { type: 'calc', value: 0.25, offset: 2, fromEnd: true },
        100,
        20
      )
    ).toBe(58)

    expect(
      resolveObjectPositionOffset(
        { type: 'length', value: 10, fromEnd: true },
        100,
        20
      )
    ).toBe(70)
  })

  it('resolves object-fit image sizes across fit modes', () => {
    expect(resolveObjectFitImageSize('fill', 100, 80, 200, 100)).toEqual({
      width: 100,
      height: 80,
    })
    expect(resolveObjectFitImageSize('none', 100, 80, 200, 100)).toEqual({
      width: 200,
      height: 100,
    })
    expect(resolveObjectFitImageSize('contain', 100, 80, 200, 100)).toEqual({
      width: 100,
      height: 50,
    })
    expect(resolveObjectFitImageSize('cover', 100, 80, 200, 100)).toEqual({
      width: 160,
      height: 80,
    })
    expect(resolveObjectFitImageSize('scale-down', 100, 80, 20, 10)).toEqual({
      width: 20,
      height: 10,
    })
    expect(resolveObjectFitImageSize('scale-down', 100, 80, 200, 100)).toEqual({
      width: 100,
      height: 50,
    })
  })
})
