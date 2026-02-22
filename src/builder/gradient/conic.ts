import { parseConicGradient, type ColorStop } from 'css-gradient-parser'
import cssColorParse from 'parse-css-color'
import valueParser from 'postcss-value-parser'

import { buildXMLString, calcDegree, lengthToNumber } from '../../utils.js'
import { splitByWhitespaceOutsideParens } from '../../css-value-parser.js'
import {
  type RepeatMode,
  resolveBackgroundAxisTiling,
} from '../background-repeat.js'
import { resolveSolidColorFromStops, type Stop } from './utils.js'

interface ConicStop extends Stop {
  offset: number
}

interface ParsedRGBA {
  r: number
  g: number
  b: number
  a: number
}

interface InterpolationStop extends ConicStop {
  parsed: ParsedRGBA | null
}

interface RawConicStop {
  color: string
  offset?: number
}

function toRounded(value: number, precision = 6): number {
  const factor = Math.pow(10, precision)
  return Math.round(value * factor) / factor
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function positiveModulo(value: number, divisor: number): number {
  if (!Number.isFinite(divisor) || divisor === 0) return value
  const result = value % divisor
  return result < 0 ? result + divisor : result
}

function parseColorWithOpacity(stop: ConicStop): ParsedRGBA | null {
  const parsed = cssColorParse(stop.color)
  if (!parsed) return null

  const [r, g, b] = parsed.values
  return {
    r,
    g,
    b,
    a: stop.opacity ?? parsed.alpha ?? 1,
  }
}

function interpolateStops(
  start: InterpolationStop,
  end: InterpolationStop,
  ratio: number
): ConicStop {
  if (!start.parsed || !end.parsed) {
    return ratio < 0.5
      ? { color: start.color, offset: 0, opacity: start.opacity }
      : { color: end.color, offset: 0, opacity: end.opacity }
  }

  const clampedRatio = clamp(ratio, 0, 1)
  const alpha = start.parsed.a + (end.parsed.a - start.parsed.a) * clampedRatio
  const premulStartR = start.parsed.r * start.parsed.a
  const premulStartG = start.parsed.g * start.parsed.a
  const premulStartB = start.parsed.b * start.parsed.a
  const premulEndR = end.parsed.r * end.parsed.a
  const premulEndG = end.parsed.g * end.parsed.a
  const premulEndB = end.parsed.b * end.parsed.a

  const premulR = premulStartR + (premulEndR - premulStartR) * clampedRatio
  const premulG = premulStartG + (premulEndG - premulStartG) * clampedRatio
  const premulB = premulStartB + (premulEndB - premulStartB) * clampedRatio

  const r = alpha > 1e-6 ? premulR / alpha : 0
  const g = alpha > 1e-6 ? premulG / alpha : 0
  const b = alpha > 1e-6 ? premulB / alpha : 0
  const roundedR = Math.round(clamp(r, 0, 255))
  const roundedG = Math.round(clamp(g, 0, 255))
  const roundedB = Math.round(clamp(b, 0, 255))

  return {
    color: `rgb(${roundedR},${roundedG},${roundedB})`,
    opacity:
      Math.abs(alpha - 1) <= 1e-6
        ? undefined
        : toRounded(clamp(alpha, 0, 1), 6),
    offset: 0,
  }
}

export function parseConicStopOffset(
  offset: ColorStop['offset'] | undefined
): number | undefined {
  if (!offset) return

  const raw = parseFloat(offset.value)
  if (!Number.isFinite(raw)) return

  switch (offset.unit) {
    case 'deg':
      return raw / 360
    case 'grad':
      return raw / 400
    case 'turn':
      return raw
    case 'rad':
      return raw / (Math.PI * 2)
    case '%':
      return raw / 100
    default:
      return
  }
}

const CONIC_OFFSET_TOKEN_RE =
  /^([-+]?(?:\d+\.?\d*|\.\d+))(deg|grad|turn|rad|%)?$/i

function parseConicOffsetToken(token: string): number | undefined {
  const normalized = token.trim().toLowerCase()
  if (!normalized) return

  const match = normalized.match(CONIC_OFFSET_TOKEN_RE)
  if (!match) return
  const raw = parseFloat(match[1])
  if (!Number.isFinite(raw)) return

  const unit = (match[2] || '').toLowerCase()
  if (!unit && raw !== 0) return

  switch (unit) {
    case '':
    case 'deg':
      return raw / 360
    case 'grad':
      return raw / 400
    case 'turn':
      return raw
    case 'rad':
      return raw / (Math.PI * 2)
    case '%':
      return raw / 100
    default:
      return
  }
}

function splitTopLevelFunctionArgs(nodes: valueParser.Node[]): string[] {
  const args: string[] = []
  let current: valueParser.Node[] = []

  for (const node of nodes) {
    if (node.type === 'div' && node.value === ',') {
      const segment = valueParser.stringify(current).trim()
      if (segment) args.push(segment)
      current = []
      continue
    }
    current.push(node)
  }

  const trailing = valueParser.stringify(current).trim()
  if (trailing) args.push(trailing)
  return args
}

function parseConicStopSegment(segment: string): RawConicStop[] {
  const tokens = splitByWhitespaceOutsideParens(segment.trim())
  if (!tokens.length) return []

  const trailingOffsets: string[] = []
  for (let i = tokens.length - 1; i >= 0 && trailingOffsets.length < 2; i--) {
    if (parseConicOffsetToken(tokens[i]) === undefined) break
    trailingOffsets.unshift(tokens[i])
  }

  const color = tokens
    .slice(0, tokens.length - trailingOffsets.length)
    .join(' ')
    .trim()
  if (!color) return []

  if (!trailingOffsets.length) return [{ color }]

  const first = parseConicOffsetToken(trailingOffsets[0])
  if (first === undefined) return [{ color }]
  if (trailingOffsets.length === 1) {
    return [{ color, offset: first }]
  }

  const second = parseConicOffsetToken(trailingOffsets[1])
  if (second === undefined) {
    return [{ color, offset: first }]
  }
  return [
    { color, offset: first },
    { color, offset: second },
  ]
}

export function parseConicStopsFromSource(image: string): RawConicStop[] {
  const parsed = valueParser(image.trim())
  const rootFn = parsed.nodes.find(
    (node): node is valueParser.FunctionNode =>
      node.type === 'function' &&
      (node.value.toLowerCase() === 'conic-gradient' ||
        node.value.toLowerCase() === 'repeating-conic-gradient')
  )
  if (!rootFn) return []

  const segments = splitTopLevelFunctionArgs(rootFn.nodes)
  if (!segments.length) return []
  const startsWithPreamble = /^(from|at)\b/i.test(segments[0])
  const stopSegments = segments.slice(startsWithPreamble ? 1 : 0)
  if (!stopSegments.length) return []

  return stopSegments.flatMap(parseConicStopSegment)
}

function resolveConicInputStops(
  image: string,
  stops: ColorStop[]
): RawConicStop[] {
  const parsedFromSource = parseConicStopsFromSource(image)
  if (parsedFromSource.length) return parsedFromSource

  return stops.map((stop) => ({
    color: stop.color,
    offset: parseConicStopOffset(stop.offset),
  }))
}

function isHorizontalKeyword(token: string): boolean {
  return token === 'left' || token === 'center' || token === 'right'
}

function isVerticalKeyword(token: string): boolean {
  return token === 'top' || token === 'center' || token === 'bottom'
}

function resolvePositionToken(
  token: string,
  axis: 'x' | 'y',
  axisLength: number,
  inheritableStyle: Record<string, number | string>
): number | undefined {
  if (axis === 'x') {
    if (token === 'left') return 0
    if (token === 'center') return axisLength / 2
    if (token === 'right') return axisLength
  } else {
    if (token === 'top') return 0
    if (token === 'center') return axisLength / 2
    if (token === 'bottom') return axisLength
  }

  return lengthToNumber(
    token,
    Number(inheritableStyle.fontSize) || 16,
    axisLength,
    inheritableStyle,
    true
  )
}

export function resolveConicPosition(
  position: string,
  width: number,
  height: number,
  inheritableStyle: Record<string, number | string>
): { x: number; y: number } {
  const tokens = String(position || 'center')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  const first = tokens[0] || 'center'
  const second = tokens[1]

  let xToken = first
  let yToken = second || 'center'
  if (!second) {
    if (first === 'top' || first === 'bottom') {
      xToken = 'center'
      yToken = first
    } else {
      xToken = first
      yToken = 'center'
    }
  } else if (isVerticalKeyword(first) && isHorizontalKeyword(second)) {
    xToken = second
    yToken = first
  }

  const x = resolvePositionToken(xToken, 'x', width, inheritableStyle)
  const y = resolvePositionToken(yToken, 'y', height, inheritableStyle)

  return {
    x: typeof x === 'number' ? x : width / 2,
    y: typeof y === 'number' ? y : height / 2,
  }
}

function normalizeConicStopOffsets(
  colorStops: RawConicStop[],
  repeating: boolean
): { stops: ConicStop[]; cycle: number } {
  const stops: ConicStop[] = colorStops.map((stop) => ({
    color: stop.color,
    offset: stop.offset ?? NaN,
  }))

  if (!stops.length) {
    return {
      stops: [
        { color: 'transparent', offset: 0 },
        { color: 'transparent', offset: repeating ? 1 : 1 },
      ],
      cycle: 1,
    }
  }

  if (stops.length === 1) {
    stops.push({
      color: stops[0].color,
      offset: repeating ? 1 : 1,
    })
  }

  if (!Number.isFinite(stops[0].offset)) {
    stops[0].offset = 0
  }

  let previousDefined = stops[0].offset
  for (let i = 1; i < stops.length; i++) {
    if (!Number.isFinite(stops[i].offset)) continue
    if (stops[i].offset < previousDefined) {
      stops[i].offset = previousDefined
    }
    previousDefined = stops[i].offset
  }

  for (let i = 0; i < stops.length; i++) {
    if (Number.isFinite(stops[i].offset)) continue

    const startIndex = i - 1
    let endIndex = i
    while (
      endIndex < stops.length &&
      !Number.isFinite(stops[endIndex].offset)
    ) {
      endIndex++
    }

    const startOffset = startIndex >= 0 ? stops[startIndex].offset : 0
    const trailingRun = endIndex >= stops.length
    const endOffset = !trailingRun
      ? stops[endIndex].offset
      : repeating
      ? startOffset + 1
      : 1
    const gap = endIndex - startIndex
    const divisor = trailingRun ? Math.max(1, gap - 1) : gap

    for (let k = 1; k < gap; k++) {
      stops[startIndex + k].offset =
        startOffset + ((endOffset - startOffset) * k) / divisor
    }

    i = endIndex - 1
  }

  for (const stop of stops) {
    if (!Number.isFinite(stop.offset)) stop.offset = repeating ? 1 : 1
    stop.offset = Math.max(0, stop.offset)
  }

  if (!repeating) {
    for (const stop of stops) {
      stop.offset = clamp(stop.offset, 0, 1)
    }
    for (let i = 1; i < stops.length; i++) {
      if (stops[i].offset < stops[i - 1].offset) {
        stops[i].offset = stops[i - 1].offset
      }
    }

    if (stops[0].offset > 0) {
      stops.unshift({ color: stops[0].color, offset: 0 })
    } else {
      stops[0].offset = 0
    }

    const last = stops[stops.length - 1]
    if (last.offset < 1) {
      stops.push({ color: last.color, offset: 1 })
    } else {
      last.offset = 1
    }

    return { stops, cycle: 1 }
  }

  let cycle = stops[stops.length - 1].offset
  if (!Number.isFinite(cycle) || cycle <= 0) {
    cycle = 1
  }

  if (stops[0].offset > 0) {
    stops.unshift({ color: stops[0].color, offset: 0 })
  } else {
    stops[0].offset = 0
  }

  const lastOffset = stops[stops.length - 1].offset
  if (lastOffset < cycle) {
    stops.push({
      color: stops[stops.length - 1].color,
      offset: cycle,
    })
  }

  return { stops, cycle }
}

function normalizeMaskMode(mode: string | undefined): string {
  return String(mode || '')
    .trim()
    .toLowerCase()
}

export function normalizeConicStops(
  colorStops: RawConicStop[],
  repeating: boolean,
  from?: 'background' | 'mask',
  maskMode?: string
): { stops: ConicStop[]; cycle: number } {
  const { stops, cycle } = normalizeConicStopOffsets(colorStops, repeating)
  const normalizedMaskMode = normalizeMaskMode(maskMode)
  const useAlphaMaskMode =
    from === 'mask' &&
    (!normalizedMaskMode ||
      normalizedMaskMode === 'alpha' ||
      normalizedMaskMode === 'match-source')
  if (!useAlphaMaskMode) {
    return { stops, cycle }
  }

  return {
    cycle,
    stops: stops.map((stop) => {
      const parsed = cssColorParse(stop.color)
      if (!parsed) return stop
      return {
        ...stop,
        color: '#fff',
        opacity: parsed.alpha ?? 1,
      }
    }),
  }
}

function resolveColorAtOffset(
  offset: number,
  stops: InterpolationStop[]
): ConicStop {
  if (offset <= stops[0].offset) {
    return {
      color: stops[0].color,
      opacity: stops[0].opacity,
      offset: stops[0].offset,
    }
  }

  for (let i = 1; i < stops.length; i++) {
    const previous = stops[i - 1]
    const current = stops[i]
    if (offset > current.offset) continue

    const segmentLength = current.offset - previous.offset
    if (segmentLength <= 1e-6) {
      return {
        color: current.color,
        opacity: current.opacity,
        offset: current.offset,
      }
    }

    const ratio = (offset - previous.offset) / segmentLength
    return interpolateStops(previous, current, ratio)
  }

  const last = stops[stops.length - 1]
  return {
    color: last.color,
    opacity: last.opacity,
    offset: last.offset,
  }
}

export function resolveConicColorAt(
  rawOffset: number,
  stops: ConicStop[],
  repeating: boolean,
  cycle: number
): ConicStop {
  const interpolationStops: InterpolationStop[] = stops.map((stop) => ({
    ...stop,
    parsed: parseColorWithOpacity(stop),
  }))
  const normalizedOffset = repeating
    ? positiveModulo(rawOffset, cycle)
    : clamp(rawOffset, 0, 1)
  return resolveColorAtOffset(normalizedOffset, interpolationStops)
}

function resolveConicRadius(
  width: number,
  height: number,
  centerX: number,
  centerY: number
): number {
  const corners = [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ]
  return Math.max(
    ...corners.map(([x, y]) => Math.hypot(x - centerX, y - centerY)),
    1
  )
}

function resolveSegmentCount(
  radius: number,
  stopCount: number,
  repeating: boolean,
  cycle: number
): number {
  const circumference = 2 * Math.PI * Math.max(radius, 1)
  const repeats = repeating
    ? Math.max(1, Math.ceil(1 / Math.max(cycle, 0.001)))
    : 1
  const geometric = Math.ceil(circumference / 2)
  const byStops = Math.max(120, stopCount * 24) * repeats
  return clamp(Math.max(geometric, byStops), 180, 1440)
}

export function buildConicGradient(
  {
    id,
    width,
    height,
    repeatModes,
  }: {
    id: string
    width: number
    height: number
    repeatModes: { x: RepeatMode; y: RepeatMode }
  },
  image: string,
  dimensions: number[],
  offsets: number[],
  inheritableStyle: Record<string, number | string>,
  from?: 'background' | 'mask',
  maskMode?: string
): [string, string, string?, string?] {
  const parsed = parseConicGradient(image)
  const [baseImageWidth, baseImageHeight] = dimensions
  const xAxis = resolveBackgroundAxisTiling({
    mode: repeatModes.x,
    areaSize: width,
    tileSize: baseImageWidth,
    offset: offsets[0],
    origin: 0,
  })
  const yAxis = resolveBackgroundAxisTiling({
    mode: repeatModes.y,
    areaSize: height,
    tileSize: baseImageHeight,
    offset: offsets[1],
    origin: 0,
  })

  const imageWidth = xAxis.imageSize
  const imageHeight = yAxis.imageSize
  const { x: centerX, y: centerY } = resolveConicPosition(
    parsed.position,
    imageWidth,
    imageHeight,
    inheritableStyle
  )
  const resolvedInputStops = resolveConicInputStops(image, parsed.stops)
  const { stops, cycle } = normalizeConicStops(
    resolvedInputStops,
    parsed.repeating,
    from,
    maskMode
  )
  const startOffset = positiveModulo(calcDegree(parsed.angle) / 360, 1)
  const radius = resolveConicRadius(imageWidth, imageHeight, centerX, centerY)
  const segmentCount = resolveSegmentCount(
    radius,
    stops.length,
    parsed.repeating,
    cycle
  )

  const originX = xAxis.imageOffset
  const originY = yAxis.imageOffset
  const absoluteCenterX = originX + centerX
  const absoluteCenterY = originY + centerY
  const sectors: string[] = []
  for (let i = 0; i < segmentCount; i++) {
    const rawStart = i / segmentCount
    const rawEnd = (i + 1) / segmentCount
    const sampleOffset = (rawStart + rawEnd) / 2
    const resolved = resolveConicColorAt(
      sampleOffset,
      stops,
      parsed.repeating,
      cycle
    )
    const startAngle = (rawStart + startOffset) * Math.PI * 2 - Math.PI / 2
    const endAngle = (rawEnd + startOffset) * Math.PI * 2 - Math.PI / 2
    const x1 = absoluteCenterX + radius * Math.cos(startAngle)
    const y1 = absoluteCenterY + radius * Math.sin(startAngle)
    const x2 = absoluteCenterX + radius * Math.cos(endAngle)
    const y2 = absoluteCenterY + radius * Math.sin(endAngle)

    sectors.push(
      buildXMLString('path', {
        d: `M ${toRounded(absoluteCenterX, 4)} ${toRounded(
          absoluteCenterY,
          4
        )} L ${toRounded(x1, 4)} ${toRounded(y1, 4)} L ${toRounded(
          x2,
          4
        )} ${toRounded(y2, 4)} Z`,
        fill: resolved.color,
        ...(resolved.opacity !== undefined && {
          'fill-opacity': resolved.opacity,
        }),
      })
    )
  }

  const patternId = `satori_pattern_${id}`
  const clipPathId = `satori_conic_cp-${id}`
  const defs = buildXMLString(
    'pattern',
    {
      id: patternId,
      x: xAxis.patternOffset,
      y: yAxis.patternOffset,
      width: xAxis.patternSize,
      height: yAxis.patternSize,
      patternUnits: 'userSpaceOnUse',
      patternContentUnits: 'userSpaceOnUse',
    },
    buildXMLString(
      'clipPath',
      {
        id: clipPathId,
      },
      buildXMLString('rect', {
        x: originX,
        y: originY,
        width: imageWidth,
        height: imageHeight,
      })
    ) +
      buildXMLString(
        'g',
        {
          'clip-path': `url(#${clipPathId})`,
          'shape-rendering': 'crispEdges',
        },
        sectors.join('')
      )
  )

  return [patternId, defs, undefined, resolveSolidColorFromStops(stops)]
}
