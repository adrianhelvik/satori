import type { SerializedStyle } from '../handler/style-types.js'

import radius from './border-radius.js'
import { buildXMLString } from '../utils.js'
import { shadeColorForTone, blendColors } from './color-blend.js'

export function buildOutline(config: {
  left: number
  top: number
  width: number
  height: number
  style: SerializedStyle
  matrix: string
  clipPathId: string | undefined
}): string {
  const { left, top, width, height, style, matrix, clipPathId } = config

  const outlineWidth = +(style.outlineWidth || 0)
  const outlineOffset = +(style.outlineOffset || 0)
  const outlineColor = (style.outlineColor || style.color || 'black') as string
  const outlineStyle = style.outlineStyle as string

  const resolveOutlinePath = (expand: number) =>
    radius(
      {
        left: left - expand,
        top: top - expand,
        width: width + expand * 2,
        height: height + expand * 2,
      },
      style as Record<string, number>
    )

  const makeOutlineLine = (
    expand: number,
    strokeWidth: number,
    strokeColor = outlineColor,
    strokeProps: Record<string, string | undefined> = {}
  ) => {
    const outlinePath = resolveOutlinePath(expand)

    return buildXMLString(outlinePath ? 'path' : 'rect', {
      x: outlinePath ? undefined : left - expand,
      y: outlinePath ? undefined : top - expand,
      width: outlinePath ? undefined : width + expand * 2,
      height: outlinePath ? undefined : height + expand * 2,
      d: outlinePath || undefined,
      fill: 'none',
      stroke: strokeColor,
      'stroke-width': strokeWidth,
      ...strokeProps,
      transform: matrix ? matrix : undefined,
      'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
    })
  }

  const makeBeveledOutline = (
    expand: number,
    strokeWidth: number,
    topLeftColor: string,
    bottomRightColor: string,
    cornerBlendColor?: string
  ) => {
    if (resolveOutlinePath(expand)) {
      // Rounded outlines fallback to a single-stroke approximation.
      return makeOutlineLine(expand, strokeWidth)
    }

    const x0 = left - expand
    const y0 = top - expand
    const x1 = left + width + expand
    const y1 = top + height + expand
    const commonProps = {
      'stroke-width': strokeWidth,
      'stroke-linecap': 'square',
      transform: matrix ? matrix : undefined,
      'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
    }

    const lines =
      buildXMLString('line', {
        x1: x0,
        y1: y0,
        x2: x1,
        y2: y0,
        stroke: topLeftColor,
        ...commonProps,
      }) +
      buildXMLString('line', {
        x1: x0,
        y1: y0,
        x2: x0,
        y2: y1,
        stroke: topLeftColor,
        ...commonProps,
      }) +
      buildXMLString('line', {
        x1: x1,
        y1: y0,
        x2: x1,
        y2: y1,
        stroke: bottomRightColor,
        ...commonProps,
      }) +
      buildXMLString('line', {
        x1: x0,
        y1: y1,
        x2: x1,
        y2: y1,
        stroke: bottomRightColor,
        ...commonProps,
      })

    if (!cornerBlendColor) return lines

    const cornerSize = Math.max(1, strokeWidth)
    const cornerHalf = cornerSize / 2
    const cornerProps = {
      fill: cornerBlendColor,
      transform: matrix ? matrix : undefined,
      'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
    }

    return (
      lines +
      buildXMLString('rect', {
        x: x1 - cornerHalf,
        y: y0 - cornerHalf,
        width: cornerSize,
        height: cornerSize,
        ...cornerProps,
      }) +
      buildXMLString('rect', {
        x: x0 - cornerHalf,
        y: y1 - cornerHalf,
        width: cornerSize,
        height: cornerSize,
        ...cornerProps,
      })
    )
  }

  if (outlineStyle === 'double' && outlineWidth >= 3) {
    const lineWidth = Math.max(1, Math.round(outlineWidth / 3))
    const gap = Math.max(1, outlineWidth - lineWidth * 2)
    const nearExpand = outlineOffset + lineWidth / 2
    const farExpand = outlineOffset + lineWidth + gap + lineWidth / 2

    return (
      makeOutlineLine(nearExpand, lineWidth) +
      makeOutlineLine(farExpand, lineWidth)
    )
  }

  // Outline is drawn outside the border box, offset by outlineOffset.
  const expand = outlineWidth / 2 + outlineOffset
  if (outlineStyle === 'groove' || outlineStyle === 'ridge') {
    const darkRatio = 1 / 3
    const outerWidth = Math.max(1, Math.ceil(outlineWidth / 2))
    const innerWidth = Math.max(1, outlineWidth - outerWidth)
    const outerExpand = outlineOffset + innerWidth + outerWidth / 2
    const innerExpand = outlineOffset + innerWidth / 2

    const outerBevelStyle = outlineStyle === 'groove' ? 'inset' : 'outset'
    const innerBevelStyle = outerBevelStyle === 'inset' ? 'outset' : 'inset'

    const outerTopLeftColor = shadeColorForTone(
      outlineColor,
      outerBevelStyle === 'inset' ? 'dark' : 'light',
      outerBevelStyle === 'inset' ? darkRatio : undefined
    )
    const outerBottomRightColor = shadeColorForTone(
      outlineColor,
      outerBevelStyle === 'inset' ? 'light' : 'dark',
      outerBevelStyle === 'inset' ? undefined : darkRatio
    )
    const innerTopLeftColor = shadeColorForTone(
      outlineColor,
      innerBevelStyle === 'inset' ? 'dark' : 'light',
      innerBevelStyle === 'inset' ? darkRatio : undefined
    )
    const innerBottomRightColor = shadeColorForTone(
      outlineColor,
      innerBevelStyle === 'inset' ? 'light' : 'dark',
      innerBevelStyle === 'inset' ? undefined : darkRatio
    )

    return (
      makeBeveledOutline(
        outerExpand,
        outerWidth,
        outerTopLeftColor,
        outerBottomRightColor,
        blendColors(outerTopLeftColor, outerBottomRightColor, 0.5)
      ) +
      makeBeveledOutline(
        innerExpand,
        innerWidth,
        innerTopLeftColor,
        innerBottomRightColor,
        blendColors(innerTopLeftColor, innerBottomRightColor, 0.5)
      )
    )
  }

  if (outlineStyle === 'inset' || outlineStyle === 'outset') {
    const topLeftColor = shadeColorForTone(
      outlineColor,
      outlineStyle === 'inset' ? 'dark' : 'light'
    )
    const bottomRightColor = shadeColorForTone(
      outlineColor,
      outlineStyle === 'inset' ? 'light' : 'dark'
    )
    return makeBeveledOutline(
      expand,
      outlineWidth,
      topLeftColor,
      bottomRightColor
    )
  }

  const outlineStrokeProps: Record<string, string | undefined> = {}
  if (outlineStyle === 'dashed') {
    outlineStrokeProps['stroke-dasharray'] =
      outlineWidth * 2 + ' ' + outlineWidth
  } else if (outlineStyle === 'dotted') {
    outlineStrokeProps['stroke-dasharray'] = '0 ' + outlineWidth * 2
    outlineStrokeProps['stroke-linecap'] = 'round'
  }

  return makeOutlineLine(expand, outlineWidth, outlineColor, outlineStrokeProps)
}
