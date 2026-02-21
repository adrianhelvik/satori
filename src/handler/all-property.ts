import { CSS_ALL_UNSET_INHERITED_PROPS } from './style-inheritance.js'
import type { SerializedStyle } from './style-types.js'

const allModes = new Set([
  'initial',
  'inherit',
  'unset',
  'revert',
  'revert-layer',
])

const allExcludedProps = new Set(['direction', 'unicodeBidi'])

function getAllInitialStyle(): SerializedStyle {
  return {
    color: 'black',
    fontFamily: ['serif'],
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: 'normal',
    fontVariantCaps: 'normal',
    fontSizeAdjust: 'none',
    lineHeight: 'normal',
    letterSpacing: 0,
    textAlign: 'start',
    textAlignLast: 'auto',
    textJustify: 'auto',
    textTransform: 'none',
    whiteSpace: 'normal',
    wordBreak: 'normal',
    overflowWrap: 'normal',
    hyphenateLimitChars: 'auto',
    tabSize: 8,
    listStyleType: 'disc',
    listStylePosition: 'outside',
    listStyleImage: 'none',
    counterReset: 'none',
    counterIncrement: 'none',
    counterSet: 'none',
    wordSpacing: 0,
    textIndent: 0,
    visibility: 'visible',
    cursor: 'auto',
    touchAction: 'auto',
    userSelect: 'auto',
    opacity: 1,
    filter: 'none',
    textDecorationLine: 'none',
    textDecorationStyle: 'solid',
    textDecorationSkipInk: 'auto',
    textUnderlinePosition: 'auto',
    backgroundColor: 'transparent',
    backgroundRepeat: 'repeat',
    backgroundPosition: '0% 0%',
    backgroundSize: 'auto',
    backgroundClip: 'border-box',
    backgroundOrigin: 'padding-box',
    mixBlendMode: 'normal',
    isolation: 'auto',
    maskImage: 'none',
  }
}

export function applyAllReset(
  serializedStyle: SerializedStyle,
  inheritedStyle: SerializedStyle,
  value: string | number
) {
  const mode = String(value).trim().toLowerCase()
  if (!allModes.has(mode)) {
    throw new Error('Invalid `all` value.')
  }

  const preservedBySpec: SerializedStyle = {}
  for (const prop of allExcludedProps) {
    if (typeof serializedStyle[prop] !== 'undefined') {
      preservedBySpec[prop] = serializedStyle[prop]
    } else if (typeof inheritedStyle[prop] !== 'undefined') {
      preservedBySpec[prop] = inheritedStyle[prop]
    }
  }

  for (const prop in serializedStyle) {
    if (!prop.startsWith('_') && !allExcludedProps.has(prop)) {
      delete serializedStyle[prop]
    }
  }

  const initialStyle = getAllInitialStyle()
  for (const prop in initialStyle) {
    if (!allExcludedProps.has(prop)) {
      serializedStyle[prop] = initialStyle[prop]
    }
  }
  Object.assign(serializedStyle, preservedBySpec)

  if (mode === 'initial') {
    return
  }

  if (mode === 'revert' || mode === 'revert-layer') {
    // `revert` / `revert-layer` depend on origin/layer cascade history, which
    // Satori doesn't model. Approximate both as `initial`.
    return
  }

  if (mode === 'inherit') {
    for (const prop in inheritedStyle) {
      if (!prop.startsWith('_') && !allExcludedProps.has(prop)) {
        serializedStyle[prop] = inheritedStyle[prop]
      }
    }
    return
  }

  for (const prop of CSS_ALL_UNSET_INHERITED_PROPS) {
    if (typeof inheritedStyle[prop] !== 'undefined') {
      serializedStyle[prop] = inheritedStyle[prop]
    }
  }
}
