import cssColorParse from 'parse-css-color'
import { buildXMLString } from '../utils.js'

import type { BlendPrimitive } from './rect.js'

type RGBAColor = {
  r: number
  g: number
  b: number
  a: number
}

export const supportedSolidBackgroundBlendModes = new Set([
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'difference',
  'exclusion',
  'hard-light',
  'color-dodge',
  'color-burn',
  'soft-light',
  'hue',
  'saturation',
  'color',
  'luminosity',
])

export const supportedMixBlendFallbackModes = new Set([
  'multiply',
  'screen',
  'overlay',
  'hard-light',
  'darken',
  'lighten',
  'difference',
  'exclusion',
  'plus-lighter',
])

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export function shadeColorForTone(
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

export function blendColors(
  colorA: string,
  colorB: string,
  ratio = 0.5
): string {
  const first = parseRGBAColor(colorA)
  const second = parseRGBAColor(colorB)
  if (!first || !second) return colorA

  return serializeRGBAColor({
    r: first.r + (second.r - first.r) * ratio,
    g: first.g + (second.g - first.g) * ratio,
    b: first.b + (second.b - first.b) * ratio,
    a: first.a + (second.a - first.a) * ratio,
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

function blendChannel(mode: string, backdrop: number, source: number): number {
  switch (mode) {
    case 'multiply':
      return backdrop * source
    case 'screen':
      return backdrop + source - backdrop * source
    case 'color-dodge':
      if (backdrop <= 0) return 0
      if (source >= 1) return 1
      return Math.min(1, backdrop / (1 - source))
    case 'color-burn':
      if (backdrop >= 1) return 1
      if (source <= 0) return 0
      return 1 - Math.min(1, (1 - backdrop) / source)
    case 'plus-lighter':
      return Math.min(1, backdrop + source)
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
    case 'soft-light': {
      if (source <= 0.5) {
        return backdrop - (1 - 2 * source) * backdrop * (1 - backdrop)
      }
      const d =
        backdrop <= 0.25
          ? ((16 * backdrop - 12) * backdrop + 4) * backdrop
          : Math.sqrt(backdrop)
      return backdrop + (2 * source - 1) * (d - backdrop)
    }
    case 'normal':
    default:
      return source
  }
}

function blendLuminance(color: { r: number; g: number; b: number }): number {
  return 0.3 * color.r + 0.59 * color.g + 0.11 * color.b
}

function blendSaturation(color: { r: number; g: number; b: number }): number {
  return (
    Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b)
  )
}

function clipBlendColor(color: { r: number; g: number; b: number }): {
  r: number
  g: number
  b: number
} {
  let { r, g, b } = color
  const l = blendLuminance({ r, g, b })
  const n = Math.min(r, g, b)
  const x = Math.max(r, g, b)

  if (n < 0) {
    const denominator = l - n
    if (Math.abs(denominator) > 1e-12) {
      r = l + ((r - l) * l) / denominator
      g = l + ((g - l) * l) / denominator
      b = l + ((b - l) * l) / denominator
    } else {
      r = l
      g = l
      b = l
    }
  }

  if (x > 1) {
    const denominator = x - l
    if (Math.abs(denominator) > 1e-12) {
      r = l + ((r - l) * (1 - l)) / denominator
      g = l + ((g - l) * (1 - l)) / denominator
      b = l + ((b - l) * (1 - l)) / denominator
    } else {
      r = l
      g = l
      b = l
    }
  }

  return { r: clamp01(r), g: clamp01(g), b: clamp01(b) }
}

function setBlendLuminance(
  color: {
    r: number
    g: number
    b: number
  },
  luminance: number
): {
  r: number
  g: number
  b: number
} {
  const delta = luminance - blendLuminance(color)
  return clipBlendColor({
    r: color.r + delta,
    g: color.g + delta,
    b: color.b + delta,
  })
}

function setBlendSaturation(
  color: {
    r: number
    g: number
    b: number
  },
  saturation: number
): {
  r: number
  g: number
  b: number
} {
  const channels: Array<{
    key: 'r' | 'g' | 'b'
    value: number
  }> = [
    { key: 'r', value: color.r },
    { key: 'g', value: color.g },
    { key: 'b', value: color.b },
  ]
  channels.sort((a, b) => a.value - b.value)

  let min = channels[0].value
  let mid = channels[1].value
  let max = channels[2].value

  if (max > min) {
    mid = ((mid - min) * saturation) / (max - min)
    max = saturation
  } else {
    mid = 0
    max = 0
  }
  min = 0

  const result = { r: 0, g: 0, b: 0 }
  result[channels[0].key] = min
  result[channels[1].key] = mid
  result[channels[2].key] = max
  return result
}

function blendRGB(
  mode: string,
  backdrop: RGBAColor,
  source: RGBAColor
): [number, number, number] {
  if (mode === 'hue') {
    const withSat = setBlendSaturation(source, blendSaturation(backdrop))
    const result = setBlendLuminance(withSat, blendLuminance(backdrop))
    return [result.r, result.g, result.b]
  }

  if (mode === 'saturation') {
    const withSat = setBlendSaturation(backdrop, blendSaturation(source))
    const result = setBlendLuminance(withSat, blendLuminance(backdrop))
    return [result.r, result.g, result.b]
  }

  if (mode === 'color') {
    const result = setBlendLuminance(source, blendLuminance(backdrop))
    return [result.r, result.g, result.b]
  }

  if (mode === 'luminosity') {
    const result = setBlendLuminance(backdrop, blendLuminance(source))
    return [result.r, result.g, result.b]
  }

  return [
    blendChannel(mode, backdrop.r, source.r),
    blendChannel(mode, backdrop.g, source.g),
    blendChannel(mode, backdrop.b, source.b),
  ]
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

  const [br, bg, bb] = blendRGB(mode, backdrop, source)

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

export function resolveSolidBackgroundBlend(
  layers: { solidColor?: string; blendMode?: string }[]
): string | null {
  if (!layers.length) return null
  if (layers.some((layer) => !layer.solidColor)) return null

  let blended = parseRGBAColor(layers[0].solidColor)
  if (!blended) return null

  for (let i = 1; i < layers.length; i++) {
    const next = parseRGBAColor(layers[i].solidColor)
    if (!next) return null

    const blendMode =
      layers[i].blendMode && layers[i].blendMode !== 'normal'
        ? layers[i].blendMode!
        : 'normal'
    if (!supportedSolidBackgroundBlendModes.has(blendMode)) {
      return null
    }

    blended = blendSolidColor(blended, next, blendMode)
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

  const near = (value: number, target: number) =>
    Math.abs(value - target) <= 1 / 255 + 1e-6

  if (mode === 'multiply') {
    return (
      Math.abs(parsed.r - 1) < 1e-6 &&
      Math.abs(parsed.g - 1) < 1e-6 &&
      Math.abs(parsed.b - 1) < 1e-6
    )
  }

  if (mode === 'overlay' || mode === 'hard-light') {
    return near(parsed.r, 0.5) && near(parsed.g, 0.5) && near(parsed.b, 0.5)
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
    mode === 'exclusion' ||
    mode === 'plus-lighter'
  ) {
    return (
      Math.abs(parsed.r) < 1e-6 &&
      Math.abs(parsed.g) < 1e-6 &&
      Math.abs(parsed.b) < 1e-6
    )
  }

  return false
}

export function resolveRectBlendFallbackOverlays(
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
