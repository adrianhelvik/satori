import type { TwConfig } from 'twrnc'

import * as twrnc from 'twrnc/create'

type TwPlugin = TwConfig['plugins'][number]
type TwStyle = Record<string, unknown>
type TwConverter = ReturnType<typeof createTw>
type TwApply = (tokens: string[]) => TwStyle

const defaultShadows: TwPlugin = {
  handler: ({ addUtilities }) => {
    const presets = {
      'shadow-sm': { boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' },
      shadow: {
        boxShadow:
          '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      },
      'shadow-md': {
        boxShadow:
          '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      },
      'shadow-lg': {
        boxShadow:
          '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
      'shadow-xl': {
        boxShadow:
          '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
      'shadow-2xl': {
        boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      },
      'shadow-inner': {
        boxShadow: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
      },
      'shadow-none': { boxShadow: '0 0 #0000' },
    }

    addUtilities(presets)
  },
}

function createTw(config?: TwConfig) {
  return twrnc.create(
    {
      ...config,
      plugins: [...(config?.plugins ?? []), defaultShadows],
    },
    'web'
  )
}

const twByConfig = new WeakMap<TwConfig, TwConverter>()
let defaultTw: TwConverter | undefined

function resolveTwConverter(config?: TwConfig): TwConverter {
  if (config) {
    const cached = twByConfig.get(config)
    if (cached) return cached
    const created = createTw(config)
    twByConfig.set(config, created)
    return created
  }

  if (!defaultTw) {
    defaultTw = createTw()
  }
  return defaultTw
}

function normalizeTwStyles(
  twStyles: TwStyle,
  style: TwStyle | undefined
): TwStyle {
  const normalized = { ...twStyles }

  if (typeof normalized.lineHeight === 'number') {
    const inheritedFontSize =
      typeof style?.fontSize === 'number' ? style.fontSize : 16
    const twFontSize =
      typeof normalized.fontSize === 'number' ? normalized.fontSize : undefined
    const baseFontSize = twFontSize || inheritedFontSize || 16
    normalized.lineHeight = normalized.lineHeight / baseFontSize
  }

  if (
    typeof normalized.shadowColor === 'string' &&
    typeof normalized.boxShadow === 'string'
  ) {
    normalized.boxShadow = normalized.boxShadow.replace(
      /rgba?\([^)]+\)/,
      normalized.shadowColor
    )
  }

  return normalized
}

export function createTwStyleResolver({
  width,
  height,
  config,
}: {
  width?: number
  height?: number
  config?: TwConfig
}) {
  const tw = resolveTwConverter(config)
  tw.setWindowDimensions({
    width: Number.isFinite(width) ? Number(width) : 0,
    height: Number.isFinite(height) ? Number(height) : 0,
  })

  return (twClassName: string, style: TwStyle | undefined): TwStyle => {
    const applyTw = tw as unknown as TwApply
    return normalizeTwStyles({ ...applyTw([twClassName]) }, style)
  }
}

export default function getTw({
  width,
  height,
  config,
}: {
  width?: number
  height?: number
  config?: TwConfig
}) {
  const tw = resolveTwConverter(config)
  tw.setWindowDimensions({
    width: Number.isFinite(width) ? Number(width) : 0,
    height: Number.isFinite(height) ? Number(height) : 0,
  })
  return tw
}
