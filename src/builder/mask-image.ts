import { buildXMLString } from '../utils.js'
import buildBackgroundImage from './background-image.js'
import type { MaskProperty } from '../parser/mask.js'

const genMaskImageId = (id: string) => `satori_mi-${id}`

function normalizeMaskComposite(value: string | undefined): string {
  const normalized = String(value || 'add')
    .trim()
    .toLowerCase()
  if (
    normalized === 'add' ||
    normalized === 'intersect' ||
    normalized === 'subtract' ||
    normalized === 'exclude'
  ) {
    return normalized
  }
  return 'add'
}

function buildInvertedMask(
  {
    maskId,
    id,
    left,
    top,
    width,
    height,
  }: {
    maskId: string
    id: string
    left: number
    top: number
    width: number
    height: number
  },
  defs: string
): [string, string] {
  const filterId = `${id}-inv-filter`
  const inverseMaskId = `${id}-inv-mask`

  defs += buildXMLString(
    'filter',
    {
      id: filterId,
      x: left,
      y: top,
      width,
      height,
      filterUnits: 'userSpaceOnUse',
      'color-interpolation-filters': 'sRGB',
    },
    buildXMLString('feColorMatrix', {
      type: 'matrix',
      values: '-1 0 0 0 1 0 -1 0 0 1 0 0 -1 0 1 0 0 0 -1 1',
    })
  )

  defs += buildXMLString(
    'mask',
    { id: inverseMaskId, 'mask-type': 'alpha' },
    buildXMLString(
      'g',
      { filter: `url(#${filterId})` },
      buildXMLString('rect', {
        x: left,
        y: top,
        width,
        height,
        fill: '#fff',
        mask: `url(#${maskId})`,
      })
    )
  )

  return [inverseMaskId, defs]
}

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
  if (firstMode === 'luminance') return 'luminance'
  if (firstMode === 'match-source') return 'alpha'
}

function isGradientMaskImage(image: string): boolean {
  const normalized = image.trim().toLowerCase()
  return (
    normalized.startsWith('linear-gradient(') ||
    normalized.startsWith('repeating-linear-gradient(') ||
    normalized.startsWith('radial-gradient(') ||
    normalized.startsWith('repeating-radial-gradient(')
  )
}

function shiftAbsoluteMaskPosition(
  position: string,
  dx: number,
  dy: number
): string {
  const tokens = String(position || '0% 0%')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const xToken = tokens[0] || '0%'
  const yToken = tokens[1] || xToken

  const shiftToken = (token: string, delta: number, axis: 'x' | 'y') => {
    const normalized = token.trim().toLowerCase()
    if (!normalized) return `${delta}px`
    if (normalized.endsWith('%')) return token
    if (normalized === 'left' && axis === 'x') return `${delta}px`
    if (normalized === 'top' && axis === 'y') return `${delta}px`
    if (
      normalized === 'right' ||
      normalized === 'bottom' ||
      normalized === 'center'
    ) {
      return token
    }
    const parsed = Number.parseFloat(normalized)
    if (!Number.isFinite(parsed)) return token
    if (normalized === String(parsed) || normalized.endsWith('px')) {
      return `${parsed + delta}px`
    }
    return token
  }

  return `${shiftToken(xToken, dx, 'x')} ${shiftToken(yToken, dy, 'y')}`
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
  const hasExplicitMaskSize =
    Object.prototype.hasOwnProperty.call(style, 'maskSize') ||
    Object.prototype.hasOwnProperty.call(style, 'WebkitMaskSize')
  let defs = ''
  let composedMaskShape = ''

  for (let i = 0; i < length; i++) {
    const m = maskImage[i]
    const originBox = resolveMaskBox(m.origin, left, top, width, height, style)
    const clipBox = resolveMaskBox(m.clip, left, top, width, height, style)
    const useClipBoxGradientPositioning =
      isGradientMaskImage(m.image) && m.origin !== m.clip
    const imageBox = useClipBoxGradientPositioning ? clipBox : originBox
    const layer =
      useClipBoxGradientPositioning &&
      (originBox.left !== clipBox.left || originBox.top !== clipBox.top)
        ? {
            ...m,
            position: shiftAbsoluteMaskPosition(
              m.position,
              originBox.left - clipBox.left,
              originBox.top - clipBox.top
            ),
          }
        : m

    const [_id, def] = await buildBackgroundImage(
      { id: `${miId}-${i}`, ...imageBox },
      layer,
      inheritedStyle,
      'mask',
      style.imageRendering as string | undefined,
      style.imageOrientation as string | undefined,
      layer.mode,
      hasExplicitMaskSize
    )

    defs += def

    const layerShape = buildXMLString('rect', {
      x: clipBox.left,
      y: clipBox.top,
      width: clipBox.width,
      height: clipBox.height,
      fill: `url(#${_id})`,
    })

    if (!composedMaskShape) {
      composedMaskShape = layerShape
      continue
    }

    const composite = normalizeMaskComposite(m.composite)
    if (composite === 'intersect') {
      const prevMaskId = `${miId}-acc-${i}`
      defs += buildXMLString(
        'mask',
        { id: prevMaskId, 'mask-type': 'alpha' },
        composedMaskShape
      )
      composedMaskShape = buildXMLString('rect', {
        x: clipBox.left,
        y: clipBox.top,
        width: clipBox.width,
        height: clipBox.height,
        fill: `url(#${_id})`,
        mask: `url(#${prevMaskId})`,
      })
      continue
    }

    if (composite === 'subtract') {
      const prevMaskId = `${miId}-acc-${i}-prev`
      defs += buildXMLString(
        'mask',
        { id: prevMaskId, 'mask-type': 'alpha' },
        composedMaskShape
      )
      const [inversePrevMaskId, defsWithInverse] = buildInvertedMask(
        {
          maskId: prevMaskId,
          id: `${miId}-acc-${i}-prev`,
          left,
          top,
          width,
          height,
        },
        defs
      )
      defs = defsWithInverse

      composedMaskShape = buildXMLString(
        'g',
        { mask: `url(#${inversePrevMaskId})` },
        layerShape
      )
      continue
    }

    if (composite === 'exclude') {
      const prevMaskId = `${miId}-acc-${i}-prev`
      const currentMaskId = `${miId}-acc-${i}-current`
      defs += buildXMLString(
        'mask',
        { id: prevMaskId, 'mask-type': 'alpha' },
        composedMaskShape
      )
      defs += buildXMLString(
        'mask',
        { id: currentMaskId, 'mask-type': 'alpha' },
        layerShape
      )

      let inversePrevMaskId = ''
      let inverseCurrentMaskId = ''
      ;[inversePrevMaskId, defs] = buildInvertedMask(
        {
          maskId: prevMaskId,
          id: `${miId}-acc-${i}-prev`,
          left,
          top,
          width,
          height,
        },
        defs
      )
      ;[inverseCurrentMaskId, defs] = buildInvertedMask(
        {
          maskId: currentMaskId,
          id: `${miId}-acc-${i}-current`,
          left,
          top,
          width,
          height,
        },
        defs
      )

      composedMaskShape =
        buildXMLString(
          'g',
          { mask: `url(#${inversePrevMaskId})` },
          layerShape
        ) +
        buildXMLString(
          'g',
          { mask: `url(#${inverseCurrentMaskId})` },
          composedMaskShape
        )
      continue
    }

    // Additive composition.
    composedMaskShape += layerShape
  }

  const mask = buildXMLString(
    'mask',
    { id: miId, 'mask-type': maskType },
    composedMaskShape
  )

  return [miId, defs + mask]
}
