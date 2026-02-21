import { CSS_ALL_UNSET_INHERITED_PROPS } from './style-inheritance.js'
import { CSS_ALL_INITIAL_STYLE } from './style-reset-config.js'
import type { SerializedStyle } from './style-types.js'

const allModes = new Set([
  'initial',
  'inherit',
  'unset',
  'revert',
  'revert-layer',
])

const allExcludedProps = new Set(['direction', 'unicodeBidi'])

function cloneResetValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.slice()
  }

  if (value && typeof value === 'object') {
    return { ...value }
  }

  return value
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

  for (const prop in CSS_ALL_INITIAL_STYLE) {
    if (!allExcludedProps.has(prop)) {
      serializedStyle[prop] = cloneResetValue(
        CSS_ALL_INITIAL_STYLE[prop]
      ) as SerializedStyle[keyof SerializedStyle]
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
    const inheritedValue = inheritedStyle[prop]
    if (typeof inheritedValue !== 'undefined') {
      serializedStyle[prop] = inheritedValue
    }
  }
}
