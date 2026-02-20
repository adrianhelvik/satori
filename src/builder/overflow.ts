/**
 * Generate clip path for the given element.
 */

import { buildXMLString } from '../utils.js'
import mask from './content-mask.js'
import { buildClipPath, genClipPathId } from './clip-path.js'

export default function overflow(
  {
    left,
    top,
    width,
    height,
    path,
    matrix,
    id,
    currentClipPath,
    src,
  }: {
    left: number
    top: number
    width: number
    height: number
    path: string
    matrix: string | undefined
    id: string
    currentClipPath: string | string
    src?: string
  },
  style: Record<string, string | number>,
  inheritableStyle: Record<string, string | number>
) {
  let overflowClipPath = ''
  const clipPath =
    style.clipPath && style.clipPath !== 'none'
      ? buildClipPath(
          { left, top, width, height, path, id, matrix, currentClipPath, src },
          style as Record<string, number>,
          inheritableStyle
        )
      : ''

  const overflowHidden = style.overflow === 'hidden'
  const overflowXHidden = overflowHidden || style.overflowX === 'hidden'
  const overflowYHidden = overflowHidden || style.overflowY === 'hidden'

  if (!overflowXHidden && !overflowYHidden && !src) {
    overflowClipPath = ''
  } else {
    const _id = clipPath ? `satori_ocp-${id}` : genClipPathId(id)

    // When only one axis is hidden, extend the clip rect on the visible axis
    // to a very large value so content overflows freely in that direction.
    const OVERFLOW_EXTENT = 1_000_000
    let clipX = left
    let clipY = top
    let clipWidth = width
    let clipHeight = height

    if (overflowXHidden && !overflowYHidden && !path && !src) {
      // Clip X but allow Y to overflow
      clipY = -OVERFLOW_EXTENT
      clipHeight = OVERFLOW_EXTENT * 2
    } else if (!overflowXHidden && overflowYHidden && !path && !src) {
      // Clip Y but allow X to overflow
      clipX = -OVERFLOW_EXTENT
      clipWidth = OVERFLOW_EXTENT * 2
    }

    const hasOverflow = overflowXHidden || overflowYHidden
    overflowClipPath = buildXMLString(
      'clipPath',
      {
        id: _id,
        'clip-path': currentClipPath,
      },
      buildXMLString(path ? 'path' : 'rect', {
        x: clipX,
        y: clipY,
        width: clipWidth,
        height: clipHeight,
        d: path ? path : undefined,
        // add transformation matrix to clip path if overflow is hidden AND a
        // transformation style is defined, otherwise children will be clipped
        // relative to the parent's original plane instead of the transformed
        // plane
        transform:
          hasOverflow && style.transform && matrix ? matrix : undefined,
      })
    )
  }

  const contentMask = mask(
    {
      id: `satori_om-${id}`,
      left,
      top,
      width,
      height,
      matrix,
      borderOnly: src ? false : true,
    },
    style
  )

  return clipPath + overflowClipPath + contentMask
}
