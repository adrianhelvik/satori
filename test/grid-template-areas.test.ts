import { describe, expect, it } from 'vitest'

import {
  parseGridTemplateAreas,
  resolveGridTemplateAreaPlacements,
} from '../src/grid-template-areas.js'

describe('grid template areas', () => {
  it('parses quoted template rows', () => {
    const rows = parseGridTemplateAreas(
      '"header header" "sidebar content" "footer footer"'
    )

    expect(rows).toEqual([
      ['header', 'header'],
      ['sidebar', 'content'],
      ['footer', 'footer'],
    ])
  })

  it('treats invalid row lengths as an invalid declaration', () => {
    const rows = parseGridTemplateAreas('"a a" "b"')
    expect(rows).toEqual([])
  })

  it('resolves rectangular named area placements', () => {
    const placements = resolveGridTemplateAreaPlacements(
      parseGridTemplateAreas('"hero hero" "side body"')
    )

    expect(placements.get('hero')).toEqual({
      row: { start: 0, span: 1 },
      column: { start: 0, span: 2 },
    })
    expect(placements.get('side')).toEqual({
      row: { start: 1, span: 1 },
      column: { start: 0, span: 1 },
    })
    expect(placements.get('body')).toEqual({
      row: { start: 1, span: 1 },
      column: { start: 1, span: 1 },
    })
  })

  it('ignores dot placeholders in placements', () => {
    const placements = resolveGridTemplateAreaPlacements(
      parseGridTemplateAreas('"a ." ". b"')
    )

    expect(Array.from(placements.keys())).toEqual(['a', 'b'])
  })

  it('invalidates non-rectangular named areas', () => {
    const placements = resolveGridTemplateAreaPlacements(
      parseGridTemplateAreas('"a a" "a b"')
    )

    expect(placements.size).toBe(0)
  })
})
