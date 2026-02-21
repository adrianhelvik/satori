export type FontVariantPositionToken = 'normal' | 'sub' | 'super'

export type ParsedFontVariantShorthand = {
  tokens: string[]
  fontVariantCaps?: string
  fontVariantPosition?: FontVariantPositionToken
}

export const FONT_VARIANT_CAPS_VALUES = new Set([
  'normal',
  'small-caps',
  'all-small-caps',
  'petite-caps',
  'all-petite-caps',
  'unicase',
  'titling-caps',
])

function normalizeToken(value: unknown): string | undefined {
  if (typeof value !== 'string') return
  const normalized = value.trim().toLowerCase()
  if (!normalized) return
  return normalized
}

function pushNormalizedTokenParts(value: unknown, tokens: string[]): void {
  if (typeof value !== 'string') return
  const normalized = value.trim().toLowerCase()
  if (!normalized) return
  tokens.push(...normalized.split(/\s+/).filter(Boolean))
}

export function tokenizeFontVariant(value: unknown): string[] {
  if (Array.isArray(value)) {
    const tokens: string[] = []
    for (const token of value) {
      pushNormalizedTokenParts(token, tokens)
    }
    return tokens
  }

  if (typeof value === 'string') {
    return value.trim().toLowerCase().split(/\s+/).filter(Boolean)
  }

  return []
}

export function normalizeFontVariantCapsToken(
  value: unknown
): string | undefined {
  const normalized = normalizeToken(value)
  if (!normalized || !FONT_VARIANT_CAPS_VALUES.has(normalized)) return
  return normalized
}

export function normalizeFontVariantPositionToken(
  value: unknown
): FontVariantPositionToken | undefined {
  const normalized = normalizeToken(value)
  if (
    normalized === 'normal' ||
    normalized === 'sub' ||
    normalized === 'super'
  ) {
    return normalized
  }
}

export function resolveFontVariantCapsFromShorthand(
  fontVariant: unknown
): string | undefined {
  return parseFontVariantShorthand(fontVariant).fontVariantCaps
}

export function resolveFontVariantPositionFromShorthand(
  fontVariant: unknown
): FontVariantPositionToken | undefined {
  return parseFontVariantShorthand(fontVariant).fontVariantPosition
}

export function parseFontVariantShorthand(
  fontVariant: unknown
): ParsedFontVariantShorthand {
  const tokens = tokenizeFontVariant(fontVariant)

  let fontVariantCaps: string | undefined
  let fontVariantPosition: FontVariantPositionToken | undefined

  for (const token of tokens) {
    const normalizedCaps = normalizeFontVariantCapsToken(token)
    if (normalizedCaps) {
      fontVariantCaps = normalizedCaps
      continue
    }

    const normalizedPosition = normalizeFontVariantPositionToken(token)
    if (normalizedPosition) {
      fontVariantPosition = normalizedPosition
    }
  }

  return {
    tokens,
    fontVariantCaps,
    fontVariantPosition,
  }
}
