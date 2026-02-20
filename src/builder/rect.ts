import type { ParsedTransformOrigin } from '../transform-origin.js'

import backgroundImage from './background-image.js'
import radius, { getBorderRadiusClipPath } from './border-radius.js'
import { boxShadow } from './shadow.js'
import transform from './transform.js'
import overflow from './overflow.js'
import { buildXMLString, lengthToNumber } from '../utils.js'
import border, { getBorderClipPath } from './border.js'
import { genClipPath } from './clip-path.js'
import buildMaskImage from './mask-image.js'
import { resolveSvgImageRendering } from './image-rendering.js'
import cssColorParse from 'parse-css-color'
import CssDimension from '../vendor/parse-css-dimension/index.js'

type RGBAColor = {
  r: number
  g: number
  b: number
  a: number
}

export interface BlendPrimitive {
  left: number
  top: number
  width: number
  height: number
  color: string
}

interface ObjectPositionAxis {
  type: 'ratio' | 'length'
  value: number
  fromEnd?: boolean
}

interface ResolvedObjectPosition {
  x: ObjectPositionAxis
  y: ObjectPositionAxis
}

type ObjectPositionAxisName = 'x' | 'y'

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

const supportedMixBlendFallbackModes = new Set([
  'multiply',
  'screen',
  'darken',
  'lighten',
  'difference',
  'exclusion',
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

function normalizeBackgroundToken(
  value: string | undefined,
  fallback: string
): string {
  return (value || fallback).trim().toLowerCase().replace(/\s+/g, ' ')
}

function isSolidBlendEligibleBackgroundLayer(layer: {
  repeat?: string
  size?: string
  position?: string
}): boolean {
  const repeat = normalizeBackgroundToken(layer.repeat, 'repeat')
  const size = normalizeBackgroundToken(layer.size, 'auto')
  const position = normalizeBackgroundToken(layer.position, '0% 0%')

  const repeatDefault = repeat === 'repeat' || repeat === 'repeat repeat'
  const sizeDefault = size === 'auto' || size === 'auto auto'
  const positionDefault =
    position === '0% 0%' ||
    position === '0px 0px' ||
    position === 'left top' ||
    position === 'top left'

  return repeatDefault && sizeDefault && positionDefault
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function shadeColorForTone(
  color: string,
  tone: 'light' | 'dark',
  ratio = tone === 'light' ? 0 : 0.5
): string {
  const parsed = parseRGBAColor(color)
  if (!parsed) return color

  const target = tone === 'light' ? 1 : 0
  return serializeRGBAColor({
    r: parsed.r + (target - parsed.r) * ratio,
    g: parsed.g + (target - parsed.g) * ratio,
    b: parsed.b + (target - parsed.b) * ratio,
    a: parsed.a,
  })
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360
  const saturation = clamp01(s / 100)
  const lightness = clamp01(l / 100)
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = lightness - chroma / 2

  let rPrime = 0
  let gPrime = 0
  let bPrime = 0
  if (hue < 60) {
    rPrime = chroma
    gPrime = x
  } else if (hue < 120) {
    rPrime = x
    gPrime = chroma
  } else if (hue < 180) {
    gPrime = chroma
    bPrime = x
  } else if (hue < 240) {
    gPrime = x
    bPrime = chroma
  } else if (hue < 300) {
    rPrime = x
    bPrime = chroma
  } else {
    rPrime = chroma
    bPrime = x
  }

  return [
    Math.round((rPrime + m) * 255),
    Math.round((gPrime + m) * 255),
    Math.round((bPrime + m) * 255),
  ]
}

function parseRGBAColor(value: string | undefined): RGBAColor | null {
  if (!value) return null
  const parsed = cssColorParse(value)
  if (!parsed) return null
  const [r, g, b] =
    parsed.type === 'hsl'
      ? hslToRgb(parsed.values[0], parsed.values[1], parsed.values[2])
      : parsed.values
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

function parseObjectPositionLength(
  token: string,
  baseFontSize: number,
  inheritedStyle: Record<string, number | string | object>
): number | undefined {
  try {
    const parsed = new CssDimension(token)
    if (parsed.type === 'number') return parsed.value
    if (parsed.type !== 'length') return

    const resolved = lengthToNumber(
      `${parsed.value}${parsed.unit}`,
      baseFontSize,
      baseFontSize,
      inheritedStyle as Record<string, number | string>,
      false
    )
    if (typeof resolved === 'number') return resolved
    if (parsed.unit === 'px') return parsed.value
  } catch {
    return
  }
}

function parseObjectPositionCoordinate(
  token: string,
  baseFontSize: number,
  inheritedStyle: Record<string, number | string | object>
): ObjectPositionAxis | undefined {
  try {
    const parsed = new CssDimension(token)
    if (parsed.type === 'percentage') {
      return {
        type: 'ratio',
        value: parsed.value / 100,
      }
    }
  } catch {
    return
  }

  const length = parseObjectPositionLength(token, baseFontSize, inheritedStyle)
  if (typeof length === 'number') {
    return {
      type: 'length',
      value: length,
    }
  }
}

const horizontalObjectPositionKeywords = new Set(['left', 'center', 'right'])
const verticalObjectPositionKeywords = new Set(['top', 'center', 'bottom'])
const objectPositionKeywords = new Set([
  'left',
  'center',
  'right',
  'top',
  'bottom',
])

function buildObjectPositionAxisFromKeyword(
  axis: ObjectPositionAxisName,
  keyword: string,
  offset?: ObjectPositionAxis
): ObjectPositionAxis | undefined {
  if (axis === 'x') {
    if (!horizontalObjectPositionKeywords.has(keyword)) return
    if (keyword === 'center') {
      if (offset) return
      return { type: 'ratio', value: 0.5 }
    }

    if (!offset) {
      return { type: 'ratio', value: keyword === 'left' ? 0 : 1 }
    }

    if (offset.type === 'ratio') {
      return {
        type: 'ratio',
        value: offset.value,
        fromEnd: keyword === 'right',
      }
    }

    return {
      type: 'length',
      value: offset.value,
      fromEnd: keyword === 'right',
    }
  }

  if (!verticalObjectPositionKeywords.has(keyword)) return
  if (keyword === 'center') {
    if (offset) return
    return { type: 'ratio', value: 0.5 }
  }

  if (!offset) {
    return { type: 'ratio', value: keyword === 'top' ? 0 : 1 }
  }

  if (offset.type === 'ratio') {
    return {
      type: 'ratio',
      value: offset.value,
      fromEnd: keyword === 'bottom',
    }
  }

  return {
    type: 'length',
    value: offset.value,
    fromEnd: keyword === 'bottom',
  }
}

function parseObjectPosition(
  position: unknown,
  baseFontSize: number,
  inheritedStyle: Record<string, number | string | object>
): ResolvedObjectPosition {
  const defaults: ResolvedObjectPosition = {
    x: { type: 'ratio', value: 0.5 },
    y: { type: 'ratio', value: 0.5 },
  }

  const raw = String(position || '')
    .trim()
    .toLowerCase()
  if (!raw) return defaults
  const parts = raw.split(/\s+/).filter(Boolean)
  if (!parts.length) return defaults

  let x: ObjectPositionAxis | undefined
  let y: ObjectPositionAxis | undefined

  let i = 0
  while (i < parts.length) {
    const token = parts[i]
    const next = parts[i + 1]

    if (horizontalObjectPositionKeywords.has(token) && token !== 'center') {
      if (x) return defaults
      const offset =
        next && !objectPositionKeywords.has(next)
          ? parseObjectPositionCoordinate(next, baseFontSize, inheritedStyle)
          : undefined
      if (next && !objectPositionKeywords.has(next) && !offset) {
        return defaults
      }
      const axis = buildObjectPositionAxisFromKeyword('x', token, offset)
      if (!axis) return defaults
      x = axis
      i += offset ? 2 : 1
      continue
    }

    if (verticalObjectPositionKeywords.has(token) && token !== 'center') {
      if (y) return defaults
      const offset =
        next && !objectPositionKeywords.has(next)
          ? parseObjectPositionCoordinate(next, baseFontSize, inheritedStyle)
          : undefined
      if (next && !objectPositionKeywords.has(next) && !offset) {
        return defaults
      }
      const axis = buildObjectPositionAxisFromKeyword('y', token, offset)
      if (!axis) return defaults
      y = axis
      i += offset ? 2 : 1
      continue
    }

    if (token === 'center') {
      if (!x) {
        x = { type: 'ratio', value: 0.5 }
      } else if (!y) {
        y = { type: 'ratio', value: 0.5 }
      } else {
        return defaults
      }
      i += 1
      continue
    }

    const coordinate = parseObjectPositionCoordinate(
      token,
      baseFontSize,
      inheritedStyle
    )
    if (!coordinate) return defaults

    if (!x) {
      x = coordinate
    } else if (!y) {
      y = coordinate
    } else {
      return defaults
    }

    i += 1
  }

  return {
    x: x || defaults.x,
    y: y || defaults.y,
  }
}

function resolveObjectPositionOffset(
  coordinate: ObjectPositionAxis,
  containerSize: number,
  objectSize: number
): number {
  const freeSpace = containerSize - objectSize
  if (coordinate.type === 'ratio') {
    const ratio = coordinate.fromEnd ? 1 - coordinate.value : coordinate.value
    return freeSpace * ratio
  }
  return coordinate.fromEnd ? freeSpace - coordinate.value : coordinate.value
}

function resolveObjectFitImageSize(
  fit: string,
  containerWidth: number,
  containerHeight: number,
  intrinsicWidth: number,
  intrinsicHeight: number
) {
  const safeContainerWidth = Math.max(0, containerWidth)
  const safeContainerHeight = Math.max(0, containerHeight)
  const safeIntrinsicWidth = intrinsicWidth > 0 ? intrinsicWidth : 1
  const safeIntrinsicHeight = intrinsicHeight > 0 ? intrinsicHeight : 1

  if (fit === 'fill') {
    return {
      width: safeContainerWidth,
      height: safeContainerHeight,
    }
  }

  if (fit === 'none') {
    return {
      width: safeIntrinsicWidth,
      height: safeIntrinsicHeight,
    }
  }

  const containScale = Math.min(
    safeContainerWidth / safeIntrinsicWidth,
    safeContainerHeight / safeIntrinsicHeight
  )
  const coverScale = Math.max(
    safeContainerWidth / safeIntrinsicWidth,
    safeContainerHeight / safeIntrinsicHeight
  )

  if (fit === 'contain') {
    return {
      width: safeIntrinsicWidth * containScale,
      height: safeIntrinsicHeight * containScale,
    }
  }

  if (fit === 'cover') {
    return {
      width: safeIntrinsicWidth * coverScale,
      height: safeIntrinsicHeight * coverScale,
    }
  }

  if (fit === 'scale-down') {
    const scaleDownScale = Math.min(1, containScale)
    return {
      width: safeIntrinsicWidth * scaleDownScale,
      height: safeIntrinsicHeight * scaleDownScale,
    }
  }

  return {
    width: safeContainerWidth,
    height: safeContainerHeight,
  }
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

function isOpaqueNeutralBackdrop(
  color: string | undefined,
  mode: string
): boolean {
  const parsed = parseRGBAColor(color)
  if (!parsed) return false
  if (Math.abs(parsed.a - 1) > 1e-6) return false

  if (mode === 'multiply') {
    return (
      Math.abs(parsed.r - 1) < 1e-6 &&
      Math.abs(parsed.g - 1) < 1e-6 &&
      Math.abs(parsed.b - 1) < 1e-6
    )
  }

  if (mode === 'darken') {
    return (
      Math.abs(parsed.r - 1) < 1e-6 &&
      Math.abs(parsed.g - 1) < 1e-6 &&
      Math.abs(parsed.b - 1) < 1e-6
    )
  }

  if (
    mode === 'screen' ||
    mode === 'lighten' ||
    mode === 'difference' ||
    mode === 'exclusion'
  ) {
    return (
      Math.abs(parsed.r) < 1e-6 &&
      Math.abs(parsed.g) < 1e-6 &&
      Math.abs(parsed.b) < 1e-6
    )
  }

  return false
}

function resolveRectBlendFallbackOverlays(
  mode: string,
  sourceColor: string | undefined,
  sourceRect: { left: number; top: number; width: number; height: number },
  backdrops: BlendPrimitive[],
  parentBackgroundColor: string | undefined
): string {
  if (!isOpaqueNeutralBackdrop(parentBackgroundColor, mode)) return ''

  const source = parseRGBAColor(sourceColor)
  if (!source || Math.abs(source.a - 1) > 1e-6) return ''

  const overlays: string[] = []
  for (const backdrop of backdrops) {
    const backdropColor = parseRGBAColor(backdrop.color)
    if (!backdropColor || Math.abs(backdropColor.a - 1) > 1e-6) continue

    const intersectLeft = Math.max(sourceRect.left, backdrop.left)
    const intersectTop = Math.max(sourceRect.top, backdrop.top)
    const intersectRight = Math.min(
      sourceRect.left + sourceRect.width,
      backdrop.left + backdrop.width
    )
    const intersectBottom = Math.min(
      sourceRect.top + sourceRect.height,
      backdrop.top + backdrop.height
    )
    const intersectWidth = intersectRight - intersectLeft
    const intersectHeight = intersectBottom - intersectTop
    if (intersectWidth <= 0 || intersectHeight <= 0) continue

    const fill = serializeRGBAColor(
      blendSolidColor(backdropColor, source, mode)
    )
    overlays.push(
      buildXMLString('rect', {
        x: intersectLeft,
        y: intersectTop,
        width: intersectWidth,
        height: intersectHeight,
        fill,
      })
    )
  }

  return overlays.join('')
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
  inheritableStyle: Record<string, number | string | object>,
  siblingBlendBackdrops: BlendPrimitive[] = [],
  parentBackgroundColor?: string
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
  const backgroundBlendModes = parseBackgroundBlendModes(
    style.backgroundBlendMode
  )
  const hasRequestedBackgroundBlendMode = backgroundBlendModes.some(
    (mode) => mode !== 'normal'
  )

  if (style.backgroundImage) {
    const backgrounds: {
      patternId: string
      defs: string
      shape?: string
      solidColor?: string
      sourceIndex: number
      repeat?: string
      size?: string
      position?: string
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
          repeat: background.repeat,
          size: background.size,
          position: background.position,
        })
      }
    }

    for (const background of backgrounds) {
      const blendMode = resolveBackgroundBlendMode(
        backgroundBlendModes,
        background.sourceIndex
      )
      const canUseSolidLayerForBlend =
        hasRequestedBackgroundBlendMode &&
        !!background.solidColor &&
        isSolidBlendEligibleBackgroundLayer(background)

      fillLayers.push({
        fill: canUseSolidLayerForBlend
          ? (background.solidColor as string)
          : `url(#${background.patternId})`,
        blendMode,
        solidColor: canUseSolidLayerForBlend
          ? background.solidColor
          : undefined,
      })
      if (!canUseSolidLayerForBlend) {
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
  const hasBackgroundBlendMode = fillLayers.some(
    ({ blendMode }) => blendMode && blendMode !== 'normal'
  )
  if (hasBackgroundBlendMode) {
    const blendedSolidFill = resolveSolidBackgroundBlend(fillLayers)
    if (blendedSolidFill) {
      fillLayers.splice(0, fillLayers.length, {
        fill: blendedSolidFill,
        solidColor: blendedSolidFill,
      })
    }
  }
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

    const contentX = left + offsetLeft
    const contentY = top + offsetTop
    const contentWidth = Math.max(0, width - offsetLeft - offsetRight)
    const contentHeight = Math.max(0, height - offsetTop - offsetBottom)
    const intrinsicWidth =
      typeof style.__srcWidth === 'number' && style.__srcWidth > 0
        ? (style.__srcWidth as number)
        : contentWidth || 1
    const intrinsicHeight =
      typeof style.__srcHeight === 'number' && style.__srcHeight > 0
        ? (style.__srcHeight as number)
        : contentHeight || 1

    const normalizedObjectFit = String(style.objectFit || 'fill')
      .trim()
      .toLowerCase()
    const objectPosition = parseObjectPosition(
      style.objectPosition || '50% 50%',
      typeof style.fontSize === 'number'
        ? (style.fontSize as number)
        : typeof inheritableStyle.fontSize === 'number'
        ? (inheritableStyle.fontSize as number)
        : 16,
      inheritableStyle
    )

    const imageSize = resolveObjectFitImageSize(
      normalizedObjectFit,
      contentWidth,
      contentHeight,
      intrinsicWidth,
      intrinsicHeight
    )
    const imageX =
      contentX +
      resolveObjectPositionOffset(
        objectPosition.x,
        contentWidth,
        imageSize.width
      )
    const imageY =
      contentY +
      resolveObjectPositionOffset(
        objectPosition.y,
        contentHeight,
        imageSize.height
      )

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

    const svgImageRendering = resolveSvgImageRendering(
      typeof imageRendering === 'string' ? imageRendering : undefined
    )
    const imageStyle = [
      cssFilter ? `filter:${cssFilter}` : '',
      svgImageRendering ? `image-rendering:${svgImageRendering}` : '',
      imageOrientation ? `image-orientation:${imageOrientation}` : '',
    ]
      .filter(Boolean)
      .join(';')

    shape += buildXMLString('image', {
      x: imageX,
      y: imageY,
      width: imageSize.width,
      height: imageSize.height,
      href: src,
      preserveAspectRatio: 'none',
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

    const resolveOutlinePath = (expand: number) =>
      radius(
        {
          left: left - expand,
          top: top - expand,
          width: width + expand * 2,
          height: height + expand * 2,
        },
        style as Record<string, number>
      )

    const makeOutlineLine = (
      expand: number,
      strokeWidth: number,
      strokeColor = outlineColor,
      strokeProps: Record<string, string | undefined> = {}
    ) => {
      const outlinePath = resolveOutlinePath(expand)

      return buildXMLString(outlinePath ? 'path' : 'rect', {
        x: outlinePath ? undefined : left - expand,
        y: outlinePath ? undefined : top - expand,
        width: outlinePath ? undefined : width + expand * 2,
        height: outlinePath ? undefined : height + expand * 2,
        d: outlinePath || undefined,
        fill: 'none',
        stroke: strokeColor,
        'stroke-width': strokeWidth,
        ...strokeProps,
        transform: matrix ? matrix : undefined,
        'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
      })
    }

    const makeBeveledOutline = (
      expand: number,
      strokeWidth: number,
      topLeftColor: string,
      bottomRightColor: string
    ) => {
      if (resolveOutlinePath(expand)) {
        // Rounded outlines fallback to a single-stroke approximation.
        return makeOutlineLine(expand, strokeWidth)
      }

      const x0 = left - expand
      const y0 = top - expand
      const x1 = left + width + expand
      const y1 = top + height + expand
      const commonProps = {
        'stroke-width': strokeWidth,
        'stroke-linecap': 'square',
        transform: matrix ? matrix : undefined,
        'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
      }

      return (
        buildXMLString('line', {
          x1: x0,
          y1: y0,
          x2: x1,
          y2: y0,
          stroke: topLeftColor,
          ...commonProps,
        }) +
        buildXMLString('line', {
          x1: x0,
          y1: y0,
          x2: x0,
          y2: y1,
          stroke: topLeftColor,
          ...commonProps,
        }) +
        buildXMLString('line', {
          x1: x1,
          y1: y0,
          x2: x1,
          y2: y1,
          stroke: bottomRightColor,
          ...commonProps,
        }) +
        buildXMLString('line', {
          x1: x0,
          y1: y1,
          x2: x1,
          y2: y1,
          stroke: bottomRightColor,
          ...commonProps,
        })
      )
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
      if (
        outlineStyle === 'inset' ||
        outlineStyle === 'outset' ||
        outlineStyle === 'groove' ||
        outlineStyle === 'ridge'
      ) {
        const bevelStyle =
          outlineStyle === 'groove'
            ? 'inset'
            : outlineStyle === 'ridge'
            ? 'outset'
            : outlineStyle
        const darkRatio =
          outlineStyle === 'groove' || outlineStyle === 'ridge'
            ? 1 / 3
            : undefined
        const topLeftColor = shadeColorForTone(
          outlineColor,
          bevelStyle === 'inset' ? 'dark' : 'light',
          bevelStyle === 'inset' ? darkRatio : undefined
        )
        const bottomRightColor = shadeColorForTone(
          outlineColor,
          bevelStyle === 'inset' ? 'light' : 'dark',
          bevelStyle === 'inset' ? undefined : darkRatio
        )
        outlineShape = makeBeveledOutline(
          expand,
          outlineWidth,
          topLeftColor,
          bottomRightColor
        )
      } else {
        const outlineStrokeProps: Record<string, string | undefined> = {}
        if (outlineStyle === 'dashed') {
          outlineStrokeProps['stroke-dasharray'] =
            outlineWidth * 2 + ' ' + outlineWidth
        } else if (outlineStyle === 'dotted') {
          outlineStrokeProps['stroke-dasharray'] = '0 ' + outlineWidth * 2
          outlineStrokeProps['stroke-linecap'] = 'round'
        }

        outlineShape = makeOutlineLine(
          expand,
          outlineWidth,
          outlineColor,
          outlineStrokeProps
        )
      }
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

  const normalizedMixBlendMode =
    typeof mixBlendMode === 'string' ? mixBlendMode.trim().toLowerCase() : ''
  const hasSimpleSolidRect =
    !isImage &&
    type === 'rect' &&
    !path &&
    !matrix &&
    !cssFilter &&
    !style.transform &&
    !backgroundShapes &&
    !currentClipPath &&
    !maskId &&
    fillLayers.length === 1 &&
    !!fillLayers[0].solidColor &&
    !style.backgroundImage &&
    !style.borderLeftWidth &&
    !style.borderTopWidth &&
    !style.borderRightWidth &&
    !style.borderBottomWidth

  const blendFallbackOverlays =
    hasSimpleSolidRect &&
    supportedMixBlendFallbackModes.has(normalizedMixBlendMode)
      ? resolveRectBlendFallbackOverlays(
          normalizedMixBlendMode,
          fillLayers[0].solidColor,
          { left, top, width, height },
          siblingBlendBackdrops,
          parentBackgroundColor
        )
      : ''

  const shouldApplyNativeMixBlend =
    mixBlendMode &&
    mixBlendMode !== 'normal' &&
    blendFallbackOverlays.length === 0

  const compositingStyles = [
    shouldApplyNativeMixBlend ? `mix-blend-mode:${mixBlendMode}` : '',
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
    blendFallbackOverlays +
    (style.transform && (currentClipPath || maskId) ? '</g>' : '') +
    (opacity !== 1 ? `</g>` : '') +
    (compositingStyles ? '</g>' : '') +
    (shadow ? shadow[1] : '') +
    outlineShape +
    extra
  )
}
