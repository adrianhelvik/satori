import type { SerializedStyle } from './expand.js'
import { RUNTIME_INHERITED_PROPS } from './style-inheritance.js'

export default function inheritable(style: SerializedStyle): SerializedStyle {
  const inheritedStyle: SerializedStyle = {}
  for (const prop in style) {
    if (RUNTIME_INHERITED_PROPS.has(prop)) {
      inheritedStyle[prop] = style[prop]
    }
  }
  return inheritedStyle
}
