export type CanonicalDisplay = 'flex' | 'contents' | 'none'

export const DISPLAY_VALUE_TO_CANONICAL: Record<string, CanonicalDisplay> = {
  flex: 'flex',
  block: 'flex',
  inline: 'flex',
  'flow-root': 'flex',
  'inline-block': 'flex',
  'inline-flex': 'flex',
  'list-item': 'flex',
  grid: 'flex',
  'inline-grid': 'flex',
  table: 'flex',
  'inline-table': 'flex',
  'table-row-group': 'flex',
  'table-header-group': 'flex',
  'table-footer-group': 'flex',
  'table-row': 'flex',
  'table-cell': 'flex',
  'table-column-group': 'flex',
  'table-column': 'flex',
  'table-caption': 'flex',
  contents: 'contents',
  none: 'none',
  '-webkit-box': 'flex',
}

export function normalizeDisplayValue(value: unknown): string {
  if (typeof value === 'undefined' || value === null) return ''
  return String(value).trim().toLowerCase()
}

export function isSupportedDisplayValue(value: unknown): boolean {
  const normalized = normalizeDisplayValue(value)
  return normalized in DISPLAY_VALUE_TO_CANONICAL
}
