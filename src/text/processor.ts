import { Locale } from '../language.js'
import { isNumber, segment, splitByBreakOpportunities } from '../utils.js'
import { HorizontalEllipsis, Space } from './characters.js'
import type { SerializedStyle } from '../handler/style-types.js'

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

export function preprocess(
  content: string,
  style: SerializedStyle,
  locale?: Locale
): {
  words: string[]
  requiredBreaks: boolean[]
  softHyphenBreaks: boolean[]
  allowSoftWrap: boolean
  allowBreakWord: boolean
  processedContent: string
  shouldCollapseTabsAndSpaces: boolean
  lineLimit: number
  blockEllipsis: string
} {
  const {
    textTransform,
    fontVariantCaps,
    fontVariant,
    whiteSpace,
    wordBreak,
    overflowWrap,
    hyphens,
    hyphenateLimitChars,
    lineBreak,
  } = style

  content = processTextTransform(
    content,
    textTransform,
    fontVariantCaps,
    fontVariant,
    locale
  )

  const {
    content: processedContent,
    shouldCollapseTabsAndSpaces,
    allowSoftWrap,
  } = processWhiteSpace(content, whiteSpace)

  const { words, requiredBreaks, softHyphenBreaks, allowBreakWord } =
    processWordBreak(
      processedContent,
      wordBreak,
      overflowWrap,
      hyphens,
      hyphenateLimitChars,
      locale,
      lineBreak
    )

  const [lineLimit, blockEllipsis] = processTextOverflow(style, allowSoftWrap)

  return {
    words,
    requiredBreaks,
    softHyphenBreaks,
    allowSoftWrap,
    allowBreakWord,
    processedContent,
    shouldCollapseTabsAndSpaces,
    lineLimit,
    blockEllipsis,
  }
}

function processTextTransform(
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
      // For each word...
      .map((word) => {
        // ...split into graphemes...
        return segment(word, 'grapheme', locale)
          .map((grapheme, index) => {
            // ...and make the first grapheme uppercase
            return index === 0 ? grapheme.toLocaleUpperCase(locale) : grapheme
          })
          .join('')
      })
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

function normalizeFontVariantCapsToken(value: unknown): string | undefined {
  if (typeof value !== 'string') return
  const normalized = value.trim().toLowerCase()
  if (!FONT_VARIANT_CAPS_VALUES.has(normalized)) return
  return normalized
}

function resolveFontVariantCapsValue(
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

function processTextOverflow(
  style: SerializedStyle,
  allowSoftWrap: boolean
): [number, string?] {
  const {
    textOverflow,
    lineClamp,
    WebkitLineClamp,
    WebkitBoxOrient,
    overflow,
    display,
  } = style

  if (
    display === 'block' &&
    (typeof lineClamp === 'number' || typeof lineClamp === 'string')
  ) {
    const [lineLimit, blockEllipsis = HorizontalEllipsis] =
      parseLineClamp(lineClamp)
    if (lineLimit) {
      return [lineLimit, blockEllipsis]
    }
  }

  if (
    textOverflow === 'ellipsis' &&
    display === '-webkit-box' &&
    WebkitBoxOrient === 'vertical' &&
    isNumber(WebkitLineClamp) &&
    WebkitLineClamp > 0
  ) {
    return [WebkitLineClamp, HorizontalEllipsis]
  }

  if (
    textOverflow === 'ellipsis' &&
    (overflow === 'hidden' || overflow === 'clip') &&
    !allowSoftWrap
  ) {
    return [1, HorizontalEllipsis]
  }

  return [Infinity]
}

function processWordBreak(
  content,
  wordBreak: unknown,
  overflowWrap?: unknown,
  hyphens?: unknown,
  hyphenateLimitChars?: unknown,
  locale?: Locale,
  lineBreak?: unknown
): {
  words: string[]
  requiredBreaks: boolean[]
  softHyphenBreaks: boolean[]
  allowBreakWord: boolean
} {
  const normalizedWordBreak =
    typeof wordBreak === 'string' ? wordBreak : 'normal'
  const normalizedOverflowWrap =
    typeof overflowWrap === 'string' ? overflowWrap : 'normal'
  const normalizedHyphens =
    typeof hyphens === 'string' ? hyphens.trim().toLowerCase() : 'manual'
  const normalizedLineBreak =
    typeof lineBreak === 'string' ? lineBreak.trim().toLowerCase() : 'auto'
  const effectiveWordBreak =
    normalizedLineBreak === 'anywhere' && normalizedWordBreak === 'normal'
      ? 'break-all'
      : normalizedWordBreak

  const allowBreakWord =
    ['break-all', 'break-word'].includes(effectiveWordBreak) ||
    ['break-word', 'anywhere'].includes(normalizedOverflowWrap)

  if (normalizedHyphens === 'none') {
    content = content.replace(/\u00ad/g, '')
  }

  const { words, requiredBreaks, softHyphenBreaks } = splitByBreakOpportunities(
    content,
    effectiveWordBreak
  )
  applyHyphenateLimitChars(
    words,
    requiredBreaks,
    softHyphenBreaks,
    parseHyphenateLimitChars(hyphenateLimitChars),
    locale
  )

  return { words, requiredBreaks, softHyphenBreaks, allowBreakWord }
}

type HyphenateLimitChars = {
  total?: number
  before?: number
  after?: number
}

function parseHyphenateLimitChars(value: unknown): HyphenateLimitChars | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? { total: value } : null
  }

  if (typeof value !== 'string') return null

  const tokens = value.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!tokens.length || (tokens.length === 1 && tokens[0] === 'auto')) {
    return null
  }
  if (tokens.length > 3) return null

  const parsedTokens: Array<number | undefined> = []
  for (const token of tokens) {
    if (token === 'auto') {
      parsedTokens.push(undefined)
      continue
    }
    if (!/^\d+$/.test(token)) return null
    const parsed = Number.parseInt(token, 10)
    if (parsed <= 0) return null
    parsedTokens.push(parsed)
  }

  if (parsedTokens.length === 1) {
    return { total: parsedTokens[0] }
  }
  if (parsedTokens.length === 2) {
    return {
      total: parsedTokens[0],
      before: parsedTokens[1],
    }
  }
  return {
    total: parsedTokens[0],
    before: parsedTokens[1],
    after: parsedTokens[2],
  }
}

function countGraphemes(value: string, locale?: Locale): number {
  if (!value) return 0
  return segment(value, 'grapheme', locale).length
}

function shouldKeepSoftHyphenBreak(
  previousWord: string,
  nextWord: string,
  limits: HyphenateLimitChars,
  locale?: Locale
): boolean {
  const before = countGraphemes(previousWord, locale)
  const after = countGraphemes(nextWord, locale)
  const total = before + after

  if (typeof limits.total === 'number' && total < limits.total) {
    return false
  }
  if (typeof limits.before === 'number' && before < limits.before) {
    return false
  }
  if (typeof limits.after === 'number' && after < limits.after) {
    return false
  }

  return true
}

function applyHyphenateLimitChars(
  words: string[],
  requiredBreaks: boolean[],
  softHyphenBreaks: boolean[],
  limits: HyphenateLimitChars | null,
  locale?: Locale
) {
  if (!limits) return

  for (let i = 1; i < words.length; i++) {
    if (!softHyphenBreaks[i]) continue

    const previousWord = words[i - 1] || ''
    const nextWord = words[i] || ''
    if (shouldKeepSoftHyphenBreak(previousWord, nextWord, limits, locale)) {
      continue
    }

    words[i - 1] = previousWord + nextWord
    words.splice(i, 1)
    requiredBreaks.splice(i, 1)
    softHyphenBreaks.splice(i, 1)
    i -= 1
  }
}

function processWhiteSpace(
  content: string,
  whiteSpace: unknown
): {
  content: string
  shouldCollapseTabsAndSpaces: boolean
  allowSoftWrap: boolean
} {
  const normalized = typeof whiteSpace === 'string' ? whiteSpace : 'normal'

  const shouldKeepLinebreak = ['pre', 'pre-wrap', 'pre-line'].includes(
    normalized
  )

  const shouldCollapseTabsAndSpaces = ['normal', 'nowrap', 'pre-line'].includes(
    normalized
  )

  const allowSoftWrap = !['pre', 'nowrap'].includes(normalized)

  if (!shouldKeepLinebreak) {
    content = content.replace(/\n/g, Space)
  }

  if (shouldCollapseTabsAndSpaces) {
    content = content.replace(/([ ]|\t)+/g, Space).replace(/^[ ]|[ ]$/g, '')
  }

  return { content, shouldCollapseTabsAndSpaces, allowSoftWrap }
}

function parseLineClamp(input: number | string): [number?, string?] {
  if (typeof input === 'number') return [input]

  const regex1 = /^(\d+)\s*"(.*)"$/
  const regex2 = /^(\d+)\s*'(.*)'$/
  const match1 = regex1.exec(input)
  const match2 = regex2.exec(input)

  if (match1) {
    const number = +match1[1]
    const text = match1[2]

    return [number, text]
  } else if (match2) {
    const number = +match2[1]
    const text = match2[2]

    return [number, text]
  }

  return []
}
