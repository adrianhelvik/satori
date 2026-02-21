export function isClippedOverflow(value: unknown): boolean {
  return (
    value === 'hidden' ||
    value === 'clip' ||
    value === 'auto' ||
    value === 'scroll'
  )
}
