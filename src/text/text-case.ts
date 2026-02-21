import { segment } from '../utils.js'
import type { Locale } from '../language.js'

const FONT_VARIANT_CAPS_VALUES = new Set([
  'normal',
  'small-caps',
  'all-small-caps',
  'petite-caps',
  'all-petite-caps',
  'unicase',
  'titling-caps',
])

const SYNTHETIC_SMALL_CAPS_VALUES = new Set([
  'small-caps',
  'all-small-caps',
  'petite-caps',
  'all-petite-caps',
])

function normalizeFontVariantCapsToken(value: unknown): string | undefined {
  if (typeof value !== 'string') return
  const normalized = value.trim().toLowerCase()
  if (!FONT_VARIANT_CAPS_VALUES.has(normalized)) return
  return normalized
}

export function resolveFontVariantCapsValue(
  fontVariantCaps: unknown,
  fontVariant: unknown
): string {
  const explicit = normalizeFontVariantCapsToken(fontVariantCaps)
  if (explicit) return explicit

  if (Array.isArray(fontVariant)) {
    for (const token of fontVariant) {
      const normalized = normalizeFontVariantCapsToken(token)
      if (normalized) return normalized
    }
  } else if (typeof fontVariant === 'string') {
    for (const token of fontVariant.split(/\s+/).filter(Boolean)) {
      const normalized = normalizeFontVariantCapsToken(token)
      if (normalized) return normalized
    }
  }

  return 'normal'
}

export function processTextTransform(
  content: string,
  textTransform: unknown,
  fontVariantCaps: unknown,
  fontVariant: unknown,
  locale?: Locale
): string {
  const normalized = typeof textTransform === 'string' ? textTransform : 'none'

  if (normalized === 'uppercase') {
    content = content.toLocaleUpperCase(locale)
  } else if (normalized === 'lowercase') {
    content = content.toLocaleLowerCase(locale)
  } else if (normalized === 'capitalize') {
    content = segment(content, 'word', locale)
      .map((word) =>
        segment(word, 'grapheme', locale)
          .map((grapheme, index) =>
            index === 0 ? grapheme.toLocaleUpperCase(locale) : grapheme
          )
          .join('')
      )
      .join('')
  }

  const normalizedFontVariantCaps = resolveFontVariantCapsValue(
    fontVariantCaps,
    fontVariant
  )
  if (SYNTHETIC_SMALL_CAPS_VALUES.has(normalizedFontVariantCaps)) {
    // Approximation: synthesize small caps by uppercasing content when
    // dedicated small-caps glyphs are unavailable.
    content = content.toLocaleUpperCase(locale)
  }

  return content
}
