export type FontVariantPositionToken = 'normal' | 'sub' | 'super'

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
  const tokens = tokenizeFontVariant(fontVariant)
  for (const token of tokens) {
    const normalized = normalizeFontVariantCapsToken(token)
    if (normalized) return normalized
  }
}

export function resolveFontVariantPositionFromShorthand(
  fontVariant: unknown
): FontVariantPositionToken | undefined {
  const tokens = tokenizeFontVariant(fontVariant)
  for (const token of tokens) {
    const normalized = normalizeFontVariantPositionToken(token)
    if (normalized) return normalized
  }
}
