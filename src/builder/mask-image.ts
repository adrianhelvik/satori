import { buildXMLString } from '../utils.js'
import buildBackgroundImage from './background-image.js'
import type { MaskProperty } from '../parser/mask.js'

const genMaskImageId = (id: string) => `satori_mi-${id}`

function resolveMaskBox(
  box: string,
  left: number,
  top: number,
  width: number,
  height: number,
  style: Record<string, string | number>
) {
  const borderLeft = Number(style.borderLeftWidth || 0)
  const borderRight = Number(style.borderRightWidth || 0)
  const borderTop = Number(style.borderTopWidth || 0)
  const borderBottom = Number(style.borderBottomWidth || 0)
  const paddingLeft = Number(style.paddingLeft || 0)
  const paddingRight = Number(style.paddingRight || 0)
  const paddingTop = Number(style.paddingTop || 0)
  const paddingBottom = Number(style.paddingBottom || 0)

  if (box === 'content-box') {
    const x = left + borderLeft + paddingLeft
    const y = top + borderTop + paddingTop
    const w = Math.max(
      0,
      width - borderLeft - borderRight - paddingLeft - paddingRight
    )
    const h = Math.max(
      0,
      height - borderTop - borderBottom - paddingTop - paddingBottom
    )
    return { left: x, top: y, width: w, height: h }
  }

  if (box === 'padding-box') {
    const x = left + borderLeft
    const y = top + borderTop
    const w = Math.max(0, width - borderLeft - borderRight)
    const h = Math.max(0, height - borderTop - borderBottom)
    return { left: x, top: y, width: w, height: h }
  }

  // border-box and unknown values fallback.
  return { left, top, width, height }
}

function resolveMaskType(
  style: Record<string, string | number>,
  masks: MaskProperty[]
): 'alpha' | 'luminance' | undefined {
  const explicitType = String(style.maskType || '').trim()
  if (explicitType === 'alpha' || explicitType === 'luminance') {
    return explicitType
  }

  const firstMode = (masks[0]?.mode || '').trim()
  // `mask-mode: alpha` can be mapped directly to SVG `mask-type`.
  if (firstMode === 'alpha') return 'alpha'
}

export default async function buildMaskImage(
  v: {
    id: string
    left: number
    top: number
    width: number
    height: number
  },
  style: Record<string, string | number>,
  inheritedStyle: Record<string, string | number>
): Promise<[string, string]> {
  if (!style.maskImage) return ['', '']
  const { left, top, width, height, id } = v
  const maskImage = style.maskImage as unknown as MaskProperty[]
  const length = maskImage.length
  if (!length) return ['', '']
  const miId = genMaskImageId(id)

  const maskType = resolveMaskType(style, maskImage)
  let mask = ''

  for (let i = 0; i < length; i++) {
    const m = maskImage[i]
    const originBox = resolveMaskBox(m.origin, left, top, width, height, style)
    const clipBox = resolveMaskBox(m.clip, left, top, width, height, style)

    const [_id, def] = await buildBackgroundImage(
      { id: `${miId}-${i}`, ...originBox },
      m,
      inheritedStyle,
      'mask',
      style.imageRendering as string | undefined
    )

    mask +=
      def +
      buildXMLString('rect', {
        x: clipBox.left,
        y: clipBox.top,
        width: clipBox.width,
        height: clipBox.height,
        fill: `url(#${_id})`,
      })
  }

  mask = buildXMLString('mask', { id: miId, 'mask-type': maskType }, mask)

  return [miId, mask]
}
