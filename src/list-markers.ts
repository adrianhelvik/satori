import { createElement, type ReactNode } from 'react'

import type { Locale } from './language.js'
import type FontLoader from './font.js'
import type { SerializedStyle } from './handler/style-types.js'
import { parseFiniteNumber } from './style-number.js'

export interface OrderedListCounterState {
  value: number
}

interface ParsedCounterProperty {
  explicit: boolean
  none: boolean
  values: Map<string, number>
}

const integerCounterToken = /^[+-]?\d+$/

function parseCounterProperty(
  value: unknown,
  defaultAmount: number
): ParsedCounterProperty {
  if (typeof value !== 'string') {
    return { explicit: false, none: false, values: new Map() }
  }

  const raw = value.trim()
  if (!raw) {
    return { explicit: false, none: false, values: new Map() }
  }

  if (raw.toLowerCase() === 'none') {
    return { explicit: true, none: true, values: new Map() }
  }

  const values = new Map<string, number>()
  const tokens = raw.split(/\s+/).filter(Boolean)
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (integerCounterToken.test(token)) continue

    const name = token.toLowerCase()
    let amount = defaultAmount
    const maybeAmount = tokens[i + 1]
    if (maybeAmount && integerCounterToken.test(maybeAmount)) {
      amount = Number.parseInt(maybeAmount, 10)
      i++
    }
    values.set(name, amount)
  }

  return { explicit: true, none: false, values }
}

export function applyListItemCounterStyles(
  counter: OrderedListCounterState,
  style: SerializedStyle,
  defaultIncrement: number
) {
  const reset = parseCounterProperty(style.counterReset, 0)
  const resetListItem = reset.values.get('list-item')
  if (typeof resetListItem === 'number') {
    counter.value = resetListItem
  }

  const set = parseCounterProperty(style.counterSet, 0)
  const setListItem = set.values.get('list-item')
  if (typeof setListItem === 'number') {
    counter.value = setListItem
  }

  const increment = parseCounterProperty(style.counterIncrement, 1)
  if (increment.none) return

  if (increment.explicit) {
    const incrementListItem = increment.values.get('list-item')
    if (typeof incrementListItem === 'number') {
      counter.value += incrementListItem
    }
    return
  }

  if (defaultIncrement !== 0) {
    counter.value += defaultIncrement
  }
}

export function parseListImageURL(value: string | undefined): string | null {
  if (!value) return null
  const normalized = value.trim()
  if (!normalized || normalized.toLowerCase() === 'none') return null
  const match = normalized.match(/^url\((.*)\)$/i)
  if (!match) return null
  return match[1].trim().replace(/(^['"])|(['"]$)/g, '')
}

export function buildListItemChildren(
  children: ReactNode,
  marker: { text: string | null; image: string | null; position: string },
  fontSize: number,
  markerTextWidth?: number,
  isDisplayListItem = false
): { children: ReactNode[]; requiresRelativePosition: boolean } {
  const markerGap = Math.max(4, Math.round(fontSize * 0.25))
  const markerBoxWidth =
    marker.position === 'inside'
      ? undefined
      : marker.image !== null
      ? Math.max(12, Math.round(fontSize * 1.25))
      : Math.max(
          12,
          Math.ceil(markerTextWidth || 0) +
            Math.max(2, Math.round(fontSize * 0.15))
        )
  const markerSize = Math.max(8, Math.round(fontSize * 0.75))

  const isOutsideMarker = marker.position !== 'inside'
  const markerWrapper: Record<string, string | number> = isOutsideMarker
    ? {
        display: 'inline-flex',
        position: 'absolute',
        left: -((markerBoxWidth || markerSize) + markerGap),
        top: 0,
        width: markerBoxWidth || markerSize,
        justifyContent: 'flex-end',
        alignItems: 'flex-start',
        flexShrink: 0,
      }
    : {
        display: 'inline-flex',
        flexShrink: 0,
        marginRight: markerGap,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
      }

  const markerNode =
    marker.image !== null
      ? createElement(
          'div',
          { key: '__satori-list-marker', style: markerWrapper },
          createElement('img', {
            src: marker.image,
            style: {
              display: 'flex',
              width: markerSize,
              height: markerSize,
              flexShrink: 0,
              objectFit: 'contain',
              marginTop: Math.max(0, Math.round(fontSize * 0.1)),
            },
          })
        )
      : createElement(
          'div',
          { key: '__satori-list-marker', style: markerWrapper },
          marker.text
        )

  const contentNode = createElement(
    'div',
    {
      key: '__satori-list-content',
      style: {
        display: 'inline-flex',
        flexDirection: 'column',
        flexGrow: 1,
        minWidth: 0,
      },
    },
    children
  )

  return {
    children: [markerNode, contentNode],
    requiresRelativePosition: isOutsideMarker,
  }
}

export function measureListMarkerTextWidth(
  markerText: string | null,
  fontSize: number,
  style: SerializedStyle,
  font: FontLoader,
  locale: Locale | undefined
): number | undefined {
  if (!markerText) return undefined

  try {
    const engine = font.getEngine(
      fontSize,
      (style.lineHeight as number | string | undefined) || 'normal',
      {
        fontFamily: style.fontFamily as string | string[] | undefined,
        fontWeight: style.fontWeight as any,
        fontStyle: style.fontStyle as any,
      },
      locale
    )
    return engine.measure(markerText, {
      fontSize,
      letterSpacing: parseFiniteNumber(style.letterSpacing, 0),
      kerning: style.fontKerning !== 'none',
    })
  } catch {
    return undefined
  }
}
