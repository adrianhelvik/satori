import { Locale } from '../language.js'
import { isNumber, segment, splitByBreakOpportunities } from '../utils.js'
import { HorizontalEllipsis, Space } from './characters.js'
import { SerializedStyle } from '../handler/expand.js'

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
  const { textTransform, whiteSpace, wordBreak, overflowWrap, hyphens } = style

  content = processTextTransform(content, textTransform, locale)

  const {
    content: processedContent,
    shouldCollapseTabsAndSpaces,
    allowSoftWrap,
  } = processWhiteSpace(content, whiteSpace)

  const { words, requiredBreaks, softHyphenBreaks, allowBreakWord } =
    processWordBreak(processedContent, wordBreak, overflowWrap, hyphens)

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

  return content
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
  hyphens?: unknown
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

  const allowBreakWord =
    ['break-all', 'break-word'].includes(normalizedWordBreak) ||
    ['break-word', 'anywhere'].includes(normalizedOverflowWrap)

  if (normalizedHyphens === 'none') {
    content = content.replace(/\u00ad/g, '')
  }

  const { words, requiredBreaks, softHyphenBreaks } = splitByBreakOpportunities(
    content,
    normalizedWordBreak
  )

  return { words, requiredBreaks, softHyphenBreaks, allowBreakWord }
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
