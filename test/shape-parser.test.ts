import { describe, expect, it } from 'vitest'

import { createShapeParser } from '../src/parser/shape.js'

function createParser(width = 200, height = 100) {
  return createShapeParser(
    { width, height },
    {},
    {
      fontSize: 16,
    }
  )
}

describe('shape parser', () => {
  it('treats top-center position order consistently for circles', () => {
    const parser = createParser()
    const topCenter = parser.parseCircle('circle(20px at top center)')
    const centerTop = parser.parseCircle('circle(20px at center top)')

    expect(topCenter).toEqual({
      type: 'circle',
      r: 20,
      cx: 100,
      cy: 0,
    })
    expect(centerTop).toEqual(topCenter)
  })

  it('resolves single center token on both axes', () => {
    const parser = createParser()
    const centered = parser.parseCircle('circle(20px at center)')

    expect(centered).toEqual({
      type: 'circle',
      r: 20,
      cx: 100,
      cy: 50,
    })
  })

  it('normalizes polygon point spacing', () => {
    const parser = createParser()
    const polygon = parser.parsePolygon(
      'polygon(50%   0, 100%  50%, 50% 100%, 0   50%)'
    )

    expect(polygon).toEqual({
      type: 'polygon',
      'fill-rule': 'nonzero',
      points: '100 0,200 50,100 100,0 50',
    })
  })

  it('supports case-insensitive round keyword for inset', () => {
    const parser = createParser()
    const inset = parser.parseInset('inset(10px 20px ROUND 8px)')

    expect(inset?.type).toBe('path')
  })
})
