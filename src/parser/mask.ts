import { getPropertyName } from 'css-to-react-native'
import { splitEffects } from '../utils.js'

function getMaskProperty(style: Record<string, string | number>, name: string) {
  const key = getPropertyName(`mask-${name}`)
  return (style[key] || style[`WebkitM${key.substring(1)}`]) as string
}

export interface MaskProperty {
  image: string
  position: string
  size: string
  repeat: string
  origin: string
  clip: string
  mode: string
  composite: string
  type: string
}

export function parseMask(
  style: Record<string, string | number>
): MaskProperty[] {
  const maskImage = (style.maskImage || style.WebkitMaskImage) as string

  const positions = splitEffects(getMaskProperty(style, 'position') || '0% 0%')
  const sizes = splitEffects(getMaskProperty(style, 'size') || '100% 100%')
  const repeats = splitEffects(getMaskProperty(style, 'repeat') || 'repeat')
  const origins = splitEffects(getMaskProperty(style, 'origin') || 'border-box')
  const clips = splitEffects(getMaskProperty(style, 'clip') || 'border-box')
  const modes = splitEffects(getMaskProperty(style, 'mode') || 'match-source')
  const composites = splitEffects(getMaskProperty(style, 'composite') || 'add')
  const types = splitEffects(getMaskProperty(style, 'type') || 'luminance')

  let maskImages = splitEffects(maskImage).filter((v) => v && v !== 'none')

  return maskImages
    .map((image, i) => ({
      image,
      position: positions[i] || positions[positions.length - 1] || '0% 0%',
      size: sizes[i] || sizes[sizes.length - 1] || '100% 100%',
      repeat: repeats[i] || repeats[repeats.length - 1] || 'repeat',
      origin: origins[i] || origins[origins.length - 1] || 'border-box',
      clip: clips[i] || clips[clips.length - 1] || 'border-box',
      mode: modes[i] || modes[modes.length - 1] || 'match-source',
      composite: composites[i] || composites[composites.length - 1] || 'add',
      type: types[i] || types[types.length - 1] || 'luminance',
    }))
    .reverse()
}
