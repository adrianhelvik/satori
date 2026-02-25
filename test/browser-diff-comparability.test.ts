import { describe, expect, it } from 'vitest'

import { classifyComparability } from './browser-diff-comparability.js'

describe('classifyComparability', () => {
  it('defaults to comparable when no explicit exceptions are configured', () => {
    expect(
      classifyComparability(
        'test/image.test.tsx :: Image > should support ArrayBuffer as src'
      )
    ).toEqual({ comparable: true })
    expect(
      classifyComparability(
        'test/line-clamp.test.tsx :: Line Clamp > Should work correctly'
      )
    ).toEqual({ comparable: true })
    expect(
      classifyComparability(
        'test/table-layout.test.tsx :: Table Layout > should render mixed rowSpan and colSpan cells'
      )
    ).toEqual({ comparable: true })
  })
})
