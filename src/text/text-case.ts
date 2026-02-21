import { segment } from '../utils.js'
import type { Locale } from '../language.js'
import {
  normalizeFontVariantCapsToken,
  resolveFontVariantCapsFromShorthand,
} from './font-variant.js'

const SYNTHETIC_SMALL_CAPS_VALUES = new Set([
  'small-caps',
  'all-small-caps',
  'petite-caps',
  'all-petite-caps',
])

export function resolveFontVariantCapsValue(
  fontVariantCaps: unknown,
  fontVariant: unknown
): string {
  const explicit = normalizeFontVariantCapsToken(fontVariantCaps)
  if (explicit) return explicit

  return resolveFontVariantCapsFromShorthand(fontVariant) || 'normal'
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
