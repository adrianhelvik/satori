/**
 * Handler to update the Yoga node properties with the given element type and
 * style. Each supported element has its own preset styles, so this function
 * also returns the inherited style for children of the element.
 */

import presets from './presets.js'
import inheritable from './inheritable.js'
import expand from './expand.js'
import type { SerializedStyle } from './style-types.js'
import { DISPLAY_VALUE_TO_CANONICAL, normalizeDisplayValue } from './display.js'
import {
  asPointAutoPercentageLength,
  asPointPercentageLength,
  lengthToNumber,
  parseViewBox,
  v,
} from '../utils.js'
import { getYoga, YogaNode } from '../yoga.js'
import { resolveImageData } from './image.js'
import { isClippedOverflow } from '../overflow-semantics.js'

type SatoriElement = keyof typeof presets
const TRANSPARENT_PIXEL_DATA_URI =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
const BROKEN_IMAGE_FALLBACK_SIZE = 16

const ALIGNMENT_VALUE_ALIASES: Record<string, string> = {
  start: 'flex-start',
  end: 'flex-end',
  'self-start': 'flex-start',
  'self-end': 'flex-end',
}

const JUSTIFY_CONTENT_VALUE_ALIASES: Record<string, string> = {
  ...ALIGNMENT_VALUE_ALIASES,
  left: 'flex-start',
  right: 'flex-end',
}

const POSITION_VALUE_ALIASES: Record<string, string> = {
  fixed: 'absolute',
  sticky: 'relative',
}

function normalizeBoxAlignmentValue(
  value: unknown,
  aliases: Record<string, string>
): unknown {
  if (typeof value !== 'string') return value

  const normalized = value.trim().toLowerCase()
  if (!normalized) return normalized

  // CSS overflow-position prefix (`safe` / `unsafe`) has no Yoga equivalent.
  const withoutOverflowPosition = normalized.replace(/^(safe|unsafe)\s+/, '')
  return aliases[withoutOverflowPosition] || withoutOverflowPosition
}

function normalizePositionValue(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const normalized = value.trim().toLowerCase()
  return POSITION_VALUE_ALIASES[normalized] || normalized
}

function isAutoSize(value: unknown): boolean {
  return typeof value === 'undefined' || value === 'auto'
}

function parseAspectRatioValue(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : undefined
  }

  if (typeof value === 'string') {
    if (value === 'auto') return undefined

    const parts = value.split('/').map((s) => parseFloat(s.trim()))
    if (
      parts.length === 2 &&
      Number.isFinite(parts[0]) &&
      Number.isFinite(parts[1]) &&
      parts[0] > 0 &&
      parts[1] > 0
    ) {
      return parts[0] / parts[1]
    }

    if (parts.length === 1 && Number.isFinite(parts[0]) && parts[0] > 0) {
      return parts[0]
    }
  }

  return undefined
}

function shouldApplyAspectRatio(
  node: YogaNode,
  style: SerializedStyle,
  Yoga: Awaited<ReturnType<typeof getYoga>>
): boolean {
  const parent = node.getParent()
  if (!parent) return true

  const parentDirection = parent.getFlexDirection()
  const isRowParent =
    parentDirection === Yoga.FLEX_DIRECTION_ROW ||
    parentDirection === Yoga.FLEX_DIRECTION_ROW_REVERSE
  const isColumnParent =
    parentDirection === Yoga.FLEX_DIRECTION_COLUMN ||
    parentDirection === Yoga.FLEX_DIRECTION_COLUMN_REVERSE

  if (!isRowParent && !isColumnParent) return true

  const alignSelf = style.alignSelf
  const isAlignSelfStretch = alignSelf === 'stretch'
  const isAlignSelfOverridden =
    typeof alignSelf === 'string' &&
    alignSelf !== 'auto' &&
    alignSelf !== 'normal' &&
    alignSelf !== 'stretch'
  const isCrossStretch =
    isAlignSelfStretch ||
    (!isAlignSelfOverridden && parent.getAlignItems() === Yoga.ALIGN_STRETCH)

  if (!isCrossStretch) return true

  if (isRowParent && isAutoSize(style.height)) return false
  if (isColumnParent && isAutoSize(style.width)) return false

  return true
}

export default async function compute(
  node: YogaNode,
  type: SatoriElement | string,
  inheritedStyle: SerializedStyle,
  definedStyle: Record<string, string | number>,
  props: Record<string, any>
): Promise<[SerializedStyle, SerializedStyle]> {
  const Yoga = await getYoga()

  // Extend the default style with defined and inherited styles.
  const style: SerializedStyle = {
    ...inheritedStyle,
    ...expand(presets[type], inheritedStyle),
    ...expand(definedStyle, inheritedStyle),
  }

  if (type === 'img') {
    let [resolvedSrc, imageWidth, imageHeight] = await resolveImageData(
      props.src
    )
    const imageResolutionFailed = typeof resolvedSrc !== 'string'

    // Keep rendering when image fetch/parsing fails. Browsers still layout the
    // <img> box in this case, while the bitmap itself is empty/broken.
    if (imageResolutionFailed) {
      resolvedSrc = TRANSPARENT_PIXEL_DATA_URI
    }

    // Cannot parse the image size (e.g. base64 data URI).
    if (imageWidth === undefined && imageHeight === undefined) {
      if (props.width === undefined || props.height === undefined) {
        if (imageResolutionFailed) {
          imageWidth = BROKEN_IMAGE_FALLBACK_SIZE
          imageHeight = BROKEN_IMAGE_FALLBACK_SIZE
        } else {
          throw new Error(
            'Image size cannot be determined. Please provide the width and height of the image.'
          )
        }
      } else {
        imageWidth = parseInt(props.width)
        imageHeight = parseInt(props.height)
      }
    }
    const r = imageHeight / imageWidth

    // Before calculating the missing width or height based on the image ratio,
    // we must subtract the padding and border due to how box model works.
    // TODO: Ensure these are absolute length values, not relative values.
    let extraHorizontal =
      (style.borderLeftWidth || 0) +
      (style.borderRightWidth || 0) +
      (style.paddingLeft || 0) +
      (style.paddingRight || 0)
    let extraVertical =
      (style.borderTopWidth || 0) +
      (style.borderBottomWidth || 0) +
      (style.paddingTop || 0) +
      (style.paddingBottom || 0)

    let contentBoxWidth = style.width || props.width
    let contentBoxHeight = style.height || props.height

    const isAbsoluteContentSize =
      typeof contentBoxWidth === 'number' &&
      typeof contentBoxHeight === 'number'

    if (isAbsoluteContentSize) {
      contentBoxWidth -= extraHorizontal
      contentBoxHeight -= extraVertical
    }

    // When no content size is defined, use intrinsic image dimensions.
    // Browser <img> elements default to intrinsic size, not 100% fill.
    if (contentBoxWidth === undefined && contentBoxHeight === undefined) {
      if (typeof imageWidth === 'number' && typeof imageHeight === 'number') {
        contentBoxWidth = imageWidth
        contentBoxHeight = imageHeight
      } else {
        contentBoxWidth = '100%'
        node.setAspectRatio(1 / r)
      }
    } else {
      // If only one sisde is not defined, we can calculate the other one.
      if (contentBoxWidth === undefined) {
        if (typeof contentBoxHeight === 'number') {
          contentBoxWidth = contentBoxHeight / r
        } else {
          // If it uses a relative value (e.g. 50%), we can rely on aspect ratio.
          // Note: this doesn't work well if there are paddings or borders.
          node.setAspectRatio(1 / r)
        }
      } else if (contentBoxHeight === undefined) {
        if (typeof contentBoxWidth === 'number') {
          contentBoxHeight = contentBoxWidth * r
        } else {
          // If it uses a relative value (e.g. 50%), we can rely on aspect ratio.
          // Note: this doesn't work well if there are paddings or borders.
          node.setAspectRatio(1 / r)
        }
      }
    }

    style.width = isAbsoluteContentSize
      ? (contentBoxWidth as number) + extraHorizontal
      : contentBoxWidth
    style.height = isAbsoluteContentSize
      ? (contentBoxHeight as number) + extraVertical
      : contentBoxHeight
    style.__src = resolvedSrc
    style.__srcWidth = imageWidth
    style.__srcHeight = imageHeight
  }

  if (type === 'svg') {
    const viewBox = props.viewBox || props.viewbox
    const viewBoxSize = parseViewBox(viewBox)
    const ratio = viewBoxSize ? viewBoxSize[3] / viewBoxSize[2] : null
    const hasIntrinsicRatio =
      typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 0

    const normalizeSvgSize = (value: unknown): string | number | undefined => {
      if (typeof value === 'undefined') return undefined
      if (typeof value !== 'string' && typeof value !== 'number')
        return undefined

      return (
        lengthToNumber(value, inheritedStyle.fontSize, 1, inheritedStyle) ||
        value
      )
    }

    let width = normalizeSvgSize(props.width)
    let height = normalizeSvgSize(props.height)

    if (typeof width === 'undefined' && typeof height === 'undefined') {
      if (hasIntrinsicRatio) {
        // Match browser behavior for <svg> without explicit size: it expands
        // to the available width and preserves the intrinsic viewBox ratio.
        width = '100%'
        if (typeof style.aspectRatio === 'undefined') {
          style.aspectRatio = 1 / ratio
        }
      } else {
        // Fallback intrinsic dimensions from HTML replaced-element defaults.
        width = 300
        height = 150
      }
    } else if (
      hasIntrinsicRatio &&
      typeof style.aspectRatio === 'undefined' &&
      (typeof width === 'undefined' || typeof height === 'undefined')
    ) {
      style.aspectRatio = 1 / ratio
    }

    if (typeof style.width === 'undefined' && typeof width !== 'undefined') {
      style.width = width
    }
    if (typeof style.height === 'undefined' && typeof height !== 'undefined') {
      style.height = height
    }
  }

  // Set properties for Yoga.
  const normalizedDisplay = normalizeDisplayValue(style.display)
  const display = v(
    normalizedDisplay || undefined,
    DISPLAY_VALUE_TO_CANONICAL,
    'flex',
    'display'
  )
  node.setDisplay(
    v(
      display,
      {
        flex: Yoga.DISPLAY_FLEX,
        contents: Yoga.DISPLAY_CONTENTS,
        none: Yoga.DISPLAY_NONE,
      },
      Yoga.DISPLAY_FLEX,
      'display'
    )
  )

  const alignContentValue = normalizeBoxAlignmentValue(
    style.alignContent,
    ALIGNMENT_VALUE_ALIASES
  )
  node.setAlignContent(
    v(
      alignContentValue,
      {
        stretch: Yoga.ALIGN_STRETCH,
        center: Yoga.ALIGN_CENTER,
        'flex-start': Yoga.ALIGN_FLEX_START,
        'flex-end': Yoga.ALIGN_FLEX_END,
        'space-between': Yoga.ALIGN_SPACE_BETWEEN,
        'space-around': Yoga.ALIGN_SPACE_AROUND,
        'space-evenly': Yoga.ALIGN_SPACE_EVENLY,
        baseline: Yoga.ALIGN_BASELINE,
        normal: Yoga.ALIGN_STRETCH,
      },
      Yoga.ALIGN_STRETCH,
      'alignContent'
    )
  )

  const alignItemsValue = normalizeBoxAlignmentValue(
    style.alignItems,
    ALIGNMENT_VALUE_ALIASES
  )
  node.setAlignItems(
    v(
      alignItemsValue,
      {
        stretch: Yoga.ALIGN_STRETCH,
        center: Yoga.ALIGN_CENTER,
        'flex-start': Yoga.ALIGN_FLEX_START,
        'flex-end': Yoga.ALIGN_FLEX_END,
        baseline: Yoga.ALIGN_BASELINE,
        normal: Yoga.ALIGN_AUTO,
      },
      Yoga.ALIGN_STRETCH,
      'alignItems'
    )
  )

  const alignSelfValue = normalizeBoxAlignmentValue(
    style.alignSelf,
    ALIGNMENT_VALUE_ALIASES
  )
  node.setAlignSelf(
    v(
      alignSelfValue,
      {
        stretch: Yoga.ALIGN_STRETCH,
        center: Yoga.ALIGN_CENTER,
        'flex-start': Yoga.ALIGN_FLEX_START,
        'flex-end': Yoga.ALIGN_FLEX_END,
        baseline: Yoga.ALIGN_BASELINE,
        normal: Yoga.ALIGN_AUTO,
      },
      Yoga.ALIGN_AUTO,
      'alignSelf'
    )
  )

  const justifyContentValue = normalizeBoxAlignmentValue(
    style.justifyContent,
    JUSTIFY_CONTENT_VALUE_ALIASES
  )
  node.setJustifyContent(
    v(
      justifyContentValue,
      {
        center: Yoga.JUSTIFY_CENTER,
        'flex-start': Yoga.JUSTIFY_FLEX_START,
        'flex-end': Yoga.JUSTIFY_FLEX_END,
        'space-between': Yoga.JUSTIFY_SPACE_BETWEEN,
        'space-around': Yoga.JUSTIFY_SPACE_AROUND,
        'space-evenly': Yoga.JUSTIFY_SPACE_EVENLY,
        normal: Yoga.JUSTIFY_FLEX_START,
      },
      Yoga.JUSTIFY_FLEX_START,
      'justifyContent'
    )
  )
  if (typeof style.aspectRatio !== 'undefined') {
    const ar = parseAspectRatioValue(style.aspectRatio)
    if (
      typeof ar !== 'undefined' &&
      shouldApplyAspectRatio(node, style, Yoga)
    ) {
      node.setAspectRatio(ar)
    }
  }

  node.setFlexDirection(
    v(
      style.flexDirection,
      {
        row: Yoga.FLEX_DIRECTION_ROW,
        column: Yoga.FLEX_DIRECTION_COLUMN,
        'row-reverse': Yoga.FLEX_DIRECTION_ROW_REVERSE,
        'column-reverse': Yoga.FLEX_DIRECTION_COLUMN_REVERSE,
      },
      Yoga.FLEX_DIRECTION_ROW,
      'flexDirection'
    )
  )
  node.setFlexWrap(
    v(
      style.flexWrap,
      {
        wrap: Yoga.WRAP_WRAP,
        nowrap: Yoga.WRAP_NO_WRAP,
        'wrap-reverse': Yoga.WRAP_WRAP_REVERSE,
      },
      Yoga.WRAP_NO_WRAP,
      'flexWrap'
    )
  )

  if (typeof style.gap !== 'undefined') {
    node.setGap(Yoga.GUTTER_ALL, style.gap)
  }

  if (typeof style.rowGap !== 'undefined') {
    node.setGap(Yoga.GUTTER_ROW, style.rowGap)
  }

  if (typeof style.columnGap !== 'undefined') {
    node.setGap(Yoga.GUTTER_COLUMN, style.columnGap)
  }

  // @TODO: node.setFlex

  if (typeof style.flexBasis !== 'undefined') {
    node.setFlexBasis(asPointAutoPercentageLength(style.flexBasis, 'flexBasis'))
  }
  node.setFlexGrow(typeof style.flexGrow === 'undefined' ? 0 : style.flexGrow)
  node.setFlexShrink(
    typeof style.flexShrink === 'undefined' ? 0 : style.flexShrink
  )

  if (typeof style.maxHeight !== 'undefined') {
    node.setMaxHeight(asPointPercentageLength(style.maxHeight, 'maxHeight'))
  }
  if (typeof style.maxWidth !== 'undefined') {
    node.setMaxWidth(asPointPercentageLength(style.maxWidth, 'maxWidth'))
  }
  if (typeof style.minHeight !== 'undefined') {
    node.setMinHeight(asPointPercentageLength(style.minHeight, 'minHeight'))
  }
  if (typeof style.minWidth !== 'undefined') {
    node.setMinWidth(asPointPercentageLength(style.minWidth, 'minWidth'))
  }

  // Merge overflow-x/overflow-y into overflow: hidden if either axis clips.
  const overflowHasClippedAxis =
    isClippedOverflow(style.overflowX) || isClippedOverflow(style.overflowY)
  const effectiveOverflow =
    style.overflow || (overflowHasClippedAxis ? 'hidden' : undefined)

  node.setOverflow(
    v(
      effectiveOverflow,
      {
        visible: Yoga.OVERFLOW_VISIBLE,
        hidden: Yoga.OVERFLOW_HIDDEN,
        clip: Yoga.OVERFLOW_HIDDEN,
        auto: Yoga.OVERFLOW_HIDDEN,
        scroll: Yoga.OVERFLOW_HIDDEN,
      },
      Yoga.OVERFLOW_VISIBLE,
      'overflow'
    )
  )

  // Normalize per-axis overflow values so downstream code has a single source
  // of truth. If only the shorthand `overflow` was set, fan it out; if neither
  // shorthand nor per-axis was set, default to 'visible'.
  if (!style.overflowX) style.overflowX = style.overflow || 'visible'
  if (!style.overflowY) style.overflowY = style.overflow || 'visible'

  node.setMargin(
    Yoga.EDGE_TOP,
    asPointAutoPercentageLength(style.marginTop || 0)
  )
  node.setMargin(
    Yoga.EDGE_BOTTOM,
    asPointAutoPercentageLength(style.marginBottom || 0)
  )
  node.setMargin(
    Yoga.EDGE_LEFT,
    asPointAutoPercentageLength(style.marginLeft || 0)
  )
  node.setMargin(
    Yoga.EDGE_RIGHT,
    asPointAutoPercentageLength(style.marginRight || 0)
  )

  node.setBorder(Yoga.EDGE_TOP, style.borderTopWidth || 0)
  node.setBorder(Yoga.EDGE_BOTTOM, style.borderBottomWidth || 0)
  node.setBorder(Yoga.EDGE_LEFT, style.borderLeftWidth || 0)
  node.setBorder(Yoga.EDGE_RIGHT, style.borderRightWidth || 0)

  node.setPadding(Yoga.EDGE_TOP, style.paddingTop || 0)
  node.setPadding(Yoga.EDGE_BOTTOM, style.paddingBottom || 0)
  node.setPadding(Yoga.EDGE_LEFT, style.paddingLeft || 0)
  node.setPadding(Yoga.EDGE_RIGHT, style.paddingRight || 0)

  node.setBoxSizing(
    v(
      style.boxSizing,
      {
        'border-box': Yoga.BOX_SIZING_BORDER_BOX,
        'content-box': Yoga.BOX_SIZING_CONTENT_BOX,
      },
      Yoga.BOX_SIZING_BORDER_BOX,
      'boxSizing'
    )
  )

  node.setPositionType(
    v(
      normalizePositionValue(style.position),
      {
        absolute: Yoga.POSITION_TYPE_ABSOLUTE,
        relative: Yoga.POSITION_TYPE_RELATIVE,
        static: Yoga.POSITION_TYPE_STATIC,
      },
      Yoga.POSITION_TYPE_RELATIVE,
      'position'
    )
  )

  if (typeof style.top !== 'undefined') {
    node.setPosition(Yoga.EDGE_TOP, asPointPercentageLength(style.top, 'top'))
  }
  if (typeof style.bottom !== 'undefined') {
    node.setPosition(
      Yoga.EDGE_BOTTOM,
      asPointPercentageLength(style.bottom, 'bottom')
    )
  }
  if (typeof style.left !== 'undefined') {
    node.setPosition(
      Yoga.EDGE_LEFT,
      asPointPercentageLength(style.left, 'left')
    )
  }
  if (typeof style.right !== 'undefined') {
    node.setPosition(
      Yoga.EDGE_RIGHT,
      asPointPercentageLength(style.right, 'right')
    )
  }

  if (typeof style.height !== 'undefined') {
    node.setHeight(asPointAutoPercentageLength(style.height, 'height'))
  } else {
    node.setHeightAuto()
  }
  if (typeof style.width !== 'undefined') {
    node.setWidth(asPointAutoPercentageLength(style.width, 'width'))
  } else {
    node.setWidthAuto()
  }

  return [style, inheritable(style)]
}
