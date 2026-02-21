import { describe, expect, it } from 'vitest'

import {
  CSS_ALL_INITIAL_STYLE,
  CSS_ALL_UNSET_INHERITED_PROP_NAMES,
} from '../src/handler/style-reset-config.js'

describe('style reset config', () => {
  it('keeps all:unset inherited property names unique', () => {
    const unique = new Set(CSS_ALL_UNSET_INHERITED_PROP_NAMES)
    expect(unique.size).toBe(CSS_ALL_UNSET_INHERITED_PROP_NAMES.length)
  })

  it('defines stable defaults for all: initial reset', () => {
    expect(CSS_ALL_INITIAL_STYLE.fontFamily).toEqual(['serif'])
    expect(CSS_ALL_INITIAL_STYLE.fontVariant).toBe('normal')
    expect(CSS_ALL_INITIAL_STYLE.hyphenateLimitChars).toBe('auto')
    expect(CSS_ALL_INITIAL_STYLE.listStyleType).toBe('disc')
    expect(CSS_ALL_INITIAL_STYLE.opacity).toBe(1)
    expect(CSS_ALL_INITIAL_STYLE.backgroundColor).toBe('transparent')
  })
})
