import { describe, expect, it } from 'vitest'

import satori from '../src/index.js'
import expand from '../src/handler/expand.js'
import { preprocess } from '../src/text/processor.js'
import { initFonts, toImage } from './utils.js'

describe('hyphens', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should keep soft hyphen discretionary by default', () => {
    const result = preprocess('co\u00adoperate', {
      whiteSpace: 'normal',
      wordBreak: 'normal',
    } as any)

    expect(result.words.join('')).toBe('cooperate')
    expect(result.words.some((word) => word.includes('\u00ad'))).toBe(false)
    expect(result.softHyphenBreaks.some(Boolean)).toBe(true)
  })

  it('should disable soft hyphen opportunities when hyphens is none', () => {
    const result = preprocess('co\u00adoperate', {
      whiteSpace: 'normal',
      wordBreak: 'normal',
      hyphens: 'none',
    } as any)

    expect(result.words.join('')).toBe('cooperate')
    expect(result.words.some((word) => word.includes('\u00ad'))).toBe(false)
    expect(result.softHyphenBreaks.some(Boolean)).toBe(false)
  })

  it('should keep soft hyphen opportunities when hyphenate-limit-chars allows them', () => {
    const result = preprocess('co\u00adoperate', {
      whiteSpace: 'normal',
      wordBreak: 'normal',
      hyphenateLimitChars: '8 2 3',
    } as any)

    expect(result.words).toEqual(['co', 'operate'])
    expect(result.softHyphenBreaks).toEqual([false, true, false])
  })

  it('should remove disallowed soft hyphen opportunities with hyphenate-limit-chars', () => {
    const result = preprocess('co\u00adoperate', {
      whiteSpace: 'normal',
      wordBreak: 'normal',
      hyphenateLimitChars: '8 3 3',
    } as any)

    expect(result.words).toEqual(['cooperate'])
    expect(result.softHyphenBreaks).toEqual([false, false])
  })

  it('should ignore invalid hyphenate-limit-chars values', () => {
    const result = preprocess('co\u00adoperate', {
      whiteSpace: 'normal',
      wordBreak: 'normal',
      hyphenateLimitChars: 'invalid',
    } as any)

    expect(result.words).toEqual(['co', 'operate'])
    expect(result.softHyphenBreaks).toEqual([false, true, false])
  })

  it('should preserve hyphenateLimitChars in style expansion', () => {
    const expanded = expand({ hyphenateLimitChars: '8 3 3' } as any, {
      color: 'black',
      fontSize: 16,
      opacity: 1,
    })

    expect(expanded.hyphenateLimitChars).toBe('8 3 3')
  })

  it('should hide soft hyphen when no break is taken', async () => {
    const svg = await satori(
      <div
        style={{
          width: 220,
          height: 120,
          backgroundColor: 'white',
          fontFamily: 'Playfair Display',
          fontSize: 28,
          lineHeight: 1.2,
        }}
      >
        {'co\u00adoperate'}
      </div>,
      { width: 220, height: 120, fonts }
    )

    expect(toImage(svg, 220)).toMatchImageSnapshot()
  })

  it('should render a hyphen when wrapping at soft hyphen', async () => {
    const svg = await satori(
      <div
        style={{
          width: 80,
          height: 120,
          backgroundColor: 'white',
          fontFamily: 'Playfair Display',
          fontSize: 28,
          lineHeight: 1.2,
        }}
      >
        {'co\u00adoperate'}
      </div>,
      { width: 80, height: 120, fonts }
    )

    expect(toImage(svg, 80)).toMatchImageSnapshot()
  })

  it('should ignore soft hyphen wrapping when hyphens is none', async () => {
    const svg = await satori(
      <div
        style={{
          width: 80,
          height: 120,
          backgroundColor: 'white',
          fontFamily: 'Playfair Display',
          fontSize: 28,
          lineHeight: 1.2,
          hyphens: 'none',
        }}
      >
        {'co\u00adoperate'}
      </div>,
      { width: 80, height: 120, fonts }
    )

    expect(toImage(svg, 80)).toMatchImageSnapshot()
  })

  it('should support hyphenateCharacter overrides on discretionary breaks', async () => {
    const svg = await satori(
      <div
        style={{
          width: 80,
          height: 120,
          backgroundColor: 'white',
          fontFamily: 'Playfair Display',
          fontSize: 28,
          lineHeight: 1.2,
          hyphenateCharacter: '"="',
        }}
      >
        {'co\u00adoperate'}
      </div>,
      { width: 80, height: 120, fonts }
    )

    expect(toImage(svg, 80)).toMatchImageSnapshot()
  })
})
