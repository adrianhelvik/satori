import { FontEngine } from '../font.js'
import { segment } from '../utils.js'

export function genMeasurer(
  engine: FontEngine,
  isImage: (grapheme: string) => boolean,
  style: {
    fontSize: number
    letterSpacing: number
    wordSpacing?: number
    kerning?: boolean
    locale?: string
  }
): {
  measureGrapheme: (grapheme: string) => number
  measureGraphemeArray: (graphemes: string[]) => number
  measureText: (text: string) => number
} {
  const { fontSize, letterSpacing, wordSpacing = 0, kerning = true } = style

  const cache = new Map<string, number>()

  function measureGrapheme(grapheme: string): number {
    if (cache.has(grapheme)) {
      return cache.get(grapheme)
    }

    let width = engine.measure(grapheme, { fontSize, letterSpacing, kerning })
    // word-spacing: add extra space for each space character
    if (wordSpacing && grapheme === ' ') {
      width += wordSpacing
    }
    cache.set(grapheme, width)

    return width
  }

  function measureGraphemeArray(graphemes: string[]): number {
    let width = 0

    for (const grapheme of graphemes) {
      if (isImage(grapheme)) {
        width += fontSize
      } else {
        width += measureGrapheme(grapheme)
      }
    }

    return width
  }

  function measureText(text: string): number {
    let width = 0
    for (const grapheme of segment(text, 'grapheme', style.locale)) {
      width += isImage(grapheme) ? fontSize : measureGrapheme(grapheme)
    }
    return width
  }

  return {
    measureGrapheme,
    measureGraphemeArray,
    measureText,
  }
}
