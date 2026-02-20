import type { ParsedTransformOrigin } from '../transform-origin.js'

import backgroundImage from './background-image.js'
import radius, { getBorderRadiusClipPath } from './border-radius.js'
import { boxShadow } from './shadow.js'
import transform from './transform.js'
import overflow from './overflow.js'
import { buildXMLString } from '../utils.js'
import border, { getBorderClipPath } from './border.js'
import { genClipPath } from './clip-path.js'
import buildMaskImage from './mask-image.js'

export default async function rect(
  {
    id,
    left,
    top,
    width,
    height,
    isInheritingTransform,
    src,
    debug,
  }: {
    id: string
    left: number
    top: number
    width: number
    height: number
    isInheritingTransform: boolean
    src?: string
    debug?: boolean
  },
  style: Record<string, number | string>,
  inheritableStyle: Record<string, number | string>
) {
  if (style.display === 'none') return ''

  const isHidden = style.visibility === 'hidden'
  const isImage = !!src

  let type: 'rect' | 'path' = 'rect'
  let matrix = ''
  let defs = ''
  let fills: string[] = []
  let opacity = 1
  let extra = ''

  if (style.backgroundColor) {
    fills.push(style.backgroundColor as string)
  }

  if (style.opacity !== undefined) {
    opacity = +style.opacity
  }

  if (style.transform) {
    matrix = transform(
      {
        left,
        top,
        width,
        height,
      },
      style.transform as unknown as number[],
      isInheritingTransform,
      style.transformOrigin as ParsedTransformOrigin | undefined
    )
  }

  let backgroundShapes = ''
  if (style.backgroundImage) {
    const backgrounds: string[][] = []

    for (
      let index = 0;
      index < (style.backgroundImage as any).length;
      index++
    ) {
      const background = (style.backgroundImage as any)[index]
      const image = await backgroundImage(
        { id: id + '_' + index, width, height, left, top },
        background,
        inheritableStyle,
        'background',
        style.imageRendering as string | undefined
      )
      if (image) {
        // Background images that come first in the array are rendered last.
        backgrounds.unshift(image)
      }
    }

    for (const background of backgrounds) {
      fills.push(`url(#${background[0]})`)
      defs += background[1]
      if (background[2]) {
        backgroundShapes += background[2]
      }
    }
  }

  const [miId, mi] = await buildMaskImage(
    { id, left, top, width, height },
    style,
    inheritableStyle
  )

  defs += mi
  const maskId = miId
    ? `url(#${miId})`
    : style._inheritedMaskId
    ? `url(#${style._inheritedMaskId})`
    : undefined

  const path = radius(
    { left, top, width, height },
    style as Record<string, number>
  )
  if (path) {
    type = 'path'
  }

  const clipPathId = style._inheritedClipPathId as number | undefined

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

  const {
    backgroundClip,
    filter: cssFilter,
    mixBlendMode,
    imageRendering,
  } = style

  const currentClipPath =
    backgroundClip === 'text'
      ? `url(#satori_bct-${id})`
      : clipPathId
      ? `url(#${clipPathId})`
      : style.clipPath
      ? genClipPath(id)
      : undefined

  const clip = overflow(
    { left, top, width, height, path, id, matrix, currentClipPath, src },
    style as Record<string, number>,
    inheritableStyle
  )

  // Each background generates a new rectangle.
  // @TODO: Not sure if this is the best way to do it, maybe <pattern> with
  // multiple <image>s is better.
  let shape = fills
    .map((fill) =>
      buildXMLString(type, {
        x: left,
        y: top,
        width,
        height,
        fill,
        d: path ? path : undefined,
        transform: matrix ? matrix : undefined,
        'clip-path': style.transform ? undefined : currentClipPath,
        style: cssFilter ? `filter:${cssFilter}` : undefined,
        mask: style.transform ? undefined : maskId,
      })
    )
    .join('')

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
    style
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

    let xAlign = 'Mid'
    let yAlign = 'Mid'
    const position = (style.objectPosition || 'center')
      .toString()
      .trim()
      .toLowerCase()
    const parts = position.split(/\s+/)
    if (parts.length === 1) {
      switch (parts[0]) {
        case 'left':
          xAlign = 'Min'
          yAlign = 'Mid'
          break
        case 'right':
          xAlign = 'Max'
          yAlign = 'Mid'
          break
        case 'top':
          xAlign = 'Mid'
          yAlign = 'Min'
          break
        case 'bottom':
          xAlign = 'Mid'
          yAlign = 'Max'
          break
        case 'center':
          xAlign = 'Mid'
          yAlign = 'Mid'
          break
      }
    } else if (parts.length === 2) {
      for (const part of parts) {
        if (part === 'left') xAlign = 'Min'
        else if (part === 'right') xAlign = 'Max'
        else if (part === 'center') xAlign = 'Mid'
        else if (part === 'top') yAlign = 'Min'
        else if (part === 'bottom') yAlign = 'Max'
      }
    }
    const alignment = `x${xAlign}Y${yAlign}`
    const preserveAspectRatio =
      style.objectFit === 'contain'
        ? alignment
        : style.objectFit === 'cover'
        ? `${alignment} slice`
        : 'none'

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
        style
      )
    }

    const imageStyle = [
      cssFilter ? `filter:${cssFilter}` : '',
      imageRendering ? `image-rendering:${imageRendering}` : '',
    ]
      .filter(Boolean)
      .join(';')

    shape += buildXMLString('image', {
      x: left + offsetLeft,
      y: top + offsetTop,
      width: width - offsetLeft - offsetRight,
      height: height - offsetTop - offsetBottom,
      href: src,
      preserveAspectRatio,
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
      style
    )
  }

  // outline — rendered outside the border, doesn't affect layout.
  let outlineShape = ''
  if (
    !isHidden &&
    style.outlineStyle &&
    style.outlineStyle !== 'none' &&
    style.outlineWidth
  ) {
    const outlineWidth = +(style.outlineWidth || 0)
    const outlineOffset = +(style.outlineOffset || 0)
    const outlineColor = (style.outlineColor ||
      style.color ||
      'black') as string
    const outlineStyle = style.outlineStyle as string

    // Outline is drawn outside the border box, offset by outlineOffset.
    const expand = outlineWidth / 2 + outlineOffset
    const outlinePath = radius(
      {
        left: left - expand,
        top: top - expand,
        width: width + expand * 2,
        height: height + expand * 2,
      },
      style as Record<string, number>
    )

    const outlineStrokeProps: Record<string, string | undefined> = {}
    if (outlineStyle === 'dashed') {
      outlineStrokeProps['stroke-dasharray'] =
        outlineWidth * 2 + ' ' + outlineWidth
    } else if (outlineStyle === 'dotted') {
      outlineStrokeProps['stroke-dasharray'] = '0 ' + outlineWidth * 2
      outlineStrokeProps['stroke-linecap'] = 'round'
    }

    outlineShape = buildXMLString(outlinePath ? 'path' : 'rect', {
      x: outlinePath ? undefined : left - expand,
      y: outlinePath ? undefined : top - expand,
      width: outlinePath ? undefined : width + expand * 2,
      height: outlinePath ? undefined : height + expand * 2,
      d: outlinePath || undefined,
      fill: 'none',
      stroke: outlineColor,
      'stroke-width': outlineWidth,
      ...outlineStrokeProps,
      transform: matrix ? matrix : undefined,
      'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
    })
  }

  // box-shadow.
  const shadow = boxShadow(
    {
      width,
      height,
      id,
      opacity,
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

  return (
    (defs ? buildXMLString('defs', {}, defs) : '') +
    (shadow ? shadow[0] : '') +
    (imageBorderRadius ? imageBorderRadius[0] : '') +
    clip +
    (mixBlendMode && mixBlendMode !== 'normal'
      ? `<g style="mix-blend-mode:${mixBlendMode}">`
      : '') +
    (opacity !== 1 ? `<g opacity="${opacity}">` : '') +
    (style.transform && (currentClipPath || maskId)
      ? `<g${currentClipPath ? ` clip-path="${currentClipPath}"` : ''}${
          maskId ? ` mask="${maskId}"` : ''
        }>`
      : '') +
    (backgroundShapes || shape) +
    (style.transform && (currentClipPath || maskId) ? '</g>' : '') +
    (opacity !== 1 ? `</g>` : '') +
    (mixBlendMode && mixBlendMode !== 'normal' ? '</g>' : '') +
    (shadow ? shadow[1] : '') +
    outlineShape +
    extra
  )
}
