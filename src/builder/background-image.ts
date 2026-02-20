import CssDimension from '../vendor/parse-css-dimension/index.js'
import { buildXMLString } from '../utils.js'

import { resolveImageData } from '../handler/image.js'
import { buildLinearGradient } from './gradient/linear.js'
import { buildRadialGradient } from './gradient/radial.js'
import cssColorParse from 'parse-css-color'

interface Background {
  attachment?: string
  color?: string
  clip: string
  image: string
  origin?: string
  position: string
  size: string
  repeat: string
}

export type BackgroundImageBuildResult = [string, string, string?, string?]

type RepeatMode = 'repeat' | 'no-repeat' | 'round' | 'space'

function toAbsoluteValue(v: string | number, base: number) {
  if (typeof v === 'string' && v.endsWith('%')) {
    return (base * parseFloat(v)) / 100
  }
  return +v
}

function normalizeRepeatMode(value: string): RepeatMode {
  if (
    value === 'repeat' ||
    value === 'no-repeat' ||
    value === 'round' ||
    value === 'space'
  ) {
    return value
  }
  return 'repeat'
}

function parseRepeatModes(repeat: string): { x: RepeatMode; y: RepeatMode } {
  const normalized = String(repeat || 'repeat')
    .trim()
    .toLowerCase()

  if (normalized === 'repeat-x') return { x: 'repeat', y: 'no-repeat' }
  if (normalized === 'repeat-y') return { x: 'no-repeat', y: 'repeat' }

  const parts = normalized.split(/\s+/).filter(Boolean)
  if (!parts.length) return { x: 'repeat', y: 'repeat' }
  if (parts.length === 1) {
    const mode = normalizeRepeatMode(parts[0])
    return { x: mode, y: mode }
  }
  return {
    x: normalizeRepeatMode(parts[0]),
    y: normalizeRepeatMode(parts[1]),
  }
}

function resolveBackgroundAxisTiling({
  mode,
  areaSize,
  tileSize,
  offset,
  origin,
}: {
  mode: RepeatMode
  areaSize: number
  tileSize: number
  offset: number
  origin: number
}): {
  patternSize: number | string
  patternOffset: number
  imageSize: number
  imageOffset: number
} {
  if (mode === 'no-repeat' || !isFinite(tileSize) || tileSize <= 0) {
    return {
      patternSize: '100%',
      patternOffset: origin + offset,
      imageSize: tileSize,
      imageOffset: 0,
    }
  }

  if (mode === 'repeat') {
    return {
      patternSize: tileSize,
      patternOffset: origin + offset,
      imageSize: tileSize,
      imageOffset: 0,
    }
  }

  if (!isFinite(areaSize) || areaSize <= 0) {
    return {
      patternSize: tileSize,
      patternOffset: origin + offset,
      imageSize: tileSize,
      imageOffset: 0,
    }
  }

  if (mode === 'round') {
    const count = Math.max(1, Math.round(areaSize / tileSize))
    const roundedSize = areaSize / count
    return {
      patternSize: roundedSize,
      patternOffset: origin,
      imageSize: roundedSize,
      imageOffset: 0,
    }
  }

  // `space`: distribute full gaps between tiles. If fewer than two tiles fit,
  // browsers effectively fall back to single-image placement.
  const count = Math.floor(areaSize / tileSize)
  if (count <= 1) {
    return {
      patternSize: '100%',
      patternOffset: origin + offset,
      imageSize: tileSize,
      imageOffset: 0,
    }
  }

  const gap = (areaSize - count * tileSize) / (count - 1)
  return {
    patternSize: tileSize + gap,
    patternOffset: origin,
    imageSize: tileSize,
    imageOffset: 0,
  }
}

function parseLengthPairs(
  str: string,
  {
    x,
    y,
    defaultX,
    defaultY,
  }: {
    x: number
    y: number
    defaultX: number | string
    defaultY: number | string
  }
) {
  return (
    str
      ? str
          .split(' ')
          .map((value) => {
            try {
              const parsed = new CssDimension(value)
              return parsed.type === 'length' || parsed.type === 'number'
                ? parsed.value
                : parsed.value + parsed.unit
            } catch (e) {
              return null
            }
          })
          .filter((v) => v !== null)
      : [defaultX, defaultY]
  ).map((v, index) => toAbsoluteValue(v, [x, y][index]))
}

export default async function backgroundImage(
  {
    id,
    width,
    height,
    left,
    top,
  }: { id: string; width: number; height: number; left: number; top: number },
  { image, size, position, repeat }: Background,
  inheritableStyle: Record<string, number | string>,
  from?: 'background' | 'mask',
  imageRendering?: string,
  imageOrientation?: string,
  maskMode?: string
): Promise<BackgroundImageBuildResult> {
  // Default to `repeat`.
  repeat = repeat || 'repeat'
  from = from || 'background'
  const repeatModes = parseRepeatModes(repeat)

  const repeatX = repeatModes.x !== 'no-repeat'
  const repeatY = repeatModes.y !== 'no-repeat'

  const dimensions = parseLengthPairs(size, {
    x: width,
    y: height,
    defaultX: width,
    defaultY: height,
  })
  const offsets = parseLengthPairs(position, {
    x: width,
    y: height,
    defaultX: 0,
    defaultY: 0,
  })

  if (
    image.startsWith('linear-gradient(') ||
    image.startsWith('repeating-linear-gradient(')
  ) {
    return buildLinearGradient(
      { id, width, height, repeatX, repeatY },
      image,
      dimensions,
      offsets,
      inheritableStyle,
      from,
      maskMode
    )
  }

  if (
    image.startsWith('radial-gradient(') ||
    image.startsWith('repeating-radial-gradient(')
  ) {
    return buildRadialGradient(
      { id, width, height, repeatX, repeatY },
      image,
      dimensions,
      offsets,
      inheritableStyle,
      from,
      maskMode
    )
  }

  if (image.startsWith('url(')) {
    const dimensionsWithoutFallback = parseLengthPairs(size, {
      x: width,
      y: height,
      defaultX: 0,
      defaultY: 0,
    })
    const [src, imageWidth, imageHeight] = await resolveImageData(
      image.slice(4, -1)
    )
    const resolvedWidth =
      from === 'mask'
        ? imageWidth || dimensionsWithoutFallback[0]
        : dimensionsWithoutFallback[0] || imageWidth
    const resolvedHeight =
      from === 'mask'
        ? imageHeight || dimensionsWithoutFallback[1]
        : dimensionsWithoutFallback[1] || imageHeight

    const normalizedMaskMode = String(maskMode || '')
      .trim()
      .toLowerCase()
    const useAlphaMaskColors =
      from === 'mask' &&
      (!normalizedMaskMode ||
        normalizedMaskMode === 'alpha' ||
        normalizedMaskMode === 'match-source')

    const alphaFilterId = useAlphaMaskColors ? `satori_mask_af-${id}` : ''
    const alphaFilterDef = useAlphaMaskColors
      ? buildXMLString(
          'filter',
          {
            id: alphaFilterId,
            'color-interpolation-filters': 'sRGB',
          },
          buildXMLString('feColorMatrix', {
            type: 'matrix',
            values: '0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0',
          })
        )
      : ''

    const xAxis = resolveBackgroundAxisTiling({
      mode: repeatModes.x,
      areaSize: width,
      tileSize: resolvedWidth,
      offset: offsets[0],
      origin: left,
    })
    const yAxis = resolveBackgroundAxisTiling({
      mode: repeatModes.y,
      areaSize: height,
      tileSize: resolvedHeight,
      offset: offsets[1],
      origin: top,
    })

    const patternDef = buildXMLString(
      'pattern',
      {
        id: `satori_bi${id}`,
        patternContentUnits: 'userSpaceOnUse',
        patternUnits: 'userSpaceOnUse',
        x: xAxis.patternOffset,
        y: yAxis.patternOffset,
        width: xAxis.patternSize,
        height: yAxis.patternSize,
      },
      buildXMLString('image', {
        x: xAxis.imageOffset,
        y: yAxis.imageOffset,
        width: xAxis.imageSize,
        height: yAxis.imageSize,
        'image-rendering': imageRendering || undefined,
        'image-orientation': imageOrientation || undefined,
        preserveAspectRatio: 'none',
        filter: alphaFilterId ? `url(#${alphaFilterId})` : undefined,
        href: src,
      })
    )

    return [`satori_bi${id}`, alphaFilterDef + patternDef]
  }

  if (cssColorParse(image)) {
    const colorObj = cssColorParse(image)
    const [r, g, b, a] = colorObj.values
    const alpha = a !== undefined ? a : 1
    const color = `rgba(${r},${g},${b},${alpha})`

    return [
      `satori_bi${id}`,
      buildXMLString(
        'pattern',
        {
          id: `satori_bi${id}`,
          patternContentUnits: 'userSpaceOnUse',
          patternUnits: 'userSpaceOnUse',
          x: left,
          y: top,
          width: width,
          height: height,
        },
        buildXMLString('rect', {
          x: 0,
          y: 0,
          width: width,
          height: height,
          fill: color,
        })
      ),
      undefined,
      color,
    ]
  }

  throw new Error(`Invalid background image: "${image}"`)
}
