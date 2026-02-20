import CssDimension from '../vendor/parse-css-dimension/index.js'
import { buildXMLString } from '../utils.js'

import { resolveImageData } from '../handler/image.js'
import { buildLinearGradient } from './gradient/linear.js'
import { buildRadialGradient } from './gradient/radial.js'
import {
  parseRepeatModes,
  resolveBackgroundAxisTiling,
} from './background-repeat.js'
import cssColorParse from 'parse-css-color'
import { resolveSvgImageRendering } from './image-rendering.js'

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

function toAbsoluteValue(v: string | number, base: number) {
  if (typeof v === 'string' && v.endsWith('%')) {
    return (base * parseFloat(v)) / 100
  }
  return +v
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
  maskMode?: string,
  maskSizeIsExplicit = false
): Promise<BackgroundImageBuildResult> {
  // Default to `repeat`.
  repeat = repeat || 'repeat'
  from = from || 'background'
  const repeatModes = parseRepeatModes(repeat)

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
      { id, width, height, repeatModes },
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
      { id, width, height, repeatModes },
      image,
      dimensions,
      offsets,
      inheritableStyle,
      from,
      maskMode
    )
  }

  if (image.startsWith('url(')) {
    const svgImageRendering = resolveSvgImageRendering(imageRendering)
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
      from === 'mask' && !maskSizeIsExplicit
        ? imageWidth || dimensionsWithoutFallback[0]
        : dimensionsWithoutFallback[0] || imageWidth
    const resolvedHeight =
      from === 'mask' && !maskSizeIsExplicit
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
        'image-rendering': svgImageRendering || undefined,
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
