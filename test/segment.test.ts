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
    private readonly locale?: string

    constructor(
      locale: string | undefined,
      options: { granularity: 'word' | 'grapheme' }
    ) {
      calls.push({ locale, granularity: options.granularity })
      this.granularity = options.granularity
      this.locale = locale
    }

    segment(content: string) {
      if (this.granularity === 'word') {
        if (this.locale?.toLowerCase().startsWith('th')) {
          return Array.from(content).map((segment) => ({ segment }))
        }

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
  vi.unmock('linebreak')

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

  it('falls back to locale word segmentation for no-break normal text', async () => {
    vi.doMock('linebreak', () => ({
      default: class {
        private position: number
        private done = false
        private content: string

        constructor(content: string) {
          this.position = content.length
          this.content = content
        }

        nextBreak() {
          if (this.done) return null
          this.done = true
          return {
            position: this.content.length,
            required: false,
          }
        }
      },
    }))

    const { splitByBreakOpportunities } = await import('../src/utils.js')
    const thaiWords = (await import('../src/utils.js')).segment(
      'ภาษาไทย',
      'word',
      'th-TH'
    )

    expect(splitByBreakOpportunities('ภาษาไทย', 'normal', 'th-TH')).toEqual({
      words: thaiWords,
      requiredBreaks: thaiWords.map(() => false),
      softHyphenBreaks: thaiWords.map(() => false),
    })
  })

  it('does not change ASCII word break behavior without Thai locale', async () => {
    const { splitByBreakOpportunities } = await import('../src/utils.js')

    expect(splitByBreakOpportunities('hello', 'normal', 'en-US')).toEqual({
      words: ['hello'],
      requiredBreaks: [false, false],
      softHyphenBreaks: [false, false],
    })
  })

  it('falls back to grapheme segmentation for non-ASCII no-break normal text', async () => {
    vi.doMock('linebreak', () => ({
      default: class {
        private position: number
        private done = false
        private content: string

        constructor(content: string) {
          this.position = content.length
          this.content = content
        }

        nextBreak() {
          if (this.done) return null
          this.done = true
          return {
            position: this.content.length,
            required: false,
          }
        }
      },
    }))

    const { splitByBreakOpportunities, segment } = await import(
      '../src/utils.js'
    )
    const content = '안녕하세요'
    const graphemeWords = segment(content, 'grapheme', 'ko-KR')

    expect(splitByBreakOpportunities(content, 'normal', 'ko-KR')).toEqual({
      words: graphemeWords,
      requiredBreaks: graphemeWords.map(() => false),
      softHyphenBreaks: graphemeWords.map(() => false),
    })
  })

  it('falls back to grapheme segmentation for emoji without word-break opportunities', async () => {
    vi.doMock('linebreak', () => ({
      default: class {
        private done = false
        private content: string

        constructor(content: string) {
          this.content = content
        }

        nextBreak() {
          if (this.done) return null
          this.done = true
          return {
            position: this.content.length,
            required: false,
          }
        }
      },
    }))

    const { splitByBreakOpportunities, segment } = await import(
      '../src/utils.js'
    )
    const content = '👨‍👩‍👧👶🏾'
    const graphemeWords = segment(content, 'grapheme', 'en-US')

    expect(splitByBreakOpportunities(content, 'normal', 'en-US')).toEqual({
      words: graphemeWords,
      requiredBreaks: graphemeWords.map(() => false),
      softHyphenBreaks: graphemeWords.map(() => false),
    })
  })
})
