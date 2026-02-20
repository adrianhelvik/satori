/**
 * When there is border radius, the content area should be clipped by the
 * inner path of border + padding. This applies to <img> element as well as any
 * child element inside a `overflow: hidden` container.
 */

import { buildXMLString } from '../utils.js'
import border from './border.js'

function resolveOverflowClipBox(
  style: Record<string, number | string>,
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

export default function contentMask(
  {
    id,
    left,
    top,
    width,
    height,
    matrix,
    borderOnly,
  }: {
    id: string
    left: number
    top: number
    width: number
    height: number
    matrix: string | undefined
    borderOnly?: boolean
  },
  style: Record<string, number | string>
) {
  const offsetLeft =
    ((style.borderLeftWidth as number) || 0) +
    (borderOnly ? 0 : (style.paddingLeft as number) || 0)
  const offsetTop =
    ((style.borderTopWidth as number) || 0) +
    (borderOnly ? 0 : (style.paddingTop as number) || 0)
  const offsetRight =
    ((style.borderRightWidth as number) || 0) +
    (borderOnly ? 0 : (style.paddingRight as number) || 0)
  const offsetBottom =
    ((style.borderBottomWidth as number) || 0) +
    (borderOnly ? 0 : (style.paddingBottom as number) || 0)

  const contentArea = {
    x: left + offsetLeft,
    y: top + offsetTop,
    width: width - offsetLeft - offsetRight,
    height: height - offsetTop - offsetBottom,
  }
  const overflowXClip = style.overflow === 'clip' || style.overflowX === 'clip'
  const overflowYClip = style.overflow === 'clip' || style.overflowY === 'clip'
  const overflowXHidden =
    style.overflow === 'hidden' || style.overflowX === 'hidden'
  const overflowYHidden =
    style.overflow === 'hidden' || style.overflowY === 'hidden'
  const overflowClipMargin =
    typeof style.overflowClipMargin === 'number'
      ? Math.max(0, style.overflowClipMargin)
      : typeof style.overflowClipMargin === 'string'
      ? Math.max(0, Number(style.overflowClipMargin) || 0)
      : 0

  const clipRect = { ...contentArea }
  const clipBox = resolveOverflowClipBox(style, left, top, width, height)
  if (overflowXClip) {
    clipRect.x = clipBox.x
    clipRect.width = clipBox.width
  }
  if (overflowYClip) {
    clipRect.y = clipBox.y
    clipRect.height = clipBox.height
  }

  const OVERFLOW_EXTENT = 1_000_000
  if (overflowXClip && !overflowYClip && !overflowYHidden) {
    clipRect.y = -OVERFLOW_EXTENT
    clipRect.height = OVERFLOW_EXTENT * 2
  } else if (overflowYClip && !overflowXClip && !overflowXHidden) {
    clipRect.x = -OVERFLOW_EXTENT
    clipRect.width = OVERFLOW_EXTENT * 2
  }

  if (overflowClipMargin > 0) {
    if (overflowXClip) {
      clipRect.x -= overflowClipMargin
      clipRect.width += overflowClipMargin * 2
    }
    if (overflowYClip) {
      clipRect.y -= overflowClipMargin
      clipRect.height += overflowClipMargin * 2
    }
  }

  const _contentMask = buildXMLString(
    'mask',
    { id },
    buildXMLString('rect', {
      ...clipRect,
      fill: '#fff',
      // add transformation matrix to mask if overflow clips content AND a
      // transformation style is defined, otherwise children will be clipped
      // incorrectly
      transform:
        (style.overflow === 'hidden' ||
          style.overflow === 'clip' ||
          style.overflowX === 'hidden' ||
          style.overflowX === 'clip' ||
          style.overflowY === 'hidden' ||
          style.overflowY === 'clip') &&
        style.transform &&
        matrix
          ? matrix
          : undefined,
      mask: style._inheritedMaskId
        ? `url(#${style._inheritedMaskId})`
        : undefined,
    }) +
      border(
        {
          left,
          top,
          width,
          height,
          props: {
            transform: matrix ? matrix : undefined,
          },
          asContentMask: true,
          maskBorderOnly: borderOnly,
        },
        style
      )
  )

  return _contentMask
}
