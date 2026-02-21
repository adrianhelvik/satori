/**
 * This module expands the CSS properties to get rid of shorthands, as well as
 * cleaning up some properties.
 */

import { getPropertyName, getStylesForProperty } from 'css-to-react-native'
import { parseElementStyle } from 'css-background-parser'
import { parse as parseBoxShadow } from 'css-box-shadow'
import cssColorParse from 'parse-css-color'

import CssDimension from '../vendor/parse-css-dimension/index.js'
import parseTransformOrigin from '../transform-origin.js'
import type { TransformDescriptor } from '../builder/transform.js'
import { isTransformInput } from '../builder/transform.js'
import { isString, lengthToNumber, v, splitEffects } from '../utils.js'
import { parseMask } from '../parser/mask.js'
import {
  parseListStylePositionValue,
  parseListStyleShorthand,
  parseListStyleTypeValue,
} from './list-style.js'
import { applyAllReset } from './all-property.js'
import type { SerializedStyle } from './style-types.js'
import {
  resolveLogicalProperty,
  type SpecialCaseResult,
} from './logical-properties.js'

export type { BackgroundClipPathRef, SerializedStyle } from './style-types.js'

// https://react-cn.github.io/react/tips/style-props-value-px.html
const optOutPx = new Set([
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'fontWeight',
  'lineHeight',
  'opacity',
  'scale',
  'scaleX',
  'scaleY',
  'aspectRatio',
])
const keepNumber = new Set(['lineHeight'])
function handleFallbackColor(
  prop: string,
  parsed: Record<string, string>,
  rawInput: string,
  currentColor: string
) {
  if (
    prop === 'textDecoration' &&
    !rawInput.includes(parsed.textDecorationColor)
  ) {
    parsed.textDecorationColor = currentColor
  }
  return parsed
}

function purify(name: string, value?: string | number) {
  const num = Number(value)
  if (isNaN(num)) return value
  if (!optOutPx.has(name)) return num + 'px'
  if (keepNumber.has(name)) return num
  return String(value)
}

function parseAlignmentValue(
  tokens: string[],
  startIndex: number
): {
  value?: string
  nextIndex: number
} {
  const token = tokens[startIndex]
  if (!token) {
    return { nextIndex: startIndex }
  }

  const normalized = token.toLowerCase()
  if (
    (normalized === 'safe' || normalized === 'unsafe') &&
    tokens[startIndex + 1]
  ) {
    return {
      value: `${token} ${tokens[startIndex + 1]}`,
      nextIndex: startIndex + 2,
    }
  }

  return {
    value: token,
    nextIndex: startIndex + 1,
  }
}

function parsePlaceShorthandValues(value: string | number): {
  first?: string
  second?: string
} {
  const tokens = value.toString().trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return {}

  const first = parseAlignmentValue(tokens, 0)
  const second =
    first.nextIndex < tokens.length
      ? parseAlignmentValue(tokens, first.nextIndex)
      : undefined

  return {
    first: first.value,
    second: second?.value,
  }
}

const TRANSFORM_PERCENTAGE_RE = /(-?[\d.]+%)/g
const TRANSFORM_PLACEHOLDER_BASE = 987_654_000

type ParsedTransformStyle = {
  transform: { [type: string]: string | number | number[] }[]
}

function parseTransformWithPercentageSupport(
  value: string
): ParsedTransformStyle {
  const placeholders = new Map<number, string>()
  let placeholderIndex = 0
  const replaced = value.replace(TRANSFORM_PERCENTAGE_RE, (_, percentage) => {
    let placeholder = TRANSFORM_PLACEHOLDER_BASE + placeholderIndex++
    while (
      value.includes(`${placeholder}px`) ||
      placeholders.has(placeholder)
    ) {
      placeholder = TRANSFORM_PLACEHOLDER_BASE + placeholderIndex++
    }
    placeholders.set(placeholder, percentage)
    return `${placeholder}px`
  })
  const parsed = getStylesForProperty(
    'transform',
    replaced,
    true
  ) as ParsedTransformStyle

  for (const transform of parsed.transform || []) {
    for (const k in transform) {
      const token = transform[k]
      if (typeof token === 'number' && placeholders.has(token)) {
        transform[k] = placeholders.get(token)!
        continue
      }
      if (typeof token === 'string' && token.endsWith('px')) {
        const numeric = Number.parseFloat(token)
        if (!Number.isNaN(numeric) && placeholders.has(numeric)) {
          transform[k] = placeholders.get(numeric)!
        }
      }
    }
  }

  return parsed
}

type SimpleSpecialCaseResult = SpecialCaseResult
type SimpleSpecialCaseHandler = (
  value: string | number
) => SimpleSpecialCaseResult

const simpleSpecialCaseHandlers: Record<string, SimpleSpecialCaseHandler> = {
  outlineWidth: (value) => ({ outlineWidth: purify('outlineWidth', value) }),
  outlineStyle: (value) => ({ outlineStyle: value }),
  outlineColor: (value) => ({ outlineColor: value }),
  outlineOffset: (value) => ({ outlineOffset: purify('outlineOffset', value) }),

  listStyle: (value) => parseListStyleShorthand(value),
  listStyleType: (value) => {
    const parsedType = parseListStyleTypeValue(value)
    if (parsedType) {
      return { listStyleType: parsedType }
    }
  },
  listStylePosition: (value) => {
    const parsedPosition = parseListStylePositionValue(value)
    if (parsedPosition) {
      return { listStylePosition: parsedPosition }
    }
  },
  listStyleImage: (value) => ({ listStyleImage: String(value).trim() }),

  counterReset: (value) => ({ counterReset: String(value).trim() }),
  counterIncrement: (value) => ({ counterIncrement: String(value).trim() }),
  counterSet: (value) => ({ counterSet: String(value).trim() }),

  overflowWrap: (value) => ({ overflowWrap: value }),
  wordWrap: (value) => ({ overflowWrap: value }),
  textDecorationThickness: (value) => ({
    textDecorationThickness: purify('textDecorationThickness', value),
  }),
  textUnderlineOffset: (value) => ({
    textUnderlineOffset: purify('textUnderlineOffset', value),
  }),
  textUnderlinePosition: (value) => ({ textUnderlinePosition: value }),
  textDecorationLine: (value) => ({ textDecorationLine: value }),
  textDecorationStyle: (value) => ({ textDecorationStyle: value }),
  textDecorationColor: (value) => ({ textDecorationColor: value }),
  textAlignLast: (value) => ({ textAlignLast: value }),
  textJustify: (value) => ({ textJustify: value }),
  visibility: (value) => ({ visibility: value }),
  cursor: (value) => ({ cursor: String(value).trim() }),
  touchAction: (value) => ({ touchAction: String(value).trim() }),
  userSelect: (value) => ({ userSelect: String(value).trim() }),

  mixBlendMode: (value) => ({ mixBlendMode: value }),
  isolation: (value) => ({ isolation: value }),
  imageRendering: (value) => ({ imageRendering: value }),
  imageOrientation: (value) => ({ imageOrientation: value }),

  backgroundPositionX: (value) => ({
    backgroundPositionX: purify('backgroundPositionX', value),
  }),
  backgroundPositionY: (value) => ({
    backgroundPositionY: purify('backgroundPositionY', value),
  }),

  maskMode: (value) => ({ maskMode: value }),
  maskOrigin: (value) => ({ maskOrigin: value }),
  maskClip: (value) => ({ maskClip: value }),
  maskComposite: (value) => ({ maskComposite: value }),
  maskType: (value) => ({ maskType: value }),

  aspectRatio: (value) => ({ aspectRatio: value }),
  zIndex: (value) => ({ zIndex: value }),
  lineHeight: (value) => ({ lineHeight: purify('lineHeight', value) }),
}

type ComplexSpecialCaseHandler = (
  value: string | number,
  currentColor: string
) => SimpleSpecialCaseResult

const OUTLINE_STYLES = new Set([
  'solid',
  'dashed',
  'dotted',
  'double',
  'none',
  'groove',
  'ridge',
  'inset',
  'outset',
])
const WHITE_SPACE_COLLAPSE_MAP: Record<string, string> = {
  collapse: 'normal',
  preserve: 'pre-wrap',
  'preserve-breaks': 'pre-line',
  'preserve-spaces': 'pre-wrap',
  'break-spaces': 'pre-wrap',
}
const TEXT_DECORATION_SKIP_INK_VALUES = new Set(['auto', 'none', 'all'])
const BORDER_NAME_RE = /^border(Top|Right|Bottom|Left)?$/
const BACKGROUND_IMAGE_FUNCTION_RE =
  /^(linear-gradient|radial-gradient|url|repeating-linear-gradient|repeating-radial-gradient)\(/
const MATRIX_TRANSFORM_RE =
  /^matrix\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/

function resolveOverflowClipMargin(value: string | number): SpecialCaseResult {
  const raw = String(value).trim()
  if (!raw) {
    return {
      overflowClipMargin: 0,
      overflowClipMarginBox: 'padding-box',
    }
  }

  const parts = raw.split(/\s+/)
  let box: 'content-box' | 'padding-box' | 'border-box' = 'padding-box'
  let marginValue: string | number | undefined
  for (const part of parts) {
    if (
      part === 'content-box' ||
      part === 'padding-box' ||
      part === 'border-box'
    ) {
      box = part
      continue
    }
    marginValue = part
    break
  }

  if (typeof marginValue === 'undefined') {
    return { overflowClipMargin: 0, overflowClipMarginBox: box }
  }

  const purified = purify('overflowClipMargin', marginValue)
  const numeric = Number.parseFloat(String(purified))
  if (!Number.isNaN(numeric) && numeric < 0) {
    throw new Error('`overflowClipMargin` must be non-negative.')
  }

  return { overflowClipMargin: purified, overflowClipMarginBox: box }
}

function resolveOutlineShorthand(value: string | number): SpecialCaseResult {
  const parts = value.toString().trim().split(/\s+/)
  const result: Record<string, string | number> = {}
  for (const part of parts) {
    if (OUTLINE_STYLES.has(part)) {
      result.outlineStyle = part
    } else if (/^\d/.test(part) || part === '0') {
      result.outlineWidth = purify('outlineWidth', part)
    } else {
      result.outlineColor = part
    }
  }
  return result
}

function resolveTextWrapMode(value: string | number): SpecialCaseResult {
  const normalized = String(value).trim().toLowerCase()
  if (normalized === 'nowrap') return { whiteSpace: 'nowrap' }
  if (normalized === 'wrap') return { textWrap: 'wrap' }
}

function resolveTextWrapStyle(value: string | number): SpecialCaseResult {
  const normalized = String(value).trim().toLowerCase()
  if (normalized === 'balance' || normalized === 'pretty') {
    return { textWrap: normalized }
  }
}

function resolveRotate(value: string | number): SpecialCaseResult {
  const deg = typeof value === 'number' ? value : parseFloat(String(value))
  return { transform: [{ rotate: deg }] }
}

function resolveScale(value: string | number): SpecialCaseResult {
  const parts = value.toString().trim().split(/\s+/)
  const sx = parseFloat(parts[0])
  const sy = parts.length > 1 ? parseFloat(parts[1]) : sx
  if (sx === sy) return { transform: [{ scale: sx }] }
  return { transform: [{ scaleX: sx }, { scaleY: sy }] }
}

function resolveTranslate(value: string | number): SpecialCaseResult {
  const parts = value.toString().trim().split(/\s+/)
  const result: ParsedTransformStyle['transform'] = [
    { translateX: String(purify('translateX', parts[0])) },
  ]
  if (parts.length > 1) {
    result.push({ translateY: String(purify('translateY', parts[1])) })
  }
  return { transform: result }
}

function resolveFontKerning(value: string | number): SpecialCaseResult {
  const normalized = String(value).trim().toLowerCase()
  if (
    normalized === 'auto' ||
    normalized === 'normal' ||
    normalized === 'none'
  ) {
    return { fontKerning: normalized }
  }
}

function resolveZoom(value: string | number): SpecialCaseResult {
  const normalized = String(value).trim().toLowerCase()
  if (!normalized || normalized === 'normal') return { zoom: 1 }

  if (normalized.endsWith('%')) {
    const percentage = parseFloat(normalized)
    if (!isNaN(percentage)) return { zoom: percentage / 100 }
    return
  }

  const zoom = Number(normalized)
  if (!isNaN(zoom)) return { zoom }
}

function resolveFontFamily(value: string | number): SpecialCaseResult {
  return {
    fontFamily: String(value)
      .split(',')
      .map((_v) => {
        return _v
          .trim()
          .replace(/(^['"])|(['"]$)/g, '')
          .toLocaleLowerCase()
      }),
  }
}

function resolveBorderRadius(value: string | number): SpecialCaseResult {
  if (typeof value !== 'string' || !value.includes('/')) {
    // Regular border radius
    return
  }
  // Support the `border-radius: 10px / 20px` syntax.
  const [horizontal, vertical] = value.split('/')
  const vh = getStylesForProperty('borderRadius', horizontal, true)
  const vv = getStylesForProperty('borderRadius', vertical, true)
  for (const k in vh) {
    vv[k] = purify('borderRadius', vh[k]) + ' ' + purify('borderRadius', vv[k])
  }
  return vv
}

function resolveBorder(
  name: string,
  value: string | number,
  currentColor: string
): SpecialCaseResult {
  // css-to-react-native only supports 'solid' and 'dashed' border styles.
  // Pre-process to swap unsupported styles with 'solid' for parsing, then restore.
  const valueStr = String(value)
  const extraStyles = ['dotted', 'double', 'groove', 'ridge', 'inset', 'outset']
  let actualBorderStyle: string | null = null
  let parsableValue = valueStr
  for (const es of extraStyles) {
    if (valueStr.includes(es)) {
      actualBorderStyle = es
      parsableValue = valueStr.replace(es, 'solid')
      break
    }
  }
  const resolved = getStylesForProperty('border', parsableValue, true)
  if (actualBorderStyle) {
    resolved.borderStyle = actualBorderStyle
  }

  // Border width should default to 3px (medium) instead of 1px.
  if (resolved.borderWidth === 1 && !String(value).includes('1px')) {
    resolved.borderWidth = 3
  }

  // Preserve inherited color when border color was omitted.
  if (resolved.borderColor === 'black' && !String(value).includes('black')) {
    resolved.borderColor = currentColor
  }

  const purified = {
    Width: purify(name + 'Width', resolved.borderWidth),
    Style: v(
      resolved.borderStyle,
      {
        solid: 'solid',
        dashed: 'dashed',
        dotted: 'dotted',
        double: 'double',
        groove: 'groove',
        ridge: 'ridge',
        inset: 'inset',
        outset: 'outset',
      },
      'solid',
      name + 'Style'
    ),
    Color: resolved.borderColor,
  }

  const full = {}
  for (const k of name === 'border'
    ? ['Top', 'Right', 'Bottom', 'Left']
    : [name.slice(6)]) {
    for (const p in purified) {
      full['border' + k + p] = purified[p]
    }
  }
  return full
}

function resolveBoxShadow(value: string | number): SpecialCaseResult {
  if (!value) {
    throw new Error('Invalid `boxShadow` value: "' + value + '".')
  }
  return {
    boxShadow: typeof value === 'string' ? parseBoxShadow(value) : value,
  }
}

function resolveTransform(value: string | number): SpecialCaseResult {
  if (typeof value !== 'string') throw new Error('Invalid `transform` value.')

  // Handle matrix() directly since css-to-react-native doesn't support it.
  const matrixMatch = value.match(MATRIX_TRANSFORM_RE)
  if (matrixMatch) {
    return {
      transform: [{ matrix: matrixMatch.slice(1).map(Number) }],
    }
  }
  return parseTransformWithPercentageSupport(value)
}

function resolveBackground(value: string | number): SpecialCaseResult {
  const normalized = value.toString().trim()
  if (BACKGROUND_IMAGE_FUNCTION_RE.test(normalized)) {
    return getStylesForProperty('backgroundImage', normalized, true)
  }
  return getStylesForProperty('background', normalized, true)
}

function resolveTextShadow(value: string | number): SpecialCaseResult {
  const normalized = value.toString().trim()
  const result = {}
  const shadows = splitEffects(normalized)

  for (const shadow of shadows) {
    const styles = getStylesForProperty('textShadow', shadow, true)
    for (const k in styles) {
      if (!result[k]) {
        result[k] = [styles[k]]
      } else {
        result[k].push(styles[k])
      }
    }
  }

  return result
}

function resolveWebkitTextStroke(value: string | number): SpecialCaseResult {
  const normalized = value.toString().trim()
  const values = normalized.split(' ')
  if (values.length !== 2) {
    throw new Error('Invalid `WebkitTextStroke` value.')
  }

  return {
    WebkitTextStrokeWidth: purify('WebkitTextStroke', values[0]),
    WebkitTextStrokeColor: purify('WebkitTextStroke', values[1]),
  }
}

function resolveTextDecorationSkipInk(
  value: string | number
): SpecialCaseResult {
  const normalized = value.toString().trim().toLowerCase()
  if (!TEXT_DECORATION_SKIP_INK_VALUES.has(normalized)) {
    throw new Error('Invalid `textDecorationSkipInk` value.')
  }

  return { textDecorationSkipInk: normalized }
}

const complexSpecialCaseHandlers: Record<string, ComplexSpecialCaseHandler> = {
  flexFlow: (value) => {
    const parts = value.toString().trim().split(/\s+/)
    const result: Record<string, string> = {}
    for (const part of parts) {
      if (['row', 'column', 'row-reverse', 'column-reverse'].includes(part)) {
        result.flexDirection = part
      } else if (['wrap', 'nowrap', 'wrap-reverse'].includes(part)) {
        result.flexWrap = part
      }
    }
    return result
  },
  placeContent: (value) => {
    const { first, second } = parsePlaceShorthandValues(value)
    if (!first) return {}
    return {
      alignContent: first,
      justifyContent: second || first,
    }
  },
  placeItems: (value) => {
    const { first } = parsePlaceShorthandValues(value)
    if (!first) return {}
    return {
      alignItems: first,
    }
  },
  placeSelf: (value) => {
    const { first } = parsePlaceShorthandValues(value)
    if (!first) return {}
    return {
      alignSelf: first,
    }
  },
  justifyItems: () => ({}),
  justifySelf: () => ({}),
  overflowX: (value) => ({ overflowX: value }),
  overflowY: (value) => ({ overflowY: value }),
  overflowClipMargin: (value) => resolveOverflowClipMargin(value),
  outline: (value) => resolveOutlineShorthand(value),
  wordSpacing: (value) => ({ wordSpacing: purify('wordSpacing', value) }),
  textIndent: (value) => ({ textIndent: purify('textIndent', value) }),
  whiteSpaceCollapse: (value) => {
    const normalized = String(value).trim().toLowerCase()
    const mapped = WHITE_SPACE_COLLAPSE_MAP[normalized]
    if (mapped) return { whiteSpace: mapped }
  },
  textWrapMode: (value) => resolveTextWrapMode(value),
  textWrapStyle: (value) => resolveTextWrapStyle(value),
  rotate: (value) => resolveRotate(value),
  scale: (value) => resolveScale(value),
  translate: (value) => resolveTranslate(value),
  fontKerning: (value) => resolveFontKerning(value),
  zoom: (value) => resolveZoom(value),
  fontFamily: (value) => resolveFontFamily(value),
  borderRadius: (value) => resolveBorderRadius(value),
  boxShadow: (value) => resolveBoxShadow(value),
  transform: (value) => resolveTransform(value),
  background: (value) => resolveBackground(value),
  textShadow: (value) => resolveTextShadow(value),
  WebkitTextStroke: (value) => resolveWebkitTextStroke(value),
  textDecorationSkipInk: (value) => resolveTextDecorationSkipInk(value),
}

function handleSpecialCase(
  name: string,
  value: string | number,
  currentColor: string
) {
  const logical = resolveLogicalProperty(
    name,
    value,
    currentColor,
    purify,
    handleSpecialCase
  )
  if (logical) return logical

  const simpleHandler = simpleSpecialCaseHandlers[name]
  if (simpleHandler) return simpleHandler(value)

  const complexHandler = complexSpecialCaseHandlers[name]
  if (complexHandler) return complexHandler(value, currentColor)

  if (BORDER_NAME_RE.test(name)) {
    return resolveBorder(name, value, currentColor)
  }
}

function getErrorHint(name: string) {
  if (name === 'transform') {
    return ' Only absolute lengths such as `10px` are supported.'
  }
  return ''
}

const RGB_SLASH = /rgb\((\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\.\d]+)\)/
function normalizeColor(value: string | object) {
  if (typeof value === 'string') {
    if (RGB_SLASH.test(value.trim())) {
      // rgb(255 122 127 / .2) -> rgba(255, 122, 127, .2)
      return value.trim().replace(RGB_SLASH, (_, r, g, b, a) => {
        return `rgba(${r}, ${g}, ${b}, ${a})`
      })
    }
  }

  // Recursively normalize colors in arrays and objects.
  if (typeof value === 'object' && value !== null) {
    for (const k in value) {
      value[k] = normalizeColor(value[k])
    }
    return value
  }

  return value
}

function parseBackgroundPositionLayer(layer: string): [string, string] {
  const tokens = layer.trim().split(/\s+/).filter(Boolean)
  if (tokens.length >= 2) return [tokens[0], tokens[1]]

  if (tokens.length === 1) {
    const token = tokens[0]
    // `background-position: top|bottom` implies centered X.
    if (token === 'top' || token === 'bottom') {
      return ['50%', token]
    }

    // Other single-value forms (center/left/right/10px) imply centered Y.
    return [token, '50%']
  }

  return ['0%', '0%']
}

function mergeBackgroundPositionAxes(serializedStyle: SerializedStyle): void {
  const x = serializedStyle.backgroundPositionX
  const y = serializedStyle.backgroundPositionY
  if (typeof x === 'undefined' && typeof y === 'undefined') return

  const xLayers =
    typeof x === 'undefined'
      ? []
      : splitEffects(String(x)).map((value) => value.trim())
  const yLayers =
    typeof y === 'undefined'
      ? []
      : splitEffects(String(y)).map((value) => value.trim())
  const baseLayers =
    typeof serializedStyle.backgroundPosition === 'string'
      ? splitEffects(serializedStyle.backgroundPosition)
      : []

  const layerCount = Math.max(
    1,
    baseLayers.length,
    xLayers.length,
    yLayers.length
  )
  const merged: string[] = []

  for (let i = 0; i < layerCount; i++) {
    const [baseX, baseY] = parseBackgroundPositionLayer(baseLayers[i] || '')
    const layerX = xLayers.length
      ? xLayers[i] || xLayers[xLayers.length - 1]
      : baseX || '0%'
    const layerY = yLayers.length
      ? yLayers[i] || yLayers[yLayers.length - 1]
      : baseY || '0%'
    merged.push(`${layerX} ${layerY}`)
  }

  serializedStyle.backgroundPosition = merged.join(', ')
}

export default function expand(
  style: Record<string, string | number> | undefined,
  inheritedStyle: SerializedStyle
): SerializedStyle {
  const serializedStyle: SerializedStyle = {}

  if (style) {
    const currentColor = getCurrentColor(
      style.color as string,
      inheritedStyle.color
    )

    serializedStyle.color = currentColor

    for (const prop in style) {
      // Internal properties.
      if (prop.startsWith('_')) {
        serializedStyle[prop] = style[prop]
        continue
      }

      if (prop === 'color') {
        continue
      }

      const name = getPropertyName(prop)
      const value = preprocess(style[prop], currentColor)

      try {
        if (name === 'all') {
          applyAllReset(serializedStyle, inheritedStyle, value)
          continue
        }

        const resolvedStyle =
          handleSpecialCase(name, value, currentColor) ||
          handleFallbackColor(
            name,
            getStylesForProperty(name, purify(name, value), true),
            value as string,
            currentColor
          )

        Object.assign(serializedStyle, resolvedStyle)
      } catch (err) {
        throw new Error(
          err.message +
            // Attach the extra information of the rule itself if it's not included in
            // the error message.
            (err.message.includes(value)
              ? '\n  ' + getErrorHint(name)
              : `\n  in CSS rule \`${name}: ${value}\`.${getErrorHint(name)}`)
        )
      }
    }
  }

  // Merge background-position-x/y into background-position shorthand.
  mergeBackgroundPositionAxes(serializedStyle)

  // Parse background images.
  if (serializedStyle.backgroundImage) {
    const { backgrounds } = parseElementStyle(serializedStyle)
    serializedStyle.backgroundImage = backgrounds
  }

  if (serializedStyle.maskImage || serializedStyle['WebkitMaskImage']) {
    serializedStyle.maskImage = parseMask(serializedStyle)
  }

  // Calculate the base font size.
  const baseFontSize = calcBaseFontSize(
    serializedStyle.fontSize,
    inheritedStyle.fontSize
  )
  if (typeof serializedStyle.fontSize !== 'undefined') {
    serializedStyle.fontSize = baseFontSize
  }

  if (serializedStyle.transformOrigin) {
    serializedStyle.transformOrigin = parseTransformOrigin(
      serializedStyle.transformOrigin as any,
      baseFontSize
    )
  }

  if (typeof serializedStyle.zoom === 'number') {
    const zoom = Number(serializedStyle.zoom)
    delete serializedStyle.zoom

    if (isFinite(zoom) && zoom > 0 && zoom !== 1) {
      const existingTransforms = isTransformInput(serializedStyle.transform)
        ? serializedStyle.transform.filter(
            (entry): entry is TransformDescriptor =>
              typeof entry === 'object' &&
              entry !== null &&
              !Array.isArray(entry)
          )
        : []
      const hasExplicitTransform = existingTransforms.length > 0

      // Approximation note: CSS `zoom` affects layout sizing in browsers.
      // Satori models it as an extra transform scale.
      serializedStyle.transform = [{ scale: zoom }, ...existingTransforms]
      // `zoom` scales from the top-left corner in browsers. Only force this when
      // zoom is the sole transform-like input to avoid altering existing behavior.
      if (!hasExplicitTransform && !serializedStyle.transformOrigin) {
        serializedStyle.transformOrigin = { xRelative: 0, yRelative: 0 }
      }
    }
  }

  for (const prop in serializedStyle) {
    let value = serializedStyle[prop]

    // Line height needs to be relative.
    if (prop === 'lineHeight') {
      if (typeof value === 'string' && value !== 'normal') {
        value = serializedStyle[prop] =
          lengthToNumber(
            value,
            baseFontSize,
            baseFontSize,
            inheritedStyle,
            true
          ) / baseFontSize
      }
    } else {
      // Convert em and rem values to px (number).
      if (typeof value === 'string') {
        const len = lengthToNumber(
          value,
          baseFontSize,
          baseFontSize,
          inheritedStyle
        )
        if (typeof len !== 'undefined') serializedStyle[prop] = len
        value = serializedStyle[prop]
      }

      if (typeof value === 'string' || typeof value === 'object') {
        const color = normalizeColor(value)
        if (color) {
          serializedStyle[prop] = color as any
        }
        value = serializedStyle[prop]
      }
    }

    // Inherit the opacity.
    if (prop === 'opacity' && typeof value === 'number') {
      serializedStyle.opacity = value * inheritedStyle.opacity
    }

    if (prop === 'transform') {
      if (!isTransformInput(value)) continue
      for (const transform of value) {
        if (
          typeof transform !== 'object' ||
          transform === null ||
          Array.isArray(transform)
        ) {
          continue
        }
        const type = Object.keys(transform)[0]
        const _v = transform[type]

        // Convert em, rem, vw, vh values to px (number), but keep % values.
        const len =
          typeof _v === 'string'
            ? lengthToNumber(_v, baseFontSize, baseFontSize, inheritedStyle) ??
              _v
            : _v
        transform[type] = len
      }
    }

    if (prop === 'textShadowRadius') {
      const textShadowRadius = value as unknown as Array<number | string>

      serializedStyle.textShadowRadius = textShadowRadius.map((_v) =>
        lengthToNumber(_v, baseFontSize, 0, inheritedStyle, false)
      )
    }

    if (prop === 'textShadowOffset') {
      const textShadowOffset = value as unknown as Array<{
        width: number | string
        height: number | string
      }>

      serializedStyle.textShadowOffset = textShadowOffset.map(
        ({ height, width }) => ({
          height: lengthToNumber(
            height,
            baseFontSize,
            0,
            inheritedStyle,
            false
          ),
          width: lengthToNumber(width, baseFontSize, 0, inheritedStyle, false),
        })
      )
    }
  }

  return serializedStyle
}

function calcBaseFontSize(
  size: number | string,
  inheritedSize: number
): number {
  if (typeof size === 'number') return size

  try {
    const parsed = new CssDimension(size)
    switch (parsed.unit) {
      case 'em':
        return parsed.value * inheritedSize
      case 'rem':
        return parsed.value * 16
    }
  } catch (err) {
    return inheritedSize
  }
}

/**
 * @see https://github.com/RazrFalcon/resvg/issues/579
 */
function refineHSL(color: string) {
  if (color.startsWith('hsl')) {
    const t = cssColorParse(color)
    const [h, s, l] = t.values

    return `hsl(${[h, `${s}%`, `${l}%`]
      .concat(t.alpha === 1 ? [] : [t.alpha])
      .join(',')})`
  }

  return color
}

function getCurrentColor(
  color: string | undefined,
  inheritedColor: string
): string {
  if (color && color.toLowerCase() !== 'currentcolor') {
    return refineHSL(color)
  }

  return refineHSL(inheritedColor)
}

function convertCurrentColorToActualValue(
  value: string,
  currentColor: string
): string {
  return value.replace(/currentcolor/gi, currentColor)
}

function preprocess(
  value: string | number,
  currentColor: string
): string | number {
  if (isString(value)) {
    value = convertCurrentColorToActualValue(value, currentColor)
  }

  return value
}
