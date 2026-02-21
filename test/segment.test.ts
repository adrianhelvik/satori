import { afterEach, describe, expect, it, vi } from 'vitest'

type SegmenterCall = {
  locale: string | undefined
  granularity: 'word' | 'grapheme'
}

const originalSegmenter = Intl.Segmenter

function installMockSegmenter() {
  const calls: SegmenterCall[] = []

  class MockSegmenter {
    private readonly granularity: 'word' | 'grapheme'

    constructor(
      locale: string | undefined,
      options: { granularity: 'word' | 'grapheme' }
    ) {
      calls.push({ locale, granularity: options.granularity })
      this.granularity = options.granularity
    }

    segment(content: string) {
      if (this.granularity === 'word') {
        return content
          .split(/(\u00a0)/)
          .filter(Boolean)
          .map((segment) => ({ segment }))
      }

      return Array.from(content).map((segment) => ({ segment }))
    }
  }

  ;(Intl as any).Segmenter = MockSegmenter
  return calls
}

afterEach(() => {
  vi.resetModules()

  if (originalSegmenter) {
    ;(Intl as any).Segmenter = originalSegmenter
  } else {
    delete (Intl as any).Segmenter
  }
})

describe('segment', () => {
  it('caches segmenters per normalized locale', async () => {
    const calls = installMockSegmenter()
    const { segment } = await import('../src/utils.js')

    expect(segment('alpha', 'word', 'EN-us')).toEqual(['alpha'])
    expect(segment('beta', 'grapheme', 'en-US')).toEqual(['b', 'e', 't', 'a'])
    expect(segment('gamma', 'word', ' ja ')).toEqual(['gamma'])
    expect(segment('delta', 'word')).toEqual(['delta'])
    expect(segment('eta', 'grapheme')).toEqual(['e', 't', 'a'])
    expect(segment('theta', 'word', 'JA')).toEqual(['theta'])

    expect(calls).toEqual([
      { locale: 'EN-us', granularity: 'word' },
      { locale: 'EN-us', granularity: 'grapheme' },
      { locale: 'ja', granularity: 'word' },
      { locale: 'ja', granularity: 'grapheme' },
      { locale: undefined, granularity: 'word' },
      { locale: undefined, granularity: 'grapheme' },
    ])
  })

  it('keeps non-breaking-space words grouped together', async () => {
    installMockSegmenter()
    const { segment } = await import('../src/utils.js')

    expect(segment('first\u00a0second', 'word', 'en')).toEqual([
      'first\u00a0second',
    ])
  })
})
