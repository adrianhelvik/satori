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

  const [r, g, b] = parsed.values
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
  if (!interpolation.startsWith('in ')) {
    throw new Error(
      `Invalid color-mix() interpolation method in "${expression}"`
    )
  }

  const colorSpace = interpolation.slice(3).trim()
  if (colorSpace !== 'srgb') {
    throw new Error(
      `Unsupported color-mix() color space "${colorSpace}". Only "srgb" is supported.`
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

  const r = Math.round(
    leftStop.rgb[0] * leftWeight + rightStop.rgb[0] * rightWeight
  )
  const g = Math.round(
    leftStop.rgb[1] * leftWeight + rightStop.rgb[1] * rightWeight
  )
  const b = Math.round(
    leftStop.rgb[2] * leftWeight + rightStop.rgb[2] * rightWeight
  )
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
