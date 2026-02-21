const POSITION_VALUE_ALIASES: Record<string, string> = {
  fixed: 'absolute',
  // Without a scrolling viewport model, sticky behaves closer to static:
  // offsets should not shift layout in the default, non-scrolled state.
  sticky: 'static',
}

export function normalizePositionValue(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const normalized = value.trim().toLowerCase()
  return POSITION_VALUE_ALIASES[normalized] || normalized
}
