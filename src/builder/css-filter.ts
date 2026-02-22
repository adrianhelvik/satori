import cssColorParse from 'parse-css-color'
import { buildXMLString, lengthToNumber } from '../utils.js'
import { parseFilterList, type ParsedFilterFunction } from '../parser/filter.js'
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

type TransferChannel =
  | { type: 'identity' }
  | { type: 'linear'; slope: number; intercept?: number }

interface FilterPrimitiveContext {
  inputId: string
  resultId: string
  style: SerializedStyle
  inheritedStyle: SerializedStyle
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

function clampNonNegative(value: number): number {
  return Math.max(0, value)
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

function buildTransferChannel(
  name: 'R' | 'G' | 'B' | 'A',
  channel: TransferChannel
): string {
  if (channel.type === 'identity') {
    return buildXMLString(`feFunc${name}`, {
      type: 'identity',
    })
  }

  return buildXMLString(`feFunc${name}`, {
    type: 'linear',
    slope: channel.slope,
    intercept: channel.intercept ?? 0,
  })
}

function buildComponentTransferPrimitive(
  context: FilterPrimitiveContext,
  channels: {
    r: TransferChannel
    g: TransferChannel
    b: TransferChannel
    a: TransferChannel
  }
): string {
  return buildXMLString(
    'feComponentTransfer',
    {
      in: context.inputId,
      result: context.resultId,
    },
    buildTransferChannel('R', channels.r) +
      buildTransferChannel('G', channels.g) +
      buildTransferChannel('B', channels.b) +
      buildTransferChannel('A', channels.a)
  )
}

function buildFilterPrimitive(
  current: ParsedFilterFunction,
  context: FilterPrimitiveContext
): string | null {
  if (current.type === 'blur') {
    const radius = resolveLength(
      current.radius,
      context.style,
      context.inheritedStyle
    )
    if (typeof radius !== 'number' || radius <= 0) {
      return null
    }

    return buildXMLString('feGaussianBlur', {
      in: context.inputId,
      stdDeviation: radius,
      result: context.resultId,
    })
  }

  if (current.type === 'brightness') {
    const amount = clampNonNegative(current.amount)
    return buildComponentTransferPrimitive(context, {
      r: { type: 'linear', slope: amount, intercept: 0 },
      g: { type: 'linear', slope: amount, intercept: 0 },
      b: { type: 'linear', slope: amount, intercept: 0 },
      a: { type: 'identity' },
    })
  }

  if (current.type === 'contrast') {
    const amount = clampNonNegative(current.amount)
    const intercept = 0.5 - 0.5 * amount
    return buildComponentTransferPrimitive(context, {
      r: { type: 'linear', slope: amount, intercept },
      g: { type: 'linear', slope: amount, intercept },
      b: { type: 'linear', slope: amount, intercept },
      a: { type: 'identity' },
    })
  }

  if (current.type === 'saturate') {
    return buildXMLString('feColorMatrix', {
      in: context.inputId,
      type: 'saturate',
      values: clampNonNegative(current.amount),
      result: context.resultId,
    })
  }

  if (current.type === 'opacity') {
    const amount = clamp(current.amount, 0, 1)
    return buildComponentTransferPrimitive(context, {
      r: { type: 'identity' },
      g: { type: 'identity' },
      b: { type: 'identity' },
      a: { type: 'linear', slope: amount },
    })
  }

  if (current.type === 'drop-shadow') {
    const offsetX = resolveLength(
      current.offsetX,
      context.style,
      context.inheritedStyle
    )
    const offsetY = resolveLength(
      current.offsetY,
      context.style,
      context.inheritedStyle
    )
    const blurRadius = resolveLength(
      current.blurRadius,
      context.style,
      context.inheritedStyle
    )
    if (typeof offsetX !== 'number' || typeof offsetY !== 'number') {
      return null
    }

    const shadowColor = current.color || context.style.color || 'black'
    const { color, opacity } = extractFloodColor(shadowColor)

    return buildXMLString('feDropShadow', {
      in: context.inputId,
      dx: offsetX,
      dy: offsetY,
      stdDeviation:
        typeof blurRadius === 'number' && blurRadius > 0 ? blurRadius / 2 : 0,
      'flood-color': color,
      'flood-opacity': opacity,
      result: context.resultId,
    })
  }

  return null
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
    const resultId = `${filterId}-r${i}`
    const primitive = buildFilterPrimitive(parsed.filters[i], {
      inputId,
      resultId,
      style,
      inheritedStyle,
    })
    if (!primitive) continue

    primitives.push(primitive)
    inputId = resultId
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
