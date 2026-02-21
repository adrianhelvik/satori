import { CSS_ALL_UNSET_INHERITED_PROP_NAMES } from './style-reset-config.js'

export const CSS_ALL_UNSET_INHERITED_PROPS: Set<string> = new Set(
  CSS_ALL_UNSET_INHERITED_PROP_NAMES
)

export const RUNTIME_INHERITED_PROPS: Set<string> = new Set([
  ...CSS_ALL_UNSET_INHERITED_PROPS,

  // Extra properties that need manual propagation in Satori's rendering model.
  'font',
  'fontKerning',
  'transform',
  'touchAction',
  'userSelect',
  'opacity',
  'filter',

  // Internal rendering context fields.
  '_viewportWidth',
  '_viewportHeight',
  '_inheritedClipPathId',
  '_inheritedMaskId',
  '_inheritedBackgroundClipTextPath',
])
