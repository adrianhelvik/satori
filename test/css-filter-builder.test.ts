import { describe, expect, it } from 'vitest'

import type { SerializedStyle } from '../src/handler/style-types.js'
import { buildSvgCssFilter } from '../src/builder/css-filter.js'

function createStyle(
  overrides: Partial<SerializedStyle> = {}
): SerializedStyle {
  return {
    color: '#000',
    opacity: 1,
    fontSize: 16,
    ...overrides,
  } as SerializedStyle
}

describe('css filter builder', () => {
  it('should build chained component-transfer primitives', () => {
    const built = buildSvgCssFilter({
      id: 'chain',
      filter: 'brightness(120%) contrast(80%) opacity(50%)',
      style: createStyle(),
      inheritedStyle: createStyle(),
    })

    expect(built).not.toBeNull()
    expect(built!.filterId).toBe('satori_cf-chain')
    expect(built!.unsupported).toEqual([])
    expect(built!.definition.match(/<feComponentTransfer/g)).toHaveLength(3)
    expect(built!.definition).toContain('<feFuncR type="linear" slope="1.2"')
    expect(built!.definition).toContain(
      '<feFuncR type="linear" slope="0.8" intercept="0.09999999999999998"'
    )
    expect(built!.definition).toContain('<feFuncA type="linear" slope="0.5"')
  })

  it('should resolve drop-shadow fallback color from style color', () => {
    const built = buildSvgCssFilter({
      id: 'shadow',
      filter: 'drop-shadow(2px 3px 4px)',
      style: createStyle({ color: 'rgba(5, 6, 7, 0.4)' }),
      inheritedStyle: createStyle(),
    })

    expect(built).not.toBeNull()
    expect(built!.definition).toContain('dx="2"')
    expect(built!.definition).toContain('dy="3"')
    expect(built!.definition).toContain('stdDeviation="2"')
    expect(built!.definition).toContain('flood-color="rgb(5,6,7)"')
    expect(built!.definition).toContain('flood-opacity="0.4"')
  })

  it('should return null when parsed filters yield no primitives', () => {
    const built = buildSvgCssFilter({
      id: 'noop',
      filter: 'blur(0)',
      style: createStyle(),
      inheritedStyle: createStyle(),
    })

    expect(built).toBeNull()
  })
})
