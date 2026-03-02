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
  measureString: (text: string) => number
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

  function measureString(text: string): number {
    if (text.length === 0) return 0

    // Check if any grapheme is an image (emoji) — if so, fall back to
    // per-grapheme measurement since images can't go through the font engine.
    const graphemes = segment(text, 'grapheme', style.locale)
    let hasImage = false
    for (const g of graphemes) {
      if (isImage(g)) {
        hasImage = true
        break
      }
    }

    if (hasImage) {
      return measureText(text)
    }

    // Measure the complete string as a single unit, preserving kerning pairs.
    let width = engine.measure(text, { fontSize, letterSpacing, kerning })

    // Add word-spacing for each space character.
    if (wordSpacing) {
      for (const g of graphemes) {
        if (g === ' ') width += wordSpacing
      }
    }

    return width
  }

  return {
    measureGrapheme,
    measureGraphemeArray,
    measureText,
    measureString,
  }
}
