import type { SerializedStyle } from '../handler/style-types.js'
import type FontLoader from '../font.js'
import type { Locale } from '../language.js'
import { getListMarkerText } from '../handler/list-style.js'
import {
  applyListItemCounterStyles,
  buildListItemChildren,
  measureListMarkerTextWidth,
  parseListImageURL,
  type OrderedListCounterState,
} from '../list-markers.js'
import { parseFiniteNumber } from '../style-number.js'

export interface ListItemContext {
  listType: 'ul' | 'ol'
  index: number
  styleType?: string
  stylePosition?: string
  styleImage?: string
  orderedCounter?: OrderedListCounterState
}

export interface ListMarkerResult {
  children: any
  requiresRelativePosition: boolean
}

export function resolveListMarker(
  listItemContext: ListItemContext,
  computedStyle: SerializedStyle,
  inheritedStyle: SerializedStyle,
  children: any,
  font: FontLoader,
  locale: Locale | undefined
): ListMarkerResult | null {
  const listStyleType =
    (computedStyle.listStyleType as string | undefined) ||
    listItemContext.styleType ||
    (listItemContext.listType === 'ol' ? 'decimal' : 'disc')
  const listStylePosition =
    ((computedStyle.listStylePosition as string | undefined) ||
      listItemContext.stylePosition ||
      'outside') + ''
  const listStyleImage = parseListImageURL(
    (computedStyle.listStyleImage as string | undefined) ||
      listItemContext.styleImage
  )
  let markerIndex = listItemContext.index
  if (listItemContext.orderedCounter) {
    applyListItemCounterStyles(listItemContext.orderedCounter, computedStyle, 1)
    markerIndex = listItemContext.orderedCounter.value
  }
  const markerText = getListMarkerText(listStyleType, markerIndex)

  if (!listStyleImage && !markerText) return null

  const markerFontSize = parseFiniteNumber(
    computedStyle.fontSize,
    parseFiniteNumber(inheritedStyle.fontSize, 16)
  )
  const markerTextWidth = measureListMarkerTextWidth(
    markerText,
    markerFontSize,
    computedStyle,
    font,
    locale
  )
  const normalizedMarkerPosition = listStylePosition.trim().toLowerCase()
  const listItemChildren = buildListItemChildren(
    children,
    {
      text: markerText,
      image: listStyleImage,
      position: normalizedMarkerPosition,
    },
    markerFontSize,
    markerTextWidth
  )

  return {
    children: listItemChildren.children,
    requiresRelativePosition: listItemChildren.requiresRelativePosition,
  }
}
