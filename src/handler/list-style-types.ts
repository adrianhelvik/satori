// Central list-style keyword registry used by parsing/classification.
// Keep this as the source of truth to avoid drift between helpers.
export const orderedListStyleTypes = new Set([
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

const unorderedListStyleTypes = new Set([
  'none',
  'disc',
  'circle',
  'square',
  'disclosure-open',
  'disclosure-closed',
])

export const listStyleTypes = new Set([
  ...unorderedListStyleTypes,
  ...orderedListStyleTypes,
])
