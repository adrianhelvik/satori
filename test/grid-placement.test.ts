import { describe, expect, it } from 'vitest'

import { parseGridAxisPlacement } from '../src/grid-placement.js'

describe('grid placement parser', () => {
  it('parses explicit start and end lines', () => {
    expect(parseGridAxisPlacement('2 / 4', undefined, undefined)).toEqual({
      start: 1,
      span: 2,
    })
  })

  it('supports span syntax with auto start', () => {
    expect(
      parseGridAxisPlacement('auto / span 3', undefined, undefined)
    ).toEqual({
      start: undefined,
      span: 3,
    })
  })

  it('resolves negative indexes against explicit tracks', () => {
    expect(parseGridAxisPlacement('-2 / -1', undefined, undefined, 3)).toEqual({
      start: 2,
      span: 1,
    })
  })
})
