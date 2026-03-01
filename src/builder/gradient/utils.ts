import { lengthToNumber } from '../../utils.js'
import cssColorParse from 'parse-css-color'
import type { ColorStop } from 'css-gradient-parser'

export interface Stop {
  color: string
  offset?: number
  opacity?: number
}

interface ParsedStop {
  color: [number, number, number]
  opacity: number
  offset: number
}

function toRounded(value: number, precision = 6): number {
  const factor = Math.pow(10, precision)
  return Math.round(value * factor) / factor
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function clampColor(value: number): number {
  return Math.max(0, Math.min(255, value))
}

function toPremultipliedStop(parsedStop: ParsedStop): Stop {
  const [r, g, b] = parsedStop.color
  const opacity = clamp01(parsedStop.opacity)
  return {
    offset: parsedStop.offset,
    color: `rgb(${toRounded(clampColor(r), 3)},${toRounded(
      clampColor(g),
      3
    )},${toRounded(clampColor(b), 3)})`,
    ...(opacity !== 1 ? { opacity: toRounded(opacity) } : {}),
  }
}

// SVG gradient interpolation differs from CSS when transparent colors are
// involved (CSS uses premultiplied interpolation). Approximate CSS behavior by
// inserting intermediate premultiplied stops.
function approximatePremultipliedStops(stops: Stop[]): Stop[] {
  if (stops.length < 2) return stops

  const parsedStops: ParsedStop[] = []
  for (const stop of stops) {
    if (typeof stop.offset !== 'number') return stops
    const parsed = cssColorParse(stop.color)
    if (!parsed) return stops
    const opacity = clamp01(stop.opacity ?? parsed.alpha ?? 1)
    parsedStops.push({
      color: [
        clampColor(parsed.values[0]),
        clampColor(parsed.values[1]),
        clampColor(parsed.values[2]),
      ],
      opacity,
      offset: clamp01(stop.offset),
    })
  }

  if (!parsedStops.some((stop) => stop.opacity < 1)) {
    return parsedStops.map(toPremultipliedStop)
  }

  const expandedStops: Stop[] = []
  for (let i = 0; i < parsedStops.length - 1; i++) {
    const current = parsedStops[i]
    const next = parsedStops[i + 1]
    const offsetDelta = next.offset - current.offset

    // Zero-length segments represent hard stops; keep both boundaries.
    if (Math.abs(offsetDelta) <= 1e-6) {
      if (!expandedStops.length) {
        expandedStops.push(toPremultipliedStop(current))
      }
      expandedStops.push(toPremultipliedStop(next))
      continue
    }

    const [r1, g1, b1] = current.color
    const [r2, g2, b2] = next.color
    const alphaDelta = Math.abs(next.opacity - current.opacity)
    const channelDelta = Math.max(
      Math.abs(r2 - r1),
      Math.abs(g2 - g1),
      Math.abs(b2 - b1)
    )
    const steps = Math.max(
      1,
      Math.min(24, Math.ceil(alphaDelta * 14 + channelDelta / 50))
    )

    for (let step = 0; step <= steps; step++) {
      if (i > 0 && step === 0) continue
      const t = step / steps
      const opacity = current.opacity + (next.opacity - current.opacity) * t
      const premulR =
        r1 * current.opacity + (r2 * next.opacity - r1 * current.opacity) * t
      const premulG =
        g1 * current.opacity + (g2 * next.opacity - g1 * current.opacity) * t
      const premulB =
        b1 * current.opacity + (b2 * next.opacity - b1 * current.opacity) * t

      const resolvedColor: [number, number, number] =
        opacity > 1e-6
          ? [
              clampColor(premulR / opacity),
              clampColor(premulG / opacity),
              clampColor(premulB / opacity),
            ]
          : [0, 0, 0]

      expandedStops.push(
        toPremultipliedStop({
          offset: current.offset + offsetDelta * t,
          opacity,
          color: resolvedColor,
        })
      )
    }
  }

  return expandedStops
}

export function resolveSolidColorFromStops(stops: Stop[]): string | undefined {
  if (!stops.length) return

  const firstParsed = cssColorParse(stops[0].color)
  if (!firstParsed) return

  const [r, g, b] = firstParsed.values
  const firstOpacity = stops[0].opacity ?? firstParsed.alpha ?? 1

  for (let i = 1; i < stops.length; i++) {
    const parsed = cssColorParse(stops[i].color)
    if (!parsed) return
    const [sr, sg, sb] = parsed.values
    const opacity = stops[i].opacity ?? parsed.alpha ?? 1
    if (sr !== r || sg !== g || sb !== b) return
    if (Math.abs(opacity - firstOpacity) > 1e-6) return
  }

  return `rgba(${r},${g},${b},${firstOpacity})`
}

export function normalizeStops(
  totalLength: number,
  colorStops: ColorStop[],
  inheritedStyle: Record<string, string | number>,
  repeating: boolean,
  from?: 'background' | 'mask',
  maskMode?: string,
  viewport?: { width: number; height: number }
) {
  // Resolve the color stops based on the spec:
  // https://drafts.csswg.org/css-images/#color-stop-syntax
  const stops: Stop[] = []
  const lastColorStop = colorStops.at(-1)
  const totalPercentage =
    lastColorStop &&
    lastColorStop.offset &&
    lastColorStop.offset.unit === '%' &&
    repeating
      ? +lastColorStop.offset.value
      : 100
  for (const stop of colorStops) {
    const { color } = stop
    if (!stops.length) {
      // First stop, ensure it's at the start.
      stops.push({
        offset: 0,
        color,
      })

      if (!stop.offset) continue
      if (stop.offset.value === '0') continue
    }

    // All offsets are relative values (0-1) in SVG.
    const offset =
      typeof stop.offset === 'undefined'
        ? undefined
        : stop.offset.unit === '%'
        ? +stop.offset.value / totalPercentage
        : Number(
            lengthToNumber(
              `${stop.offset.value}${stop.offset.unit}`,
              inheritedStyle.fontSize as number,
              totalLength,
              inheritedStyle,
              true,
              viewport
            )
          ) / totalLength

    stops.push({
      offset,
      color,
    })
  }
  if (!stops.length) {
    stops.push({
      offset: 0,
      color: 'transparent',
    })
  }
  // Last stop, ensure it's at the end.
  const lastStop = stops[stops.length - 1]
  if (lastStop.offset !== 1) {
    if (typeof lastStop.offset === 'undefined') {
      lastStop.offset = 1
    } else if (repeating) {
      stops[stops.length - 1] = {
        offset: 1,
        color: lastStop.color,
      }
    } else {
      stops.push({
        offset: 1,
        color: lastStop.color,
      })
    }
  }

  let previousStop = 0
  let nextStop = 1
  // Evenly distribute the missing stop offsets.
  for (let i = 0; i < stops.length; i++) {
    if (typeof stops[i].offset === 'undefined') {
      // Find the next stop that has an offset.
      if (nextStop < i) nextStop = i
      while (typeof stops[nextStop].offset === 'undefined') nextStop++

      stops[i].offset =
        ((stops[nextStop].offset - stops[previousStop].offset) /
          (nextStop - previousStop)) *
          (i - previousStop) +
        stops[previousStop].offset
    } else {
      previousStop = i
    }
  }

  if (from === 'mask') {
    const normalizedMaskMode = String(maskMode || '')
      .trim()
      .toLowerCase()
    const isAlphaMaskMode =
      !normalizedMaskMode ||
      normalizedMaskMode === 'alpha' ||
      normalizedMaskMode === 'match-source'

    if (isAlphaMaskMode) {
      return stops.map((stop) => {
        const color = cssColorParse(stop.color)
        if (!color) return stop
        if (color.alpha === 0) {
          return { ...stop, color: `rgba(0, 0, 0, 1)` }
        } else {
          return { ...stop, color: `rgba(255, 255, 255, ${color.alpha})` }
        }
      })
    }
  }

  return approximatePremultipliedStops(stops)
}
