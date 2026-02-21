import { getBuiltInListMarkerText } from './list-marker-registry.js'

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
  const builtIn = getBuiltInListMarkerText(markerType, index)
  if (typeof builtIn !== 'undefined') {
    return builtIn
  }

  return '\u2022'
}
