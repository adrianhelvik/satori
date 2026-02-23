import cssColorParse from 'parse-css-color'

import { splitByWhitespaceOutsideParens } from './css-value-parser.js'
import { splitEffects } from './utils.js'

interface WeightedColorStop {
  rgb: [number, number, number]
  alpha: number
  weight?: number
}

const COLOR_MIX_FUNCTION = 'color-mix('

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function roundTo(value: number, precision = 4): number {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360
  const saturation = clamp(s / 100, 0, 1)
  const lightness = clamp(l / 100, 0, 1)
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

function srgbToLinear(value: number): number {
  const v = clamp(value / 255, 0, 1)
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

function linearToSrgb(value: number): number {
  const v = clamp(value, 0, 1)
  return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055
}

function rgbToOklch(rgb: [number, number, number]): [number, number, number] {
  const [red, green, blue] = rgb.map(srgbToLinear)
  const l = 0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue
  const m = 0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue
  const s = 0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue

  const lCbrt = Math.cbrt(l)
  const mCbrt = Math.cbrt(m)
  const sCbrt = Math.cbrt(s)

  const L = 0.2104542553 * lCbrt + 0.793617785 * mCbrt - 0.0040720468 * sCbrt
  const A = 1.9779984951 * lCbrt - 2.428592205 * mCbrt + 0.4505937099 * sCbrt
  const B = 0.0259040371 * lCbrt + 0.7827717662 * mCbrt - 0.808675766 * sCbrt

  const chroma = Math.sqrt(A * A + B * B)
  const hue = (Math.atan2(B, A) * 180) / Math.PI

  return [L, chroma, hue < 0 ? hue + 360 : hue]
}

function oklchToRgb(
  l: number,
  chroma: number,
  hue: number
): [number, number, number] {
  const hueRadians = (hue * Math.PI) / 180
  const a = chroma * Math.cos(hueRadians)
  const b = chroma * Math.sin(hueRadians)

  const lCbrt = l + 0.3963377774 * a + 0.2158037573 * b
  const mCbrt = l - 0.1055613458 * a - 0.0638541728 * b
  const sCbrt = l - 0.0894841775 * a - 1.291485548 * b

  const linearR = lCbrt ** 3
  const linearG = mCbrt ** 3
  const linearB = sCbrt ** 3

  const red =
    4.0767416621 * linearR - 3.3077115913 * linearG + 0.2309699292 * linearB
  const green =
    -1.2684380046 * linearR + 2.6097574011 * linearG - 0.3413193965 * linearB
  const blue =
    -0.0041960863 * linearR - 0.7034186147 * linearG + 1.707614701 * linearB

  return [
    clamp(linearToSrgb(red), 0, 1) * 255,
    clamp(linearToSrgb(green), 0, 1) * 255,
    clamp(linearToSrgb(blue), 0, 1) * 255,
  ]
}

function interpolateHueShortest(from: number, to: number, t: number): number {
  const normalizedFrom = from % 360
  const normalizedTo = to % 360
  const diff = ((normalizedTo - normalizedFrom + 540) % 360) - 180
  return (normalizedFrom + diff * t + 360) % 360
}

function parsePercentageToken(token: string): number | undefined {
  const normalized = token.trim()
  if (!/^[-+]?(?:\d+\.?\d*|\.\d+)%$/.test(normalized)) return

  const value = Number.parseFloat(normalized.slice(0, -1))
  if (!Number.isFinite(value)) return
  return value
}

function parseWeightedColorStop(
  input: string,
  expression: string
): WeightedColorStop {
  const normalized = input.trim()
  if (!normalized) {
    throw new Error(`Invalid color-mix() color stop in "${expression}"`)
  }

  const tokens = splitByWhitespaceOutsideParens(normalized)
  let weight: number | undefined
  let colorValue = normalized

  if (tokens.length > 1) {
    const maybeWeight = parsePercentageToken(tokens[tokens.length - 1])
    if (typeof maybeWeight === 'number') {
      weight = maybeWeight
      colorValue = tokens.slice(0, -1).join(' ').trim()
    }
  }

  const parsed = cssColorParse(colorValue)
  if (!parsed) {
    throw new Error(
      `Invalid color "${colorValue}" in color-mix() expression "${expression}"`
    )
  }

  const [r, g, b] =
    parsed.type === 'hsl'
      ? hslToRgb(parsed.values[0], parsed.values[1], parsed.values[2])
      : parsed.values
  const alphaFromValues = parsed.values[3]
  const alpha =
    typeof parsed.alpha === 'number'
      ? parsed.alpha
      : typeof alphaFromValues === 'number'
      ? alphaFromValues
      : 1

  return {
    rgb: [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)],
    alpha: clamp(alpha, 0, 1),
    weight,
  }
}

function resolveNormalizedWeights(
  leftWeight: number | undefined,
  rightWeight: number | undefined,
  expression: string
): [number, number] {
  let left: number
  let right: number

  if (typeof leftWeight !== 'number' && typeof rightWeight !== 'number') {
    left = 50
    right = 50
  } else if (
    typeof leftWeight === 'number' &&
    typeof rightWeight === 'number'
  ) {
    left = leftWeight
    right = rightWeight
  } else if (typeof leftWeight === 'number') {
    left = leftWeight
    right = 100 - leftWeight
  } else {
    right = rightWeight as number
    left = 100 - right
  }

  if (left < 0 || right < 0) {
    throw new Error(
      `Invalid percentage weights in color-mix() expression "${expression}"`
    )
  }

  const total = left + right
  if (total <= 0) {
    throw new Error(
      `Invalid percentage weights in color-mix() expression "${expression}"`
    )
  }

  return [left / total, right / total]
}

function findMatchingParen(input: string, openIndex: number): number {
  let depth = 0
  for (let i = openIndex; i < input.length; i++) {
    if (input[i] === '(') depth++
    if (input[i] === ')') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

function evaluateColorMixFunction(expression: string): string {
  const openIndex = expression.indexOf('(')
  const closeIndex = expression.lastIndexOf(')')
  if (openIndex < 0 || closeIndex <= openIndex) {
    throw new Error(`Invalid color-mix() expression "${expression}"`)
  }

  const body = expression.slice(openIndex + 1, closeIndex).trim()
  const args = splitEffects(body)
  if (args.length !== 3) {
    throw new Error(
      `color-mix() currently supports exactly two colors in "${expression}"`
    )
  }

  const interpolation = args[0].trim().toLowerCase()
  const interpolationMatch = /^in\s+(.+)$/i.exec(interpolation)
  if (!interpolationMatch) {
    throw new Error(
      `Invalid color-mix() interpolation method in "${expression}"`
    )
  }

  const colorSpace = interpolationMatch[1].trim().toLowerCase()
  if (colorSpace !== 'srgb' && colorSpace !== 'oklch') {
    throw new Error(
      `Unsupported color-mix() color space "${colorSpace}". Only "srgb" and "oklch" are supported.`
    )
  }

  const leftStop = parseWeightedColorStop(
    resolveColorMixFunctions(args[1]),
    expression
  )
  const rightStop = parseWeightedColorStop(
    resolveColorMixFunctions(args[2]),
    expression
  )
  const [leftWeight, rightWeight] = resolveNormalizedWeights(
    leftStop.weight,
    rightStop.weight,
    expression
  )

  let r = 0
  let g = 0
  let b = 0

  if (colorSpace === 'srgb') {
    r = Math.round(
      leftStop.rgb[0] * leftWeight + rightStop.rgb[0] * rightWeight
    )
    g = Math.round(
      leftStop.rgb[1] * leftWeight + rightStop.rgb[1] * rightWeight
    )
    b = Math.round(
      leftStop.rgb[2] * leftWeight + rightStop.rgb[2] * rightWeight
    )
  } else {
    const leftOklch = rgbToOklch(leftStop.rgb)
    const rightOklch = rgbToOklch(rightStop.rgb)
    const mixedOklch: [number, number, number] = [
      leftOklch[0] * leftWeight + rightOklch[0] * rightWeight,
      leftOklch[1] * leftWeight + rightOklch[1] * rightWeight,
      interpolateHueShortest(leftOklch[2], rightOklch[2], rightWeight),
    ]
    const mixedRgb = oklchToRgb(...mixedOklch)
    ;[r, g, b] = mixedRgb.map((value) => Math.round(value))
  }

  const a = roundTo(
    leftStop.alpha * leftWeight + rightStop.alpha * rightWeight,
    4
  )

  return `rgba(${clamp(r, 0, 255)}, ${clamp(g, 0, 255)}, ${clamp(
    b,
    0,
    255
  )}, ${clamp(a, 0, 1)})`
}

export function resolveColorMixFunctions(value: string): string {
  if (!value.toLowerCase().includes(COLOR_MIX_FUNCTION)) {
    return value
  }

  let result = value
  let searchStart = 0

  for (;;) {
    const lower = result.toLowerCase()
    const fnIndex = lower.indexOf(COLOR_MIX_FUNCTION, searchStart)
    if (fnIndex < 0) break

    const openIndex = fnIndex + COLOR_MIX_FUNCTION.length - 1
    const closeIndex = findMatchingParen(result, openIndex)
    if (closeIndex < 0) {
      throw new Error(`Unclosed color-mix() function in "${value}"`)
    }

    const expression = result.slice(fnIndex, closeIndex + 1)
    const replacement = evaluateColorMixFunction(expression)
    result =
      result.slice(0, fnIndex) + replacement + result.slice(closeIndex + 1)
    searchStart = fnIndex + replacement.length
  }

  return result
}
