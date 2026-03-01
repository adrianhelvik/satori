/**
 * When there is border radius, the content area should be clipped by the
 * inner path of border + padding. This applies to <img> element as well as any
 * child element inside a `overflow: hidden` container.
 */

import { buildXMLString } from '../utils.js'
import border from './border.js'
import {
  OVERFLOW_EXTENT,
  parseOverflowClipMargin,
  resolveOverflowClipBox,
} from './overflow-utils.js'

export default function contentMask(
  {
    id,
    left,
    top,
    width,
    height,
    matrix,
    borderOnly,
    parentOverflowMaskId,
  }: {
    id: string
    left: number
    top: number
    width: number
    height: number
    matrix: string | undefined
    borderOnly?: boolean
    parentOverflowMaskId?: string
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
  const overflowClipMarginBox = String(
    style.overflowClipMarginBox || 'padding-box'
  )
    .trim()
    .toLowerCase()
  const overflowXHidden =
    style.overflow === 'hidden' || style.overflowX === 'hidden'
  const overflowYHidden =
    style.overflow === 'hidden' || style.overflowY === 'hidden'
  const overflowClipMargin = parseOverflowClipMargin(style)
  const keepBorderAreaForClipMarginBox =
    overflowClipMarginBox === 'border-box' && (overflowXClip || overflowYClip)

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
      mask: parentOverflowMaskId ? `url(#${parentOverflowMaskId})` : undefined,
    }) +
      (keepBorderAreaForClipMarginBox
        ? ''
        : border(
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
          ))
  )

  return _contentMask
}
