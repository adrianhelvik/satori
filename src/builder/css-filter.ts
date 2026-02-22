import cssColorParse from 'parse-css-color'
import { buildXMLString, lengthToNumber } from '../utils.js'
import { parseFilterList } from '../parser/filter.js'
import type { SerializedStyle } from '../handler/style-types.js'
import { parseFiniteNumber } from '../style-number.js'

interface BuildSvgFilterOptions {
  id: string
  filter: unknown
  style: SerializedStyle
  inheritedStyle: SerializedStyle
}

export interface BuiltSvgFilter {
  definition: string
  filterId: string
  unsupported: string[]
}

function resolveLength(
  value: string,
  style: SerializedStyle,
  inheritedStyle: SerializedStyle,
  axisLength = 1
): number | undefined {
  const fontSize = parseFiniteNumber(
    style.fontSize,
    parseFiniteNumber(inheritedStyle.fontSize, 16)
  )

  return lengthToNumber(
    value,
    fontSize,
    axisLength,
    style as Record<string, string | number | object>,
    true
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalizeColor(color: string | undefined, fallback: string): string {
  if (!color) return fallback
  return color
}

function extractFloodColor(color: string): { color: string; opacity: number } {
  const parsed = cssColorParse(color)
  if (!parsed) {
    return { color, opacity: 1 }
  }

  const [r, g, b] = parsed.values
  return {
    color: `rgb(${r},${g},${b})`,
    opacity: parsed.alpha ?? 1,
  }
}

export function buildSvgCssFilter({
  id,
  filter,
  style,
  inheritedStyle,
}: BuildSvgFilterOptions): BuiltSvgFilter | null {
  const parsed = parseFilterList(filter)
  if (parsed.filters.length === 0) return null

  const filterId = `satori_cf-${id}`
  const primitives: string[] = []
  let inputId = 'SourceGraphic'

  for (let i = 0; i < parsed.filters.length; i++) {
    const current = parsed.filters[i]
    const resultId = `${filterId}-r${i}`

    if (current.type === 'blur') {
      const radius = resolveLength(current.radius, style, inheritedStyle, 1)
      if (typeof radius !== 'number' || radius <= 0) {
        continue
      }

      primitives.push(
        buildXMLString('feGaussianBlur', {
          in: inputId,
          stdDeviation: radius,
          result: resultId,
        })
      )
      inputId = resultId
      continue
    }

    if (current.type === 'brightness') {
      const amount = Math.max(0, current.amount)
      primitives.push(
        buildXMLString(
          'feComponentTransfer',
          {
            in: inputId,
            result: resultId,
          },
          buildXMLString('feFuncR', {
            type: 'linear',
            slope: amount,
            intercept: 0,
          }) +
            buildXMLString('feFuncG', {
              type: 'linear',
              slope: amount,
              intercept: 0,
            }) +
            buildXMLString('feFuncB', {
              type: 'linear',
              slope: amount,
              intercept: 0,
            }) +
            buildXMLString('feFuncA', {
              type: 'identity',
            })
        )
      )
      inputId = resultId
      continue
    }

    if (current.type === 'contrast') {
      const amount = Math.max(0, current.amount)
      const intercept = 0.5 - 0.5 * amount
      primitives.push(
        buildXMLString(
          'feComponentTransfer',
          {
            in: inputId,
            result: resultId,
          },
          buildXMLString('feFuncR', {
            type: 'linear',
            slope: amount,
            intercept,
          }) +
            buildXMLString('feFuncG', {
              type: 'linear',
              slope: amount,
              intercept,
            }) +
            buildXMLString('feFuncB', {
              type: 'linear',
              slope: amount,
              intercept,
            }) +
            buildXMLString('feFuncA', {
              type: 'identity',
            })
        )
      )
      inputId = resultId
      continue
    }

    if (current.type === 'saturate') {
      const amount = Math.max(0, current.amount)
      primitives.push(
        buildXMLString('feColorMatrix', {
          in: inputId,
          type: 'saturate',
          values: amount,
          result: resultId,
        })
      )
      inputId = resultId
      continue
    }

    if (current.type === 'opacity') {
      const amount = clamp(current.amount, 0, 1)
      primitives.push(
        buildXMLString(
          'feComponentTransfer',
          {
            in: inputId,
            result: resultId,
          },
          buildXMLString('feFuncR', {
            type: 'identity',
          }) +
            buildXMLString('feFuncG', {
              type: 'identity',
            }) +
            buildXMLString('feFuncB', {
              type: 'identity',
            }) +
            buildXMLString('feFuncA', {
              type: 'linear',
              slope: amount,
            })
        )
      )
      inputId = resultId
      continue
    }

    if (current.type === 'drop-shadow') {
      const offsetX = resolveLength(current.offsetX, style, inheritedStyle, 1)
      const offsetY = resolveLength(current.offsetY, style, inheritedStyle, 1)
      const blurRadius = resolveLength(
        current.blurRadius,
        style,
        inheritedStyle,
        1
      )
      if (typeof offsetX !== 'number' || typeof offsetY !== 'number') {
        continue
      }

      const shadowColor = normalizeColor(current.color, style.color || 'black')
      const { color, opacity } = extractFloodColor(shadowColor)

      primitives.push(
        buildXMLString('feDropShadow', {
          in: inputId,
          dx: offsetX,
          dy: offsetY,
          stdDeviation:
            typeof blurRadius === 'number' && blurRadius > 0
              ? blurRadius / 2
              : 0,
          'flood-color': color,
          'flood-opacity': opacity,
          result: resultId,
        })
      )
      inputId = resultId
    }
  }

  if (primitives.length === 0) return null

  const definition = buildXMLString(
    'filter',
    {
      id: filterId,
      x: '-50%',
      y: '-50%',
      width: '200%',
      height: '200%',
      'color-interpolation-filters': 'sRGB',
    },
    primitives.join('')
  )

  return {
    definition,
    filterId,
    unsupported: parsed.unsupported,
  }
}
