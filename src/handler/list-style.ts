const listStyleTypes = new Set([
  'none',
  'disc',
  'circle',
  'square',
  'decimal',
  'decimal-leading-zero',
  'lower-hexadecimal',
  'upper-hexadecimal',
  'armenian',
  'lower-armenian',
  'upper-armenian',
  'georgian',
  'lower-alpha',
  'upper-alpha',
  'lower-cyrillic',
  'upper-cyrillic',
  'lower-greek',
  'hiragana',
  'katakana',
  'lower-latin',
  'upper-latin',
  'lower-roman',
  'upper-roman',
  'disclosure-open',
  'disclosure-closed',
])

const orderedListStyleTypes = new Set([
  'decimal',
  'decimal-leading-zero',
  'lower-hexadecimal',
  'upper-hexadecimal',
  'armenian',
  'lower-armenian',
  'upper-armenian',
  'georgian',
  'lower-alpha',
  'upper-alpha',
  'lower-cyrillic',
  'upper-cyrillic',
  'lower-latin',
  'upper-latin',
  'lower-greek',
  'hiragana',
  'katakana',
  'lower-roman',
  'upper-roman',
])

const listStylePositions = new Set(['inside', 'outside'])

export type ListStylePosition = 'inside' | 'outside'

export function isOrderedListMarkerType(type: string | undefined): boolean {
  const normalized = (type || '').trim().toLowerCase()
  return orderedListStyleTypes.has(normalized)
}

export function parseListStyleTypeValue(
  value: string | number
): string | undefined {
  const token = String(value).trim()
  if (!token) return

  const normalized = token.toLowerCase()
  if (listStyleTypes.has(normalized)) {
    return normalized
  }

  const quote = token[0]
  if (
    token.length >= 2 &&
    (quote === '"' || quote === "'") &&
    token[token.length - 1] === quote
  ) {
    // CSS list-style-type allows string markers (`"->"` / "'#'").
    return token
  }
}

export function parseListStylePositionValue(
  value: string | number
): ListStylePosition | undefined {
  const normalized = String(value).trim().toLowerCase()
  if (listStylePositions.has(normalized)) {
    return normalized as ListStylePosition
  }
}

export function parseListStyleShorthand(value: string | number): {
  listStyleType?: string
  listStylePosition?: ListStylePosition
  listStyleImage?: string
} {
  const parsed: {
    listStyleType?: string
    listStylePosition?: ListStylePosition
    listStyleImage?: string
  } = {}
  const input = String(value).trim()
  if (!input) return parsed

  const tokens = input.match(/url\([^)]+\)|"[^"]*"|'[^']*'|\S+/g) || []
  for (const rawToken of tokens) {
    const token = rawToken.trim()
    const normalized = token.toLowerCase()

    if (normalized.startsWith('url(')) {
      parsed.listStyleImage = token
      continue
    }

    if (listStylePositions.has(normalized)) {
      parsed.listStylePosition = normalized as ListStylePosition
      continue
    }

    const parsedType = parseListStyleTypeValue(token)
    if (parsedType) {
      parsed.listStyleType = parsedType
    }
  }

  return parsed
}
export { getListMarkerText } from './list-marker-text.js'
