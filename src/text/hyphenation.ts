import { segment } from '../utils.js'
import type { Locale } from '../language.js'

export type HyphenateLimitChars = {
  total?: number
  before?: number
  after?: number
}

export function parseHyphenateLimitChars(
  value: unknown
): HyphenateLimitChars | null {
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

export function applyHyphenateLimitChars(
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
