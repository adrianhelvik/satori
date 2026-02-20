import type { ParsedTransformOrigin } from '../transform-origin.js'

import backgroundImage from './background-image.js'
import radius, { getBorderRadiusClipPath } from './border-radius.js'
import { boxShadow } from './shadow.js'
import transform from './transform.js'
import overflow from './overflow.js'
import { buildXMLString } from '../utils.js'
import border, { getBorderClipPath } from './border.js'
import { genClipPath } from './clip-path.js'
import buildMaskImage from './mask-image.js'
import cssColorParse from 'parse-css-color'

type RGBAColor = {
  r: number
  g: number
  b: number
  a: number
}

const supportedBackgroundBlendModes = new Set([
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity',
  'plus-lighter',
])

function parseBackgroundBlendModes(value: unknown): string[] {
  if (typeof value !== 'string' || !value.trim()) return []
  return value
    .split(',')
    .map((mode) => mode.trim().toLowerCase())
    .filter(Boolean)
    .map((mode) => (supportedBackgroundBlendModes.has(mode) ? mode : 'normal'))
}

function resolveBackgroundBlendMode(
  modes: string[],
  layerIndex: number
): string {
  if (!modes.length) return 'normal'
  return modes[layerIndex % modes.length]
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function parseRGBAColor(value: string | undefined): RGBAColor | null {
  if (!value) return null
  const parsed = cssColorParse(value)
  if (!parsed) return null
  const [r, g, b] = parsed.values
  return {
    r: clamp01(r / 255),
    g: clamp01(g / 255),
    b: clamp01(b / 255),
    a: clamp01(parsed.alpha ?? 1),
  }
}

function serializeRGBAColor(color: RGBAColor): string {
  const r = Math.round(clamp01(color.r) * 255)
  const g = Math.round(clamp01(color.g) * 255)
  const b = Math.round(clamp01(color.b) * 255)
  const a = clamp01(color.a)
  return `rgba(${r},${g},${b},${a})`
}

function blendChannel(mode: string, backdrop: number, source: number): number {
  switch (mode) {
    case 'multiply':
      return backdrop * source
    case 'screen':
      return backdrop + source - backdrop * source
    case 'overlay':
      return backdrop <= 0.5
        ? 2 * backdrop * source
        : 1 - 2 * (1 - backdrop) * (1 - source)
    case 'darken':
      return Math.min(backdrop, source)
    case 'lighten':
      return Math.max(backdrop, source)
    case 'difference':
      return Math.abs(backdrop - source)
    case 'exclusion':
      return backdrop + source - 2 * backdrop * source
    case 'hard-light':
      return source <= 0.5
        ? 2 * backdrop * source
        : 1 - 2 * (1 - backdrop) * (1 - source)
    case 'normal':
    default:
      return source
  }
}

function blendSolidColor(
  backdrop: RGBAColor,
  source: RGBAColor,
  mode: string
): RGBAColor {
  const ab = clamp01(backdrop.a)
  const as = clamp01(source.a)
  const outA = as + ab * (1 - as)
  if (outA === 0) return { r: 0, g: 0, b: 0, a: 0 }

  const br = blendChannel(mode, backdrop.r, source.r)
  const bg = blendChannel(mode, backdrop.g, source.g)
  const bb = blendChannel(mode, backdrop.b, source.b)

  const outR =
    (as * (1 - ab) * source.r + as * ab * br + (1 - as) * ab * backdrop.r) /
    outA
  const outG =
    (as * (1 - ab) * source.g + as * ab * bg + (1 - as) * ab * backdrop.g) /
    outA
  const outB =
    (as * (1 - ab) * source.b + as * ab * bb + (1 - as) * ab * backdrop.b) /
    outA

  return {
    r: clamp01(outR),
    g: clamp01(outG),
    b: clamp01(outB),
    a: clamp01(outA),
  }
}

function resolveSolidBackgroundBlend(
  layers: { solidColor?: string; blendMode?: string }[]
): string | null {
  if (!layers.length) return null
  if (layers.some((layer) => !layer.solidColor)) return null

  let blended = parseRGBAColor(layers[0].solidColor)
  if (!blended) return null

  for (let i = 1; i < layers.length; i++) {
    const next = parseRGBAColor(layers[i].solidColor)
    if (!next) return null

    blended = blendSolidColor(
      blended,
      next,
      layers[i].blendMode && layers[i].blendMode !== 'normal'
        ? layers[i].blendMode
        : 'normal'
    )
  }

  return serializeRGBAColor(blended)
}

export default async function rect(
  {
    id,
    left,
    top,
    width,
    height,
    isInheritingTransform,
    src,
    debug,
  }: {
    id: string
    left: number
    top: number
    width: number
    height: number
    isInheritingTransform: boolean
    src?: string
    debug?: boolean
  },
  style: Record<string, number | string | object>,
  inheritableStyle: Record<string, number | string | object>
) {
  if (style.display === 'none') return ''
  const primitiveStyle = style as Record<string, string | number>
  const primitiveInheritedStyle = inheritableStyle as Record<
    string,
    string | number
  >

  const isHidden = style.visibility === 'hidden'
  const isImage = !!src

  let type: 'rect' | 'path' = 'rect'
  let matrix = ''
  let defs = ''
  const fillLayers: {
    fill: string
    blendMode?: string
    solidColor?: string
  }[] = []
  let opacity = 1
  let extra = ''

  if (style.backgroundColor) {
    fillLayers.push({
      fill: style.backgroundColor as string,
      solidColor: style.backgroundColor as string,
    })
  }

  if (style.opacity !== undefined) {
    opacity = +style.opacity
  }

  if (style.transform) {
    matrix = transform(
      {
        left,
        top,
        width,
        height,
      },
      style.transform as unknown as number[],
      isInheritingTransform,
      style.transformOrigin as ParsedTransformOrigin | undefined
    )
  }

  let backgroundShapes = ''
  if (style.backgroundImage) {
    const backgrounds: {
      patternId: string
      defs: string
      shape?: string
      solidColor?: string
      sourceIndex: number
    }[] = []

    for (
      let index = 0;
      index < (style.backgroundImage as any).length;
      index++
    ) {
      const background = (style.backgroundImage as any)[index]
      const image = await backgroundImage(
        { id: id + '_' + index, width, height, left, top },
        background,
        primitiveInheritedStyle,
        'background',
        style.imageRendering as string | undefined,
        style.imageOrientation as string | undefined
      )
      if (image) {
        // Background images that come first in the array are rendered last.
        backgrounds.unshift({
          patternId: image[0],
          defs: image[1],
          shape: image[2],
          solidColor: image[3],
          sourceIndex: index,
        })
      }
    }

    const backgroundBlendModes = parseBackgroundBlendModes(
      style.backgroundBlendMode
    )

    for (const background of backgrounds) {
      fillLayers.push({
        fill: background.solidColor || `url(#${background.patternId})`,
        blendMode: resolveBackgroundBlendMode(
          backgroundBlendModes,
          background.sourceIndex
        ),
        solidColor: background.solidColor,
      })
      if (!background.solidColor) {
        defs += background.defs
      }
      if (background.shape) {
        backgroundShapes += background.shape
      }
    }
  }

  const [miId, mi] = await buildMaskImage(
    { id, left, top, width, height },
    primitiveStyle,
    primitiveInheritedStyle
  )

  defs += mi
  const maskId = miId
    ? `url(#${miId})`
    : style._inheritedMaskId
    ? `url(#${style._inheritedMaskId})`
    : undefined

  const path = radius(
    { left, top, width, height },
    style as Record<string, number>
  )
  if (path) {
    type = 'path'
  }

  const clipPathId = style._inheritedClipPathId as number | undefined

  if (debug) {
    extra = buildXMLString('rect', {
      x: left,
      y: top,
      width,
      height,
      fill: 'transparent',
      stroke: '#ff5757',
      'stroke-width': 1,
      transform: matrix || undefined,
      'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
    })
  }

  const {
    backgroundClip,
    filter: cssFilter,
    mixBlendMode,
    isolation,
    imageRendering,
    imageOrientation,
  } = style

  const currentClipPath =
    backgroundClip === 'text'
      ? `url(#satori_bct-${id})`
      : clipPathId
      ? `url(#${clipPathId})`
      : style.clipPath
      ? genClipPath(id)
      : undefined

  const clip = overflow(
    { left, top, width, height, path, id, matrix, currentClipPath, src },
    primitiveStyle,
    primitiveInheritedStyle
  )

  // Each background generates a new rectangle.
  // @TODO: Not sure if this is the best way to do it, maybe <pattern> with
  // multiple <image>s is better.
  const blendedSolidFill = resolveSolidBackgroundBlend(fillLayers)
  if (blendedSolidFill) {
    fillLayers.splice(0, fillLayers.length, {
      fill: blendedSolidFill,
      solidColor: blendedSolidFill,
    })
  }

  const hasBackgroundBlendMode = fillLayers.some(
    ({ blendMode }) => blendMode && blendMode !== 'normal'
  )
  const backgroundLayerShape = fillLayers
    .map(({ fill, blendMode }) => {
      const layerShape = buildXMLString(type, {
        x: left,
        y: top,
        width,
        height,
        fill,
        d: path ? path : undefined,
        transform: matrix ? matrix : undefined,
        'clip-path': style.transform ? undefined : currentClipPath,
        style: cssFilter ? `filter:${cssFilter}` : undefined,
        mask: style.transform ? undefined : maskId,
      })

      if (!blendMode || blendMode === 'normal') {
        return layerShape
      }

      return `<g style="mix-blend-mode:${blendMode}">${layerShape}</g>`
    })
    .join('')
  let shape =
    hasBackgroundBlendMode && backgroundLayerShape
      ? `<g style="isolation:isolate">${backgroundLayerShape}</g>`
      : backgroundLayerShape

  const borderClip = getBorderClipPath(
    {
      id,
      left,
      top,
      width,
      height,
      currentClipPathId: clipPathId,
      borderPath: path,
      borderType: type,
    },
    primitiveStyle
  )

  // border radius for images with transform property
  let imageBorderRadius = undefined

  // If it's an image (<img>) tag, we add an extra layer of the image itself.
  if (isImage) {
    // We need to subtract the border and padding sizes from the image size.
    const offsetLeft =
      ((style.borderLeftWidth as number) || 0) +
      ((style.paddingLeft as number) || 0)
    const offsetTop =
      ((style.borderTopWidth as number) || 0) +
      ((style.paddingTop as number) || 0)
    const offsetRight =
      ((style.borderRightWidth as number) || 0) +
      ((style.paddingRight as number) || 0)
    const offsetBottom =
      ((style.borderBottomWidth as number) || 0) +
      ((style.paddingBottom as number) || 0)

    let xAlign = 'Mid'
    let yAlign = 'Mid'
    const position = (style.objectPosition || 'center')
      .toString()
      .trim()
      .toLowerCase()
    const parts = position.split(/\s+/)
    if (parts.length === 1) {
      switch (parts[0]) {
        case 'left':
          xAlign = 'Min'
          yAlign = 'Mid'
          break
        case 'right':
          xAlign = 'Max'
          yAlign = 'Mid'
          break
        case 'top':
          xAlign = 'Mid'
          yAlign = 'Min'
          break
        case 'bottom':
          xAlign = 'Mid'
          yAlign = 'Max'
          break
        case 'center':
          xAlign = 'Mid'
          yAlign = 'Mid'
          break
      }
    } else if (parts.length === 2) {
      for (const part of parts) {
        if (part === 'left') xAlign = 'Min'
        else if (part === 'right') xAlign = 'Max'
        else if (part === 'center') xAlign = 'Mid'
        else if (part === 'top') yAlign = 'Min'
        else if (part === 'bottom') yAlign = 'Max'
      }
    }
    const alignment = `x${xAlign}Y${yAlign}`
    const preserveAspectRatio =
      style.objectFit === 'contain'
        ? alignment
        : style.objectFit === 'cover'
        ? `${alignment} slice`
        : 'none'

    if (style.transform) {
      imageBorderRadius = getBorderRadiusClipPath(
        {
          id,
          borderRadiusPath: path,
          borderType: type,
          left,
          top,
          width,
          height,
        },
        primitiveStyle
      )
    }

    const imageStyle = [
      cssFilter ? `filter:${cssFilter}` : '',
      imageRendering ? `image-rendering:${imageRendering}` : '',
      imageOrientation ? `image-orientation:${imageOrientation}` : '',
    ]
      .filter(Boolean)
      .join(';')

    shape += buildXMLString('image', {
      x: left + offsetLeft,
      y: top + offsetTop,
      width: width - offsetLeft - offsetRight,
      height: height - offsetTop - offsetBottom,
      href: src,
      preserveAspectRatio,
      transform: matrix ? matrix : undefined,
      style: imageStyle || undefined,
      'clip-path': style.transform
        ? imageBorderRadius
          ? `url(#${imageBorderRadius[1]})`
          : undefined
        : `url(#satori_cp-${id})`,
      mask: style.transform
        ? undefined
        : miId
        ? `url(#${miId})`
        : `url(#satori_om-${id})`,
    })
  }

  if (borderClip) {
    defs += borderClip[0]
    const rectClipId = borderClip[1]

    shape += border(
      {
        left,
        top,
        width,
        height,
        props: {
          transform: matrix ? matrix : undefined,
          // When using `background-clip: text`, we need to draw the extra border because
          // it shouldn't be clipped by the clip path, so we are not using currentClipPath here.
          'clip-path': `url(#${rectClipId})`,
        },
      },
      primitiveStyle
    )
  }

  // outline — rendered outside the border, doesn't affect layout.
  let outlineShape = ''
  if (
    !isHidden &&
    style.outlineStyle &&
    style.outlineStyle !== 'none' &&
    style.outlineWidth
  ) {
    const outlineWidth = +(style.outlineWidth || 0)
    const outlineOffset = +(style.outlineOffset || 0)
    const outlineColor = (style.outlineColor ||
      style.color ||
      'black') as string
    const outlineStyle = style.outlineStyle as string

    const makeOutlineLine = (
      expand: number,
      strokeWidth: number,
      strokeProps: Record<string, string | undefined> = {}
    ) => {
      const outlinePath = radius(
        {
          left: left - expand,
          top: top - expand,
          width: width + expand * 2,
          height: height + expand * 2,
        },
        style as Record<string, number>
      )

      return buildXMLString(outlinePath ? 'path' : 'rect', {
        x: outlinePath ? undefined : left - expand,
        y: outlinePath ? undefined : top - expand,
        width: outlinePath ? undefined : width + expand * 2,
        height: outlinePath ? undefined : height + expand * 2,
        d: outlinePath || undefined,
        fill: 'none',
        stroke: outlineColor,
        'stroke-width': strokeWidth,
        ...strokeProps,
        transform: matrix ? matrix : undefined,
        'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
      })
    }

    if (outlineStyle === 'double' && outlineWidth >= 3) {
      const lineWidth = Math.max(1, Math.round(outlineWidth / 3))
      const gap = Math.max(1, outlineWidth - lineWidth * 2)
      const nearExpand = outlineOffset + lineWidth / 2
      const farExpand = outlineOffset + lineWidth + gap + lineWidth / 2

      outlineShape =
        makeOutlineLine(nearExpand, lineWidth) +
        makeOutlineLine(farExpand, lineWidth)
    } else {
      // Outline is drawn outside the border box, offset by outlineOffset.
      const expand = outlineWidth / 2 + outlineOffset
      const outlineStrokeProps: Record<string, string | undefined> = {}
      if (outlineStyle === 'dashed') {
        outlineStrokeProps['stroke-dasharray'] =
          outlineWidth * 2 + ' ' + outlineWidth
      } else if (outlineStyle === 'dotted') {
        outlineStrokeProps['stroke-dasharray'] = '0 ' + outlineWidth * 2
        outlineStrokeProps['stroke-linecap'] = 'round'
      }

      outlineShape = makeOutlineLine(expand, outlineWidth, outlineStrokeProps)
    }
  }

  // box-shadow.
  const shadow = boxShadow(
    {
      width,
      height,
      id,
      opacity,
      shape: buildXMLString(type, {
        x: left,
        y: top,
        width,
        height,
        fill: '#fff',
        stroke: '#fff',
        'stroke-width': 0,
        d: path ? path : undefined,
        transform: matrix ? matrix : undefined,
        'clip-path': currentClipPath,
        mask: maskId,
      }),
    },
    style
  )

  // visibility: hidden skips visual output but keeps structural elements (defs, clips)
  // so that children (which may have visibility: visible) still render correctly.
  if (isHidden) {
    return (defs ? buildXMLString('defs', {}, defs) : '') + clip
  }

  const compositingStyles = [
    mixBlendMode && mixBlendMode !== 'normal'
      ? `mix-blend-mode:${mixBlendMode}`
      : '',
    isolation && isolation !== 'auto' ? `isolation:${isolation}` : '',
  ]
    .filter(Boolean)
    .join(';')

  return (
    (defs ? buildXMLString('defs', {}, defs) : '') +
    (shadow ? shadow[0] : '') +
    (imageBorderRadius ? imageBorderRadius[0] : '') +
    clip +
    (compositingStyles ? `<g style="${compositingStyles}">` : '') +
    (opacity !== 1 ? `<g opacity="${opacity}">` : '') +
    (style.transform && (currentClipPath || maskId)
      ? `<g${currentClipPath ? ` clip-path="${currentClipPath}"` : ''}${
          maskId ? ` mask="${maskId}"` : ''
        }>`
      : '') +
    (backgroundShapes || shape) +
    (style.transform && (currentClipPath || maskId) ? '</g>' : '') +
    (opacity !== 1 ? `</g>` : '') +
    (compositingStyles ? '</g>' : '') +
    (shadow ? shadow[1] : '') +
    outlineShape +
    extra
  )
}
