const listStyleTypes = new Set([
  'none',
  'disc',
  'circle',
  'square',
  'decimal',
  'decimal-leading-zero',
  'lower-hexadecimal',
  'lower-alpha',
  'upper-alpha',
  'lower-greek',
  'lower-latin',
  'upper-latin',
  'lower-roman',
  'upper-roman',
  'disclosure-open',
  'disclosure-closed',
])

const listStylePositions = new Set(['inside', 'outside'])

export type ListStylePosition = 'inside' | 'outside'

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

function parseListStyleStringToken(
  value: string | undefined
): string | undefined {
  if (!value) return

  const token = value.trim()
  if (token.length < 2) return

  const quote = token[0]
  if ((quote !== '"' && quote !== "'") || token[token.length - 1] !== quote) {
    return
  }

  return token
    .slice(1, -1)
    .replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, hex: string) => {
      const codePoint = parseInt(hex, 16)
      if (!Number.isFinite(codePoint)) return ''
      try {
        return String.fromCodePoint(codePoint)
      } catch {
        return ''
      }
    })
    .replace(/\\(.)/g, (_, escaped: string) => {
      if (escaped === 'n') return '\n'
      if (escaped === 'r') return '\r'
      if (escaped === 't') return '\t'
      return escaped
    })
}

function toAlphabeticBySymbols(index: number, symbols: string[]): string {
  if (index <= 0 || symbols.length === 0) return '0'

  let result = ''
  let n = index
  while (n > 0) {
    n -= 1
    result = symbols[n % symbols.length] + result
    n = Math.floor(n / symbols.length)
  }
  return result
}

function toAlphabeticIndex(index: number, upper: boolean): string {
  const chars = upper
    ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
    : 'abcdefghijklmnopqrstuvwxyz'.split('')
  return toAlphabeticBySymbols(index, chars)
}

function toRomanIndex(index: number, upper: boolean): string {
  if (index <= 0 || index >= 4000) return String(index)

  const numerals: [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ]

  let n = index
  let result = ''
  for (const [value, symbol] of numerals) {
    while (n >= value) {
      result += symbol
      n -= value
    }
  }

  return upper ? result : result.toLowerCase()
}

export function getListMarkerText(
  type: string | undefined,
  index: number
): string | null {
  const rawType = (type || '').trim()
  const markerString = parseListStyleStringToken(rawType)
  if (typeof markerString === 'string') {
    return markerString
  }

  const markerType = rawType.toLowerCase()
  switch (markerType) {
    case 'none':
      return null
    case 'circle':
      return '\u25e6'
    case 'square':
      return '\u25aa'
    case 'decimal':
      return `${index}.`
    case 'decimal-leading-zero':
      return `${String(index).padStart(2, '0')}.`
    case 'lower-hexadecimal':
      return `${index > 0 ? index.toString(16) : String(index)}.`
    case 'upper-alpha':
    case 'upper-latin':
      return `${toAlphabeticIndex(index, true)}.`
    case 'lower-alpha':
    case 'lower-latin':
      return `${toAlphabeticIndex(index, false)}.`
    case 'lower-greek':
      return `${toAlphabeticBySymbols(index, [
        '\u03b1',
        '\u03b2',
        '\u03b3',
        '\u03b4',
        '\u03b5',
        '\u03b6',
        '\u03b7',
        '\u03b8',
        '\u03b9',
        '\u03ba',
        '\u03bb',
        '\u03bc',
        '\u03bd',
        '\u03be',
        '\u03bf',
        '\u03c0',
        '\u03c1',
        '\u03c3',
        '\u03c4',
        '\u03c5',
        '\u03c6',
        '\u03c7',
        '\u03c8',
        '\u03c9',
      ])}.`
    case 'upper-roman':
      return `${toRomanIndex(index, true)}.`
    case 'lower-roman':
      return `${toRomanIndex(index, false)}.`
    case 'disclosure-open':
      return '\u25be'
    case 'disclosure-closed':
      return '\u25b8'
    case 'disc':
    default:
      return '\u2022'
  }
}
