import { describe, expect, it } from 'vitest'

import {
  parseGridAxisPlacement,
  parseGridTemplateAreas,
  parseGridTrackList,
} from '../src/grid-layout.js'

describe('grid layout utils', () => {
  it('parses common grid track tokens', () => {
    const tracks = parseGridTrackList('100px 1fr 2fr 25%')
    expect(tracks).toEqual([
      { kind: 'fixed', value: 100 },
      { kind: 'fr', value: 1 },
      { kind: 'fr', value: 2 },
      { kind: 'percent', value: 0.25 },
    ])
  })

  it('accepts numeric track values from JSX styles', () => {
    const tracks = parseGridTrackList(30)
    expect(tracks).toEqual([{ kind: 'fixed', value: 30 }])
  })

  it('expands repeat() in track definitions', () => {
    const tracks = parseGridTrackList('repeat(3, 20px 1fr)')
    expect(tracks).toEqual([
      { kind: 'fixed', value: 20 },
      { kind: 'fr', value: 1 },
      { kind: 'fixed', value: 20 },
      { kind: 'fr', value: 1 },
      { kind: 'fixed', value: 20 },
      { kind: 'fr', value: 1 },
    ])
  })

  it('parses explicit start/end placement', () => {
    const placement = parseGridAxisPlacement('2 / 4', undefined, undefined)
    expect(placement).toEqual({
      start: 1,
      span: 2,
    })
  })

  it('parses span shorthand placement', () => {
    const placement = parseGridAxisPlacement(
      'auto / span 3',
      undefined,
      undefined
    )
    expect(placement).toEqual({
      start: undefined,
      span: 3,
    })
  })

  it('prefers explicit start/end properties over shorthand', () => {
    const placement = parseGridAxisPlacement('1 / 2', '3', '5')
    expect(placement).toEqual({
      start: 2,
      span: 2,
    })
  })

  it('supports negative grid line indexes relative to explicit tracks', () => {
    const placement = parseGridAxisPlacement('-2 / -1', undefined, undefined, 3)
    expect(placement).toEqual({
      start: 2,
      span: 1,
    })
  })

  it('supports end-only negative line placement', () => {
    const placement = parseGridAxisPlacement(
      'auto / -1',
      undefined,
      undefined,
      4
    )
    expect(placement).toEqual({
      start: 3,
      span: 1,
    })
  })

  it('parses quoted grid-template-areas rows', () => {
    const rows = parseGridTemplateAreas(
      '"header header" "sidebar content" "footer footer"'
    )
    expect(rows).toEqual([
      ['header', 'header'],
      ['sidebar', 'content'],
      ['footer', 'footer'],
    ])
  })

  it('returns empty rows for invalid grid-template-areas declarations', () => {
    const rows = parseGridTemplateAreas('"a a" "b"')
    expect(rows).toEqual([])
  })
})
