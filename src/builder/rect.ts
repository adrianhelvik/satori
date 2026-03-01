import type { ParsedTransformOrigin } from '../transform-origin.js'
import type { SerializedStyle } from '../handler/style-types.js'

import backgroundImage from './background-image.js'
import radius, { getBorderRadiusClipPath } from './border-radius.js'
import { boxShadow } from './shadow.js'
import transform, {
  isTransformInput,
  type TransformInput,
} from './transform.js'
import overflow from './overflow.js'
import { buildXMLString } from '../utils.js'
import border, { getBorderClipPath } from './border.js'
import { genClipPath } from './clip-path.js'
import buildMaskImage from './mask-image.js'
import { resolveSvgImageRendering } from './image-rendering.js'
import {
  parseObjectPosition,
  resolveObjectFitImageSize,
  resolveObjectPositionOffset,
} from './object-fit-position.js'
import { buildSvgCssFilter } from './css-filter.js'
import {
  resolveSolidBackgroundBlend,
  resolveRectBlendFallbackOverlays,
  supportedMixBlendFallbackModes,
} from './color-blend.js'
import { buildOutline } from './outline.js'
import {
  type BackgroundBoxRect,
  parseBackgroundBlendModes,
  resolveBackgroundBlendMode,
  normalizeBackgroundBoxValue,
  resolveBackgroundBoxRect,
  isSameBackgroundBoxRect,
  isSolidBlendEligibleBackgroundLayer,
} from './background-box.js'

export interface BlendPrimitive {
  left: number
  top: number
  width: number
  height: number
  color: string
}

export default async function rect(
  {
    id,
    left,
    top,
    width,
    height,
    isInheritingTransform,
    parentTransform,
    parentTransformSize,
    src,
    srcWidth,
    srcHeight,
    viewportWidth,
    viewportHeight,
    debug,
  }: {
    id: string
    left: number
    top: number
    width: number
    height: number
    isInheritingTransform: boolean
    parentTransform?: TransformInput
    parentTransformSize?: { width: number; height: number }
    src?: string
    srcWidth?: number
    srcHeight?: number
    viewportWidth?: number
    viewportHeight?: number
    debug?: boolean
  },
  style: SerializedStyle,
  inheritableStyle: SerializedStyle,
  siblingBlendBackdrops: BlendPrimitive[] = [],
  parentBackgroundColor?: string,
  inheritedClipPathId?: string,
  inheritedOverflowMaskId?: string
) {
  if (style.display === 'none') return ''
  const primitiveStyle = style as Record<string, string | number>
  const primitiveInheritedStyle = inheritableStyle as Record<
    string,
    string | number
  >

  const isHidden = style.visibility === 'hidden'
  const isImage = !!src

  let type: 'rect' | 'path' = 'rect'
  let matrix = ''
  let defs = ''
  const fillLayers: {
    fill: string
    blendMode?: string
    solidColor?: string
    clipBox: BackgroundBoxRect
  }[] = []
  let opacity = 1
  let extra = ''

  const borderBox: BackgroundBoxRect = { left, top, width, height }
  const {
    backgroundClip,
    filter: cssFilter,
    mixBlendMode,
    isolation,
    imageRendering,
    imageOrientation,
  } = style

  const colorClipBox = resolveBackgroundBoxRect(
    borderBox,
    style,
    normalizeBackgroundBoxValue(
      backgroundClip === 'text' ? undefined : backgroundClip,
      'border-box',
      true
    )
  )

  if (style.backgroundColor) {
    fillLayers.push({
      fill: style.backgroundColor as string,
      solidColor: style.backgroundColor as string,
      clipBox: colorClipBox,
    })
  }

  if (style.opacity !== undefined) {
    opacity = +style.opacity
  }

  const svgCssFilter = buildSvgCssFilter({
    id,
    filter: cssFilter,
    style,
    inheritedStyle: inheritableStyle,
  })
  if (svgCssFilter) {
    defs += svgCssFilter.definition
  }

  if (isTransformInput(style.transform)) {
    matrix = transform(
      {
        left,
        top,
        width,
        height,
      },
      style.transform,
      isInheritingTransform,
      style.transformOrigin as ParsedTransformOrigin | undefined,
      parentTransform,
      parentTransformSize
    )
  }

  let backgroundShapes = ''
  const backgroundBlendModes = parseBackgroundBlendModes(
    style.backgroundBlendMode
  )
  const hasRequestedBackgroundBlendMode = backgroundBlendModes.some(
    (mode) => mode !== 'normal'
  )

  if (style.backgroundImage) {
    const backgrounds: {
      patternId: string
      defs: string
      shape?: string
      solidColor?: string
      sourceIndex: number
      repeat?: string
      size?: string
      position?: string
      clipBox: BackgroundBoxRect
    }[] = []

    for (
      let index = 0;
      index < (style.backgroundImage as any).length;
      index++
    ) {
      const background = (style.backgroundImage as any)[index]
      const layerClipBox = resolveBackgroundBoxRect(
        borderBox,
        style,
        normalizeBackgroundBoxValue(
          background.clip || backgroundClip,
          'border-box'
        )
      )
      const layerOriginBox = resolveBackgroundBoxRect(
        borderBox,
        style,
        normalizeBackgroundBoxValue(background.origin, 'border-box')
      )
      const image = await backgroundImage(
        {
          id: id + '_' + index,
          width: layerOriginBox.width,
          height: layerOriginBox.height,
          left: layerOriginBox.left,
          top: layerOriginBox.top,
        },
        background,
        primitiveInheritedStyle,
        'background',
        style.imageRendering as string | undefined,
        style.imageOrientation as string | undefined,
        undefined,
        false,
        viewportWidth != null && viewportHeight != null
          ? { width: viewportWidth, height: viewportHeight }
          : undefined
      )
      if (image) {
        // Background images that come first in the array are rendered last.
        backgrounds.unshift({
          patternId: image[0],
          defs: image[1],
          shape: image[2],
          solidColor: image[3],
          sourceIndex: index,
          repeat: background.repeat,
          size: background.size,
          position: background.position,
          clipBox: layerClipBox,
        })
      }
    }

    for (const background of backgrounds) {
      const blendMode = resolveBackgroundBlendMode(
        backgroundBlendModes,
        background.sourceIndex
      )
      const canUseSolidLayerForBlend =
        hasRequestedBackgroundBlendMode &&
        !!background.solidColor &&
        isSolidBlendEligibleBackgroundLayer(background)

      fillLayers.push({
        fill: canUseSolidLayerForBlend
          ? (background.solidColor as string)
          : `url(#${background.patternId})`,
        blendMode,
        solidColor: canUseSolidLayerForBlend
          ? background.solidColor
          : undefined,
        clipBox: background.clipBox,
      })
      if (!canUseSolidLayerForBlend) {
        defs += background.defs
      }
      if (background.shape) {
        backgroundShapes += background.shape
      }
    }
  }

  const [miId, mi] = await buildMaskImage(
    { id, left, top, width, height },
    primitiveStyle,
    primitiveInheritedStyle
  )

  defs += mi
  const maskId = miId
    ? `url(#${miId})`
    : inheritedOverflowMaskId
    ? `url(#${inheritedOverflowMaskId})`
    : undefined

  const path = radius(
    { left, top, width, height },
    style as Record<string, number>
  )
  if (path) {
    type = 'path'
  }

  const clipPathId = inheritedClipPathId

  if (debug) {
    extra = buildXMLString('rect', {
      x: left,
      y: top,
      width,
      height,
      fill: 'transparent',
      stroke: '#ff5757',
      'stroke-width': 1,
      transform: matrix || undefined,
      'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
    })
  }

  const currentClipPath =
    backgroundClip === 'text'
      ? `url(#satori_bct-${id})`
      : clipPathId
      ? `url(#${clipPathId})`
      : style.clipPath
      ? genClipPath(id)
      : undefined

  const clip = overflow(
    {
      left,
      top,
      width,
      height,
      path,
      id,
      matrix,
      currentClipPath,
      src,
      parentOverflowMaskId: inheritedOverflowMaskId,
    },
    primitiveStyle,
    primitiveInheritedStyle
  )

  // Each background generates a new rectangle.
  // @TODO: Not sure if this is the best way to do it, maybe <pattern> with
  // multiple <image>s is better.
  const hasBackgroundBlendMode = fillLayers.some(
    ({ blendMode }) => blendMode && blendMode !== 'normal'
  )
  if (hasBackgroundBlendMode) {
    const blendedSolidFill = resolveSolidBackgroundBlend(fillLayers)
    if (blendedSolidFill) {
      fillLayers.splice(0, fillLayers.length, {
        fill: blendedSolidFill,
        solidColor: blendedSolidFill,
        clipBox: borderBox,
      })
    }
  }
  const backgroundLayerShape = fillLayers
    .map(({ fill, blendMode, clipBox }) => {
      const useBorderShape = isSameBackgroundBoxRect(clipBox, borderBox)
      const layerType = useBorderShape ? type : 'rect'
      const layerShape = buildXMLString(layerType, {
        x: clipBox.left,
        y: clipBox.top,
        width: clipBox.width,
        height: clipBox.height,
        fill,
        d: useBorderShape && path ? path : undefined,
        transform: matrix ? matrix : undefined,
        'clip-path': style.transform ? undefined : currentClipPath,
        mask: style.transform ? undefined : maskId,
      })

      if (!blendMode || blendMode === 'normal') {
        return layerShape
      }

      return `<g style="mix-blend-mode:${blendMode}">${layerShape}</g>`
    })
    .join('')
  let shape =
    hasBackgroundBlendMode && backgroundLayerShape
      ? `<g style="isolation:isolate">${backgroundLayerShape}</g>`
      : backgroundLayerShape

  const borderClip = getBorderClipPath(
    {
      id,
      left,
      top,
      width,
      height,
      currentClipPathId: clipPathId,
      borderPath: path,
      borderType: type,
    },
    primitiveStyle
  )

  // border radius for images with transform property
  let imageBorderRadius = undefined

  // If it's an image (<img>) tag, we add an extra layer of the image itself.
  if (isImage) {
    // We need to subtract the border and padding sizes from the image size.
    const offsetLeft =
      ((style.borderLeftWidth as number) || 0) +
      ((style.paddingLeft as number) || 0)
    const offsetTop =
      ((style.borderTopWidth as number) || 0) +
      ((style.paddingTop as number) || 0)
    const offsetRight =
      ((style.borderRightWidth as number) || 0) +
      ((style.paddingRight as number) || 0)
    const offsetBottom =
      ((style.borderBottomWidth as number) || 0) +
      ((style.paddingBottom as number) || 0)

    const contentX = left + offsetLeft
    const contentY = top + offsetTop
    const contentWidth = Math.max(0, width - offsetLeft - offsetRight)
    const contentHeight = Math.max(0, height - offsetTop - offsetBottom)
    const intrinsicWidth =
      typeof srcWidth === 'number' && srcWidth > 0
        ? srcWidth
        : contentWidth || 1
    const intrinsicHeight =
      typeof srcHeight === 'number' && srcHeight > 0
        ? srcHeight
        : contentHeight || 1

    const normalizedObjectFit = String(style.objectFit || 'fill')
      .trim()
      .toLowerCase()
    const objectPosition = parseObjectPosition(
      style.objectPosition || '50% 50%',
      typeof style.fontSize === 'number'
        ? (style.fontSize as number)
        : typeof inheritableStyle.fontSize === 'number'
        ? (inheritableStyle.fontSize as number)
        : 16,
      inheritableStyle
    )

    const imageSize = resolveObjectFitImageSize(
      normalizedObjectFit,
      contentWidth,
      contentHeight,
      intrinsicWidth,
      intrinsicHeight
    )
    const imageX =
      contentX +
      resolveObjectPositionOffset(
        objectPosition.x,
        contentWidth,
        imageSize.width
      )
    const imageY =
      contentY +
      resolveObjectPositionOffset(
        objectPosition.y,
        contentHeight,
        imageSize.height
      )

    if (style.transform) {
      imageBorderRadius = getBorderRadiusClipPath(
        {
          id,
          borderRadiusPath: path,
          borderType: type,
          left,
          top,
          width,
          height,
        },
        primitiveStyle
      )
    }

    const svgImageRendering = resolveSvgImageRendering(
      typeof imageRendering === 'string' ? imageRendering : undefined
    )
    const imageStyle = [
      svgImageRendering ? `image-rendering:${svgImageRendering}` : '',
      imageOrientation ? `image-orientation:${imageOrientation}` : '',
    ]
      .filter(Boolean)
      .join(';')

    shape += buildXMLString('image', {
      x: imageX,
      y: imageY,
      width: imageSize.width,
      height: imageSize.height,
      href: src,
      preserveAspectRatio: 'none',
      transform: matrix ? matrix : undefined,
      style: imageStyle || undefined,
      'clip-path': style.transform
        ? imageBorderRadius
          ? `url(#${imageBorderRadius[1]})`
          : undefined
        : `url(#satori_cp-${id})`,
      mask: style.transform
        ? undefined
        : miId
        ? `url(#${miId})`
        : `url(#satori_om-${id})`,
    })
  }

  if (borderClip) {
    defs += borderClip[0]
    const rectClipId = borderClip[1]

    shape += border(
      {
        left,
        top,
        width,
        height,
        props: {
          transform: matrix ? matrix : undefined,
          // When using `background-clip: text`, we need to draw the extra border because
          // it shouldn't be clipped by the clip path, so we are not using currentClipPath here.
          'clip-path': `url(#${rectClipId})`,
        },
      },
      primitiveStyle
    )
  }

  // outline — rendered outside the border, doesn't affect layout.
  const outlineShape =
    !isHidden &&
    style.outlineStyle &&
    style.outlineStyle !== 'none' &&
    style.outlineWidth
      ? buildOutline({ left, top, width, height, style, matrix, clipPathId })
      : ''

  // box-shadow.
  const shadow = boxShadow(
    {
      width,
      height,
      id,
      opacity,
      viewportWidth,
      viewportHeight,
      shape: buildXMLString(type, {
        x: left,
        y: top,
        width,
        height,
        fill: '#fff',
        stroke: '#fff',
        'stroke-width': 0,
        d: path ? path : undefined,
        transform: matrix ? matrix : undefined,
        'clip-path': currentClipPath,
        mask: maskId,
      }),
    },
    style
  )

  // visibility: hidden skips visual output but keeps structural elements (defs, clips)
  // so that children (which may have visibility: visible) still render correctly.
  if (isHidden) {
    return (defs ? buildXMLString('defs', {}, defs) : '') + clip
  }

  const normalizedMixBlendMode =
    typeof mixBlendMode === 'string' ? mixBlendMode.trim().toLowerCase() : ''
  const hasSimpleSolidRect =
    !isImage &&
    type === 'rect' &&
    !path &&
    !matrix &&
    !svgCssFilter &&
    !style.transform &&
    !backgroundShapes &&
    !currentClipPath &&
    !maskId &&
    fillLayers.length === 1 &&
    isSameBackgroundBoxRect(fillLayers[0].clipBox, borderBox) &&
    !!fillLayers[0].solidColor &&
    !style.backgroundImage &&
    !style.borderLeftWidth &&
    !style.borderTopWidth &&
    !style.borderRightWidth &&
    !style.borderBottomWidth

  const blendFallbackOverlays =
    hasSimpleSolidRect &&
    supportedMixBlendFallbackModes.has(normalizedMixBlendMode)
      ? resolveRectBlendFallbackOverlays(
          normalizedMixBlendMode,
          fillLayers[0].solidColor,
          fillLayers[0].clipBox,
          siblingBlendBackdrops,
          parentBackgroundColor
        )
      : ''

  const shouldApplyNativeMixBlend =
    mixBlendMode &&
    mixBlendMode !== 'normal' &&
    blendFallbackOverlays.length === 0

  const compositingStyles = [
    shouldApplyNativeMixBlend ? `mix-blend-mode:${mixBlendMode}` : '',
    isolation && isolation !== 'auto' ? `isolation:${isolation}` : '',
    style.pointerEvents ? `pointer-events:${style.pointerEvents}` : '',
    style.cursor ? `cursor:${style.cursor}` : '',
    style.touchAction ? `touch-action:${style.touchAction}` : '',
    style.userSelect ? `user-select:${style.userSelect}` : '',
  ]
    .filter(Boolean)
    .join(';')

  const paintedShape =
    (compositingStyles ? `<g style="${compositingStyles}">` : '') +
    (opacity !== 1 ? `<g opacity="${opacity}">` : '') +
    (style.transform && (currentClipPath || maskId)
      ? `<g${currentClipPath ? ` clip-path="${currentClipPath}"` : ''}${
          maskId ? ` mask="${maskId}"` : ''
        }>`
      : '') +
    (backgroundShapes || shape) +
    blendFallbackOverlays +
    (style.transform && (currentClipPath || maskId) ? '</g>' : '') +
    (opacity !== 1 ? `</g>` : '') +
    (compositingStyles ? '</g>' : '')

  const filteredPaintedShape = svgCssFilter
    ? buildXMLString(
        'g',
        {
          filter: `url(#${svgCssFilter.filterId})`,
        },
        paintedShape
      )
    : paintedShape

  return (
    (defs ? buildXMLString('defs', {}, defs) : '') +
    (shadow ? shadow[0] : '') +
    (imageBorderRadius ? imageBorderRadius[0] : '') +
    clip +
    filteredPaintedShape +
    (shadow ? shadow[1] : '') +
    outlineShape +
    extra
  )
}
