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

function splitSpaceValues(value: string | number): string[] {
  return value.toString().trim().split(/\s+/)
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

const LOGICAL_PURIFIED_ALIASES: Record<string, string> = {
  minInlineSize: 'minWidth',
  minBlockSize: 'minHeight',
  maxInlineSize: 'maxWidth',
  maxBlockSize: 'maxHeight',

  marginInlineStart: 'marginLeft',
  marginInlineEnd: 'marginRight',
  marginBlockStart: 'marginTop',
  marginBlockEnd: 'marginBottom',

  paddingInlineStart: 'paddingLeft',
  paddingInlineEnd: 'paddingRight',
  paddingBlockStart: 'paddingTop',
  paddingBlockEnd: 'paddingBottom',

  insetInlineStart: 'left',
  insetInlineEnd: 'right',
  insetBlockStart: 'top',
  insetBlockEnd: 'bottom',

  borderInlineStartWidth: 'borderLeftWidth',
  borderInlineEndWidth: 'borderRightWidth',
  borderBlockStartWidth: 'borderTopWidth',
  borderBlockEndWidth: 'borderBottomWidth',

  borderStartStartRadius: 'borderTopLeftRadius',
  borderStartEndRadius: 'borderTopRightRadius',
  borderEndStartRadius: 'borderBottomLeftRadius',
  borderEndEndRadius: 'borderBottomRightRadius',
}

const LOGICAL_RAW_ALIASES: Record<string, string> = {
  overflowInline: 'overflowX',
  overflowBlock: 'overflowY',

  borderInlineStartStyle: 'borderLeftStyle',
  borderInlineEndStyle: 'borderRightStyle',
  borderBlockStartStyle: 'borderTopStyle',
  borderBlockEndStyle: 'borderBottomStyle',

  borderInlineStartColor: 'borderLeftColor',
  borderInlineEndColor: 'borderRightColor',
  borderBlockStartColor: 'borderTopColor',
  borderBlockEndColor: 'borderBottomColor',
}

function resolvePurifiedLogicalAlias(name: string, value: string | number) {
  const target = LOGICAL_PURIFIED_ALIASES[name]
  if (!target) return

  const purifiedName =
    name === 'borderStartStartRadius' ||
    name === 'borderStartEndRadius' ||
    name === 'borderEndStartRadius' ||
    name === 'borderEndEndRadius'
      ? 'borderRadius'
      : target

  return { [target]: purify(purifiedName, value) }
}

function resolveRawLogicalAlias(name: string, value: string | number) {
  const target = LOGICAL_RAW_ALIASES[name]
  if (!target) return
  return { [target]: value }
}

function resolveLogicalProperty(
  name: string,
  value: string | number,
  currentColor: string
) {
  // Logical sizing
  if (name === 'inlineSize')
    return (
      handleSpecialCase('width', value, currentColor) || {
        width: purify('width', value),
      }
    )
  if (name === 'blockSize')
    return (
      handleSpecialCase('height', value, currentColor) || {
        height: purify('height', value),
      }
    )

  const purifiedAlias = resolvePurifiedLogicalAlias(name, value)
  if (purifiedAlias) return purifiedAlias

  const rawAlias = resolveRawLogicalAlias(name, value)
  if (rawAlias) return rawAlias

  // Logical margin
  if (name === 'marginInline') {
    const vals = splitSpaceValues(value)
    return {
      marginLeft: purify('marginLeft', vals[0]),
      marginRight: purify('marginRight', vals[1] || vals[0]),
    }
  }
  if (name === 'marginBlock') {
    const vals = splitSpaceValues(value)
    return {
      marginTop: purify('marginTop', vals[0]),
      marginBottom: purify('marginBottom', vals[1] || vals[0]),
    }
  }

  // Logical padding
  if (name === 'paddingInline') {
    const vals = splitSpaceValues(value)
    return {
      paddingLeft: purify('paddingLeft', vals[0]),
      paddingRight: purify('paddingRight', vals[1] || vals[0]),
    }
  }
  if (name === 'paddingBlock') {
    const vals = splitSpaceValues(value)
    return {
      paddingTop: purify('paddingTop', vals[0]),
      paddingBottom: purify('paddingBottom', vals[1] || vals[0]),
    }
  }

  // Logical inset
  if (name === 'insetInline') {
    const vals = splitSpaceValues(value)
    return {
      left: purify('left', vals[0]),
      right: purify('right', vals[1] || vals[0]),
    }
  }
  if (name === 'insetBlock') {
    const vals = splitSpaceValues(value)
    return {
      top: purify('top', vals[0]),
      bottom: purify('bottom', vals[1] || vals[0]),
    }
  }
  if (name === 'inset') {
    const vals = splitSpaceValues(value)
    const [t, r = t, b = t, l = r] = vals
    return {
      top: purify('top', t),
      right: purify('right', r),
      bottom: purify('bottom', b),
      left: purify('left', l),
    }
  }

  // Logical border shorthand
  if (name === 'borderInline') {
    const resolved = handleSpecialCase('border', value, currentColor)
    if (!resolved) return
    const result = {}
    for (const k of ['Left', 'Right']) {
      for (const p of ['Width', 'Style', 'Color']) {
        result['border' + k + p] = resolved['borderTop' + p]
      }
    }
    return result
  }
  if (name === 'borderBlock') {
    const resolved = handleSpecialCase('border', value, currentColor)
    if (!resolved) return
    const result = {}
    for (const k of ['Top', 'Bottom']) {
      for (const p of ['Width', 'Style', 'Color']) {
        result['border' + k + p] = resolved['borderTop' + p]
      }
    }
    return result
  }
  if (name === 'borderInlineStart')
    return handleSpecialCase('borderLeft', value, currentColor)
  if (name === 'borderInlineEnd')
    return handleSpecialCase('borderRight', value, currentColor)
  if (name === 'borderBlockStart')
    return handleSpecialCase('borderTop', value, currentColor)
  if (name === 'borderBlockEnd')
    return handleSpecialCase('borderBottom', value, currentColor)

  // Logical border sub-properties (width)
  if (name === 'borderInlineWidth') {
    const vals = splitSpaceValues(value)
    return {
      borderLeftWidth: purify('borderLeftWidth', vals[0]),
      borderRightWidth: purify('borderRightWidth', vals[1] || vals[0]),
    }
  }
  if (name === 'borderBlockWidth') {
    const vals = splitSpaceValues(value)
    return {
      borderTopWidth: purify('borderTopWidth', vals[0]),
      borderBottomWidth: purify('borderBottomWidth', vals[1] || vals[0]),
    }
  }

  // Logical border sub-properties (style)
  if (name === 'borderInlineStyle') {
    const vals = splitSpaceValues(value)
    return {
      borderLeftStyle: vals[0],
      borderRightStyle: vals[1] || vals[0],
    }
  }
  if (name === 'borderBlockStyle') {
    const vals = splitSpaceValues(value)
    return {
      borderTopStyle: vals[0],
      borderBottomStyle: vals[1] || vals[0],
    }
  }

  // Logical border sub-properties (color)
  if (name === 'borderInlineColor') {
    const vals = splitSpaceValues(value)
    return {
      borderLeftColor: vals[0],
      borderRightColor: vals[1] || vals[0],
    }
  }
  if (name === 'borderBlockColor') {
    const vals = splitSpaceValues(value)
    return {
      borderTopColor: vals[0],
      borderBottomColor: vals[1] || vals[0],
    }
  }
}

type SimpleSpecialCaseResult =
  | Record<string, string | number | object>
  | undefined
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

function handleSpecialCase(
  name: string,
  value: string | number,
  currentColor: string
) {
  const logical = resolveLogicalProperty(name, value, currentColor)
  if (logical) return logical

  const simpleHandler = simpleSpecialCaseHandlers[name]
  if (simpleHandler) return simpleHandler(value)

  // --- Shorthand expansions ---

  // flex-flow → flexDirection + flexWrap
  if (name === 'flexFlow') {
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
  }

  // place-content → alignContent + justifyContent
  if (name === 'placeContent') {
    const { first, second } = parsePlaceShorthandValues(value)
    if (!first) return {}
    return {
      alignContent: first,
      justifyContent: second || first,
    }
  }

  // place-items → alignItems (+ ignore justify-items in flex-only layout)
  if (name === 'placeItems') {
    const { first } = parsePlaceShorthandValues(value)
    if (!first) return {}
    return {
      alignItems: first,
    }
  }

  // place-self → alignSelf (+ ignore justify-self in flex-only layout)
  if (name === 'placeSelf') {
    const { first } = parsePlaceShorthandValues(value)
    if (!first) return {}
    return {
      alignSelf: first,
    }
  }

  // Grid-focused properties. Satori uses flex-only layout, so accept and ignore
  // these for browser parity (no effect on flex formatting).
  if (name === 'justifyItems' || name === 'justifySelf') {
    return {}
  }

  // overflow-x / overflow-y: store individually, compute.ts will merge
  if (name === 'overflowX') return { overflowX: value }
  if (name === 'overflowY') return { overflowY: value }
  if (name === 'overflowClipMargin') {
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

    const purified = purify(name, marginValue)
    const numeric = Number.parseFloat(String(purified))
    if (!Number.isNaN(numeric) && numeric < 0) {
      throw new Error('`overflowClipMargin` must be non-negative.')
    }

    return { overflowClipMargin: purified, overflowClipMarginBox: box }
  }

  // outline shorthand: <width> <style> <color>
  if (name === 'outline') {
    const parts = value.toString().trim().split(/\s+/)
    const result: Record<string, string | number> = {}
    for (const part of parts) {
      if (
        [
          'solid',
          'dashed',
          'dotted',
          'double',
          'none',
          'groove',
          'ridge',
          'inset',
          'outset',
        ].includes(part)
      ) {
        result.outlineStyle = part
      } else if (/^\d/.test(part) || part === '0') {
        result.outlineWidth = purify('outlineWidth', part)
      } else {
        result.outlineColor = part
      }
    }
    return result
  }
  // Pass-through properties that don't need special handling
  if (name === 'wordSpacing')
    return { wordSpacing: purify('wordSpacing', value) }
  if (name === 'textIndent') return { textIndent: purify('textIndent', value) }
  if (name === 'whiteSpaceCollapse') {
    const normalized = String(value).trim().toLowerCase()
    const whiteSpaceMap: Record<string, string> = {
      collapse: 'normal',
      preserve: 'pre-wrap',
      'preserve-breaks': 'pre-line',
      'preserve-spaces': 'pre-wrap',
      'break-spaces': 'pre-wrap',
    }
    if (whiteSpaceMap[normalized]) {
      return { whiteSpace: whiteSpaceMap[normalized] }
    }
  }
  if (name === 'textWrapMode') {
    const normalized = String(value).trim().toLowerCase()
    if (normalized === 'nowrap') return { whiteSpace: 'nowrap' }
    if (normalized === 'wrap') return { textWrap: 'wrap' }
  }
  if (name === 'textWrapStyle') {
    const normalized = String(value).trim().toLowerCase()
    if (normalized === 'balance' || normalized === 'pretty') {
      return { textWrap: normalized }
    }
  }
  // Individual transform properties (CSS Transforms Level 2)
  if (name === 'rotate') {
    const deg = typeof value === 'number' ? value : parseFloat(value as string)
    return { transform: [{ rotate: deg }] }
  }
  if (name === 'scale') {
    const parts = value.toString().trim().split(/\s+/)
    const sx = parseFloat(parts[0])
    const sy = parts.length > 1 ? parseFloat(parts[1]) : sx
    if (sx === sy) return { transform: [{ scale: sx }] }
    return { transform: [{ scaleX: sx }, { scaleY: sy }] }
  }
  if (name === 'translate') {
    const parts = value.toString().trim().split(/\s+/)
    const result = [{ translateX: purify('translateX', parts[0]) }]
    if (parts.length > 1) {
      result.push({ translateY: purify('translateY', parts[1]) } as any)
    }
    return { transform: result }
  }

  if (name === 'fontKerning') {
    const normalized = String(value).trim().toLowerCase()
    if (
      normalized === 'auto' ||
      normalized === 'normal' ||
      normalized === 'none'
    ) {
      return { fontKerning: normalized }
    }
    return
  }

  if (name === 'zoom') {
    const normalized = String(value).trim().toLowerCase()
    if (!normalized || normalized === 'normal') return { zoom: 1 }

    if (normalized.endsWith('%')) {
      const percentage = parseFloat(normalized)
      if (!isNaN(percentage)) return { zoom: percentage / 100 }
      return
    }

    const zoom = Number(normalized)
    if (!isNaN(zoom)) return { zoom }
    return
  }

  if (name === 'fontFamily') {
    return {
      fontFamily: (value as string).split(',').map((_v) => {
        return _v
          .trim()
          .replace(/(^['"])|(['"]$)/g, '')
          .toLocaleLowerCase()
      }),
    }
  }

  if (name === 'borderRadius') {
    if (typeof value !== 'string' || !value.includes('/')) {
      // Regular border radius
      return
    }
    // Support the `border-radius: 10px / 20px` syntax.
    const [horizontal, vertical] = value.split('/')
    const vh = getStylesForProperty(name, horizontal, true)
    const vv = getStylesForProperty(name, vertical, true)
    for (const k in vh) {
      vv[k] = purify(name, vh[k]) + ' ' + purify(name, vv[k])
    }
    return vv
  }

  if (/^border(Top|Right|Bottom|Left)?$/.test(name)) {
    // css-to-react-native only supports 'solid' and 'dashed' border styles.
    // Pre-process to swap unsupported styles with 'solid' for parsing, then restore.
    const valueStr = String(value)
    const extraStyles = [
      'dotted',
      'double',
      'groove',
      'ridge',
      'inset',
      'outset',
    ]
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

    // Border width should be default to 3px (medium) instead of 1px:
    // https://w3c.github.io/csswg-drafts/css-backgrounds-3/#border-width
    // Although on Chrome it will be displayed as 1.5px but let's stick to the
    // spec.
    if (resolved.borderWidth === 1 && !String(value).includes('1px')) {
      resolved.borderWidth = 3
    }

    // A trick to fix `border: 1px solid` to not use `black` but the inherited
    // `color` value. This is necessary because css-to-react-native automatically
    // fallbacks to default color values.
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

  if (name === 'boxShadow') {
    if (!value) {
      throw new Error('Invalid `boxShadow` value: "' + value + '".')
    }
    return {
      [name]: typeof value === 'string' ? parseBoxShadow(value) : value,
    }
  }

  if (name === 'transform') {
    if (typeof value !== 'string') throw new Error('Invalid `transform` value.')

    // Handle matrix() directly since css-to-react-native doesn't support it.
    const matrixMatch = value.match(
      /^matrix\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/
    )
    if (matrixMatch) {
      return {
        transform: [{ matrix: matrixMatch.slice(1).map(Number) }],
      }
    }
    return parseTransformWithPercentageSupport(value)
  }

  if (name === 'background') {
    value = value.toString().trim()
    if (
      /^(linear-gradient|radial-gradient|url|repeating-linear-gradient|repeating-radial-gradient)\(/.test(
        value
      )
    ) {
      return getStylesForProperty('backgroundImage', value, true)
    }
    return getStylesForProperty('background', value, true)
  }

  if (name === 'textShadow') {
    // Handle multiple text shadows if provided.
    value = value.toString().trim()
    const result = {}

    const shadows = splitEffects(value)

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

  if (name === 'WebkitTextStroke') {
    value = value.toString().trim()
    const values = value.split(' ')
    if (values.length !== 2) {
      throw new Error('Invalid `WebkitTextStroke` value.')
    }

    return {
      WebkitTextStrokeWidth: purify(name, values[0]),
      WebkitTextStrokeColor: purify(name, values[1]),
    }
  }

  if (name === 'textDecorationSkipInk') {
    const normalized = value.toString().trim().toLowerCase()
    if (!['auto', 'none', 'all'].includes(normalized)) {
      throw new Error('Invalid `textDecorationSkipInk` value.')
    }

    return { textDecorationSkipInk: normalized }
  }

  return
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
