import { describe, expect, it } from 'vitest'

import {
  CSS_ALL_UNSET_INHERITED_PROPS,
  RUNTIME_INHERITED_PROPS,
} from '../src/handler/style-inheritance.js'

describe('style inheritance sets', () => {
  it('includes all CSS all:unset inherited props in runtime inheritance', () => {
    for (const prop of CSS_ALL_UNSET_INHERITED_PROPS) {
      expect(RUNTIME_INHERITED_PROPS.has(prop)).toBe(true)
    }
  })

  it('keeps runtime-only inherited props explicit', () => {
    const runtimeOnly = [...RUNTIME_INHERITED_PROPS]
      .filter((prop) => !CSS_ALL_UNSET_INHERITED_PROPS.has(prop))
      .sort()

    expect(runtimeOnly).toEqual([
      '_inheritedBackgroundClipTextHasBackground',
      '_inheritedBackgroundClipTextPath',
      '_inheritedClipPathId',
      '_inheritedMaskId',
      '_viewportHeight',
      '_viewportWidth',
      'filter',
      'font',
      'fontKerning',
      'opacity',
      'touchAction',
      'transform',
      'userSelect',
    ])
  })
})
