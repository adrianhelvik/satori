import { describe, expect, it } from 'vitest'

import { classifyComparability } from './browser-diff-comparability.js'

describe('classifyComparability', () => {
  it('marks regular test cases as comparable', () => {
    expect(
      classifyComparability(
        'test/basic.test.tsx :: Basic > should render basic div with text'
      )
    ).toEqual({ comparable: true })
  })

  it('excludes image ArrayBuffer runtime-only cases', () => {
    expect(
      classifyComparability(
        'test/image.test.tsx :: Image > should support ArrayBuffer as src'
      )
    ).toEqual({
      comparable: false,
      note: 'ArrayBuffer src is a Satori-only runtime input and cannot be represented in static browser HTML.',
    })
  })

  it('excludes browser-incomparable line-clamp shorthand cases', () => {
    expect(
      classifyComparability(
        'test/line-clamp.test.tsx :: Line Clamp > Should work correctly'
      )
    ).toEqual({
      comparable: false,
      note: 'Satori lineClamp is a custom shorthand with non-browser clamping semantics.',
    })
  })
})
