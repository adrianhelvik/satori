/**
 * This module expands the CSS properties to get rid of shorthands, as well as
 * cleaning up some properties.
 */

import { getPropertyName, getStylesForProperty } from 'css-to-react-native'
import { parseElementStyle } from 'css-background-parser'
import { parse as parseBoxShadow } from 'css-box-shadow'
import cssColorParse from 'parse-css-color'

import CssDimension from '../vendor/parse-css-dimension/index.js'
import parseTransformOrigin, {
  ParsedTransformOrigin,
} from '../transform-origin.js'
import { isString, lengthToNumber, v, splitEffects } from '../utils.js'
import { MaskProperty, parseMask } from '../parser/mask.js'
import { FontWeight, FontStyle } from '../font.js'

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

function handleSpecialCase(
  name: string,
  value: string | number,
  currentColor: string
) {
  // --- Logical property mappings (horizontal-tb, ltr) ---

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
  if (name === 'minInlineSize') return { minWidth: purify('minWidth', value) }
  if (name === 'minBlockSize') return { minHeight: purify('minHeight', value) }
  if (name === 'maxInlineSize') return { maxWidth: purify('maxWidth', value) }
  if (name === 'maxBlockSize') return { maxHeight: purify('maxHeight', value) }

  // Logical margin
  if (name === 'marginInlineStart')
    return { marginLeft: purify('marginLeft', value) }
  if (name === 'marginInlineEnd')
    return { marginRight: purify('marginRight', value) }
  if (name === 'marginBlockStart')
    return { marginTop: purify('marginTop', value) }
  if (name === 'marginBlockEnd')
    return { marginBottom: purify('marginBottom', value) }
  if (name === 'marginInline') {
    const vals = value.toString().trim().split(/\s+/)
    return {
      marginLeft: purify('marginLeft', vals[0]),
      marginRight: purify('marginRight', vals[1] || vals[0]),
    }
  }
  if (name === 'marginBlock') {
    const vals = value.toString().trim().split(/\s+/)
    return {
      marginTop: purify('marginTop', vals[0]),
      marginBottom: purify('marginBottom', vals[1] || vals[0]),
    }
  }

  // Logical padding
  if (name === 'paddingInlineStart')
    return { paddingLeft: purify('paddingLeft', value) }
  if (name === 'paddingInlineEnd')
    return { paddingRight: purify('paddingRight', value) }
  if (name === 'paddingBlockStart')
    return { paddingTop: purify('paddingTop', value) }
  if (name === 'paddingBlockEnd')
    return { paddingBottom: purify('paddingBottom', value) }
  if (name === 'paddingInline') {
    const vals = value.toString().trim().split(/\s+/)
    return {
      paddingLeft: purify('paddingLeft', vals[0]),
      paddingRight: purify('paddingRight', vals[1] || vals[0]),
    }
  }
  if (name === 'paddingBlock') {
    const vals = value.toString().trim().split(/\s+/)
    return {
      paddingTop: purify('paddingTop', vals[0]),
      paddingBottom: purify('paddingBottom', vals[1] || vals[0]),
    }
  }

  // Logical inset
  if (name === 'insetInlineStart') return { left: purify('left', value) }
  if (name === 'insetInlineEnd') return { right: purify('right', value) }
  if (name === 'insetBlockStart') return { top: purify('top', value) }
  if (name === 'insetBlockEnd') return { bottom: purify('bottom', value) }
  if (name === 'insetInline') {
    const vals = value.toString().trim().split(/\s+/)
    return {
      left: purify('left', vals[0]),
      right: purify('right', vals[1] || vals[0]),
    }
  }
  if (name === 'insetBlock') {
    const vals = value.toString().trim().split(/\s+/)
    return {
      top: purify('top', vals[0]),
      bottom: purify('bottom', vals[1] || vals[0]),
    }
  }
  if (name === 'inset') {
    const vals = value.toString().trim().split(/\s+/)
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
    const vals = value.toString().trim().split(/\s+/)
    return {
      borderLeftWidth: purify('borderLeftWidth', vals[0]),
      borderRightWidth: purify('borderRightWidth', vals[1] || vals[0]),
    }
  }
  if (name === 'borderBlockWidth') {
    const vals = value.toString().trim().split(/\s+/)
    return {
      borderTopWidth: purify('borderTopWidth', vals[0]),
      borderBottomWidth: purify('borderBottomWidth', vals[1] || vals[0]),
    }
  }
  if (name === 'borderInlineStartWidth')
    return { borderLeftWidth: purify('borderLeftWidth', value) }
  if (name === 'borderInlineEndWidth')
    return { borderRightWidth: purify('borderRightWidth', value) }
  if (name === 'borderBlockStartWidth')
    return { borderTopWidth: purify('borderTopWidth', value) }
  if (name === 'borderBlockEndWidth')
    return { borderBottomWidth: purify('borderBottomWidth', value) }

  // Logical border sub-properties (style)
  if (name === 'borderInlineStyle') {
    const vals = value.toString().trim().split(/\s+/)
    return {
      borderLeftStyle: vals[0],
      borderRightStyle: vals[1] || vals[0],
    }
  }
  if (name === 'borderBlockStyle') {
    const vals = value.toString().trim().split(/\s+/)
    return {
      borderTopStyle: vals[0],
      borderBottomStyle: vals[1] || vals[0],
    }
  }
  if (name === 'borderInlineStartStyle') return { borderLeftStyle: value }
  if (name === 'borderInlineEndStyle') return { borderRightStyle: value }
  if (name === 'borderBlockStartStyle') return { borderTopStyle: value }
  if (name === 'borderBlockEndStyle') return { borderBottomStyle: value }

  // Logical border sub-properties (color)
  if (name === 'borderInlineColor') {
    const vals = value.toString().trim().split(/\s+/)
    return {
      borderLeftColor: vals[0],
      borderRightColor: vals[1] || vals[0],
    }
  }
  if (name === 'borderBlockColor') {
    const vals = value.toString().trim().split(/\s+/)
    return {
      borderTopColor: vals[0],
      borderBottomColor: vals[1] || vals[0],
    }
  }
  if (name === 'borderInlineStartColor') return { borderLeftColor: value }
  if (name === 'borderInlineEndColor') return { borderRightColor: value }
  if (name === 'borderBlockStartColor') return { borderTopColor: value }
  if (name === 'borderBlockEndColor') return { borderBottomColor: value }

  // Logical border radius
  if (name === 'borderStartStartRadius')
    return { borderTopLeftRadius: purify('borderRadius', value) }
  if (name === 'borderStartEndRadius')
    return { borderTopRightRadius: purify('borderRadius', value) }
  if (name === 'borderEndStartRadius')
    return { borderBottomLeftRadius: purify('borderRadius', value) }
  if (name === 'borderEndEndRadius')
    return { borderBottomRightRadius: purify('borderRadius', value) }

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
    const parts = value.toString().trim().split(/\s+/)
    return {
      alignContent: parts[0],
      justifyContent: parts[1] || parts[0],
    }
  }

  // place-items → alignItems + justifyItems
  if (name === 'placeItems') {
    const parts = value.toString().trim().split(/\s+/)
    return {
      alignItems: parts[0],
      justifyItems: parts[1] || parts[0],
    }
  }

  // place-self → alignSelf + justifySelf
  if (name === 'placeSelf') {
    const parts = value.toString().trim().split(/\s+/)
    return {
      alignSelf: parts[0],
      justifySelf: parts[1] || parts[0],
    }
  }

  // overflow-x / overflow-y: store individually, compute.ts will merge
  if (name === 'overflowX') return { overflowX: value }
  if (name === 'overflowY') return { overflowY: value }

  // outline shorthand: <width> <style> <color>
  if (name === 'outline') {
    const parts = value.toString().trim().split(/\s+/)
    const result: Record<string, string | number> = {}
    for (const part of parts) {
      if (['solid', 'dashed', 'dotted', 'double', 'none'].includes(part)) {
        result.outlineStyle = part
      } else if (/^\d/.test(part) || part === '0') {
        result.outlineWidth = purify('outlineWidth', part)
      } else {
        result.outlineColor = part
      }
    }
    return result
  }
  if (name === 'outlineWidth')
    return { outlineWidth: purify('outlineWidth', value) }
  if (name === 'outlineStyle') return { outlineStyle: value }
  if (name === 'outlineColor') return { outlineColor: value }
  if (name === 'outlineOffset')
    return { outlineOffset: purify('outlineOffset', value) }

  // Pass-through properties that don't need special handling
  if (name === 'wordSpacing')
    return { wordSpacing: purify('wordSpacing', value) }
  if (name === 'textIndent') return { textIndent: purify('textIndent', value) }
  if (name === 'overflowWrap' || name === 'wordWrap')
    return { overflowWrap: value }
  if (name === 'textDecorationThickness')
    return { textDecorationThickness: purify('textDecorationThickness', value) }
  if (name === 'textUnderlineOffset')
    return { textUnderlineOffset: purify('textUnderlineOffset', value) }
  if (name === 'textDecorationLine') return { textDecorationLine: value }
  if (name === 'textDecorationStyle') return { textDecorationStyle: value }
  if (name === 'textDecorationColor') return { textDecorationColor: value }
  if (name === 'textAlignLast') return { textAlignLast: value }
  if (name === 'visibility') return { visibility: value }

  // mix-blend-mode, image-rendering: pass through to SVG attributes
  if (name === 'mixBlendMode') return { mixBlendMode: value }
  if (name === 'imageRendering') return { imageRendering: value }
  if (name === 'imageOrientation') return { imageOrientation: value }

  // background-position-x / background-position-y
  if (name === 'backgroundPositionX')
    return { backgroundPositionX: purify('backgroundPositionX', value) }
  if (name === 'backgroundPositionY')
    return { backgroundPositionY: purify('backgroundPositionY', value) }

  // mask sub-properties
  if (name === 'maskMode') return { maskMode: value }
  if (name === 'maskOrigin') return { maskOrigin: value }
  if (name === 'maskClip') return { maskClip: value }
  if (name === 'maskComposite') return { maskComposite: value }
  if (name === 'maskType') return { maskType: value }

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

  if (name === 'aspectRatio') return { aspectRatio: value }

  if (name === 'zIndex') {
    return { [name]: value }
  }

  if (name === 'lineHeight') {
    return { lineHeight: purify(name, value) }
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

    // To support percentages in transform (which is not supported in RN), we
    // replace them with random symbols and then replace them back after parsing.
    const symbols = {}
    const replaced = value.replace(/(-?[\d.]+%)/g, (_, _v) => {
      const symbol = ~~(Math.random() * 1e9)
      symbols[symbol] = _v
      return symbol + 'px'
    })
    const parsed = getStylesForProperty('transform', replaced, true)
    for (const t of parsed.transform) {
      for (const k in t) {
        if (symbols[t[k]]) {
          t[k] = symbols[t[k]]
        }
      }
    }
    return parsed
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

type MainStyle = {
  color: string
  fontSize: number
  transformOrigin: ParsedTransformOrigin
  maskImage: MaskProperty[]
  opacity: number
  textTransform: string
  whiteSpace: string
  wordBreak: string
  textAlign: string
  textAlignLast: string
  lineHeight: number | string
  letterSpacing: number

  fontFamily: string | string[]
  fontWeight: FontWeight
  fontStyle: FontStyle

  borderTopWidth: number
  borderLeftWidth: number
  borderRightWidth: number
  borderBottomWidth: number

  paddingTop: number
  paddingLeft: number
  paddingRight: number
  paddingBottom: number

  flexGrow: number
  flexShrink: number

  gap: number
  rowGap: number
  columnGap: number

  textShadowOffset: {
    width: number
    height: number
  }[]
  textShadowColor: string[]
  textShadowRadius: number[]
  WebkitTextStrokeWidth: number
  WebkitTextStrokeColor: string
  textDecorationSkipInk: 'auto' | 'none' | 'all'
}

type OtherStyle = Exclude<Record<PropertyKey, string | number>, keyof MainStyle>

export type SerializedStyle = Partial<MainStyle & OtherStyle>

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
      const transforms = value as any as { [type: string]: number | string }[]

      for (const transform of transforms) {
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
