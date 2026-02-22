import { describe, expect, it } from 'vitest'

import { parseFilterList } from '../src/parser/filter.js'

describe('filter parser', () => {
  it('parses supported numeric filter functions', () => {
    const parsed = parseFilterList(
      'brightness(120%) contrast(0.8) saturate(150%) grayscale(25%) opacity(40%) blur(2px)'
    )

    expect(parsed.unsupported).toEqual([])
    expect(parsed.filters).toEqual([
      { type: 'brightness', amount: 1.2 },
      { type: 'contrast', amount: 0.8 },
      { type: 'saturate', amount: 1.5 },
      { type: 'grayscale', amount: 0.25 },
      { type: 'opacity', amount: 0.4 },
      { type: 'blur', radius: '2px' },
    ])
  })

  it('parses drop-shadow with color and blur radius', () => {
    const parsed = parseFilterList(
      'drop-shadow(rgba(0, 0, 255, 0.5) 4px 6px 8px)'
    )

    expect(parsed.unsupported).toEqual([])
    expect(parsed.filters).toEqual([
      {
        type: 'drop-shadow',
        color: 'rgba(0, 0, 255, 0.5)',
        offsetX: '4px',
        offsetY: '6px',
        blurRadius: '8px',
      },
    ])
  })

  it('captures unsupported filter functions deterministically', () => {
    const parsed = parseFilterList('sepia(1) hue-rotate(45deg) blur(3px)')

    expect(parsed.filters).toEqual([{ type: 'blur', radius: '3px' }])
    expect(parsed.unsupported).toEqual(['sepia(1)', 'hue-rotate(45deg)'])
  })
})
