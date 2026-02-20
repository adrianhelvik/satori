export const OVERFLOW_EXTENT = 1_000_000

export function resolveOverflowClipBox(
  style: Record<string, string | number>,
  left: number,
  top: number,
  width: number,
  height: number
) {
  const borderLeft = Number(style.borderLeftWidth || 0)
  const borderRight = Number(style.borderRightWidth || 0)
  const borderTop = Number(style.borderTopWidth || 0)
  const borderBottom = Number(style.borderBottomWidth || 0)
  const paddingLeft = Number(style.paddingLeft || 0)
  const paddingRight = Number(style.paddingRight || 0)
  const paddingTop = Number(style.paddingTop || 0)
  const paddingBottom = Number(style.paddingBottom || 0)

  const borderBox = { x: left, y: top, width, height }
  const paddingBox = {
    x: left + borderLeft,
    y: top + borderTop,
    width: Math.max(0, width - borderLeft - borderRight),
    height: Math.max(0, height - borderTop - borderBottom),
  }
  const contentBox = {
    x: left + borderLeft + paddingLeft,
    y: top + borderTop + paddingTop,
    width: Math.max(
      0,
      width - borderLeft - borderRight - paddingLeft - paddingRight
    ),
    height: Math.max(
      0,
      height - borderTop - borderBottom - paddingTop - paddingBottom
    ),
  }

  const box = String(style.overflowClipMarginBox || 'padding-box')
    .trim()
    .toLowerCase()
  if (box === 'content-box') return contentBox
  if (box === 'border-box') return borderBox
  return paddingBox
}

export function parseOverflowClipMargin(
  style: Record<string, string | number>
) {
  if (typeof style.overflowClipMargin === 'number') {
    return Math.max(0, style.overflowClipMargin)
  }
  if (typeof style.overflowClipMargin === 'string') {
    return Math.max(0, Number(style.overflowClipMargin) || 0)
  }
  return 0
}
