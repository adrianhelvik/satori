import { describe, expect, it } from 'vitest'

import {
  normalizeConicStops,
  parseConicStopsFromSource,
  parseConicStopOffset,
  resolveConicColorAt,
  resolveConicPosition,
} from '../src/builder/gradient/conic.js'

describe('conic gradient utils', () => {
  it('should parse conic stop offsets across angle units', () => {
    expect(parseConicStopOffset({ value: '180', unit: 'deg' })).toBeCloseTo(
      0.5,
      6
    )
    expect(parseConicStopOffset({ value: '200', unit: 'grad' })).toBeCloseTo(
      0.5,
      6
    )
    expect(parseConicStopOffset({ value: '0.5', unit: 'turn' })).toBeCloseTo(
      0.5,
      6
    )
    expect(
      parseConicStopOffset({ value: `${Math.PI}`, unit: 'rad' })
    ).toBeCloseTo(0.5, 6)
    expect(parseConicStopOffset({ value: '50', unit: '%' })).toBeCloseTo(0.5, 6)
  })

  it('should normalize non-repeating conic stops with implicit offsets', () => {
    const { stops, cycle } = normalizeConicStops(
      [
        { color: 'red', offset: undefined },
        { color: 'blue', offset: undefined },
      ],
      false
    )

    expect(cycle).toBe(1)
    expect(stops[0].offset).toBe(0)
    expect(stops[1].offset).toBe(1)
  })

  it('should derive repeating cycle from the last explicit stop', () => {
    const { stops, cycle } = normalizeConicStops(
      [
        { color: 'red', offset: 0 },
        { color: 'blue', offset: 0.5 },
      ],
      true
    )

    expect(cycle).toBeCloseTo(0.5, 6)
    expect(stops[0].offset).toBe(0)
    expect(stops[stops.length - 1].offset).toBeCloseTo(0.5, 6)
  })

  it('should resolve conic position keywords and percentages', () => {
    const center = resolveConicPosition('center', 100, 80, { fontSize: 16 })
    expect(center).toEqual({ x: 50, y: 40 })

    const topLeft = resolveConicPosition('top left', 100, 80, { fontSize: 16 })
    expect(topLeft).toEqual({ x: 0, y: 0 })

    const percent = resolveConicPosition('25% 75%', 200, 80, { fontSize: 16 })
    expect(percent.x).toBeCloseTo(50, 6)
    expect(percent.y).toBeCloseTo(60, 6)
  })

  it('should interpolate colors at conic offsets', () => {
    const { stops, cycle } = normalizeConicStops(
      [
        { color: 'rgb(255,0,0)', offset: 0 },
        { color: 'rgb(0,0,255)', offset: 1 },
      ],
      false
    )

    const mid = resolveConicColorAt(0.5, stops, false, cycle)
    expect(mid.color).toContain('rgb(')
    expect(mid.opacity).toBeUndefined()
  })

  it('should parse multi-position conic stops from source text', () => {
    const stops = parseConicStopsFromSource(
      'repeating-conic-gradient(from 30deg at center, red 0deg 30deg, blue 30deg 60deg)'
    )
    expect(stops).toEqual([
      { color: 'red', offset: 0 },
      { color: 'red', offset: 30 / 360 },
      { color: 'blue', offset: 30 / 360 },
      { color: 'blue', offset: 60 / 360 },
    ])
  })
})
