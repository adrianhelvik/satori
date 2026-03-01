import { segment, wordSeparators, buildXMLString } from '../utils.js'
import buildText, { container } from '../builder/text.js'
import { isTransformInput } from '../builder/transform.js'
import { buildDropShadow } from '../builder/shadow.js'
import { buildSvgCssFilter } from '../builder/css-filter.js'
import buildDecoration from '../builder/text-decoration.js'
import type { GlyphBox } from '../font.js'
import { HorizontalEllipsis, Space, Tab } from './characters.js'
import { isFullyTransparent } from './helpers.js'
import type { TextFlowResult } from './types.js'
import type { SerializedStyle } from '../handler/style-types.js'
import type { YogaNode } from '../yoga.js'
import type { BackgroundClipTextPathCollector } from '../render-context.js'

export interface TextRenderConfig {
  // Flow results
  flowResult: TextFlowResult

  // Position
  offset: [number, number]

  // Yoga nodes
  textContainer: YogaNode
  parent: YogaNode
  Yoga: {
    EDGE_LEFT: number
    EDGE_RIGHT: number
  }

  // Context
  id: string
  embedFont: boolean
  debug: boolean
  graphemeImages: Record<string, string> | undefined
  locale: string | undefined
  isInheritingTransform: boolean

  // Render context
  clipPathId: string | undefined
  overflowMaskId: string | undefined
  backgroundClipTextPath?: BackgroundClipTextPathCollector

  // Styles
  parentStyle: SerializedStyle
  inheritedStyle: SerializedStyle
  textStyle: SerializedStyle
  decorationStyle: SerializedStyle

  // Computed values
  resolvedFontSize: number
  fontVariantBaselineShift: number
  kerning: boolean
  letterSpacing: number
  textUnderlineOffsetFromFont?: number
  textDecorationThicknessFromFont?: number

  // Text alignment
  textAlign: string
  textAlignLast: string
  justifyDisabled: boolean

  // Text processing
  lineLimit: number
  blockEllipsis: string
  cssFilter: unknown

  // Measurement
  measureGrapheme: (text: string) => number
  measureGraphemeArray: (texts: string[]) => number

  // Engine
  engine: {
    baseline: (word: string) => number
    height: (word?: string) => number
    getSVG: (
      text: string,
      options: {
        fontSize: number
        left: number
        top: number
        letterSpacing: number
        kerning: boolean
      },
      band?: { underlineY: number; strokeWidth: number }
    ) => { path: string; boxes?: GlyphBox[] }
  }
}

type DecorationLine = {
  left: number
  top: number
  ascender: number
  width: number
}

export function renderTextToSVG(config: TextRenderConfig): string {
  const {
    flowResult,
    offset,
    textContainer,
    parent,
    Yoga,
    id,
    embedFont,
    debug,
    graphemeImages,
    locale,
    isInheritingTransform,
    clipPathId,
    overflowMaskId,
    parentStyle,
    inheritedStyle,
    textStyle,
    decorationStyle,
    resolvedFontSize,
    fontVariantBaselineShift,
    kerning,
    letterSpacing,
    textAlign,
    textAlignLast,
    justifyDisabled,
    lineLimit,
    blockEllipsis,
    cssFilter,
    measureGrapheme,
    measureGraphemeArray,
    engine,
  } = config

  const {
    texts,
    wordPositionInLayout,
    lineWidths,
    baselines,
    lineSegmentNumber,
    measuredTextSize,
  } = flowResult

  const [x, y] = offset
  const backgroundClipCollector = config.backgroundClipTextPath

  let result = ''
  let backgroundClipDef = ''

  const {
    left: containerLeft,
    top: containerTop,
    width: containerWidth,
    height: containerHeight,
  } = textContainer.getComputedLayout()

  const parentContainerInnerWidth =
    parent.getComputedWidth() -
    parent.getComputedPadding(Yoga.EDGE_LEFT) -
    parent.getComputedPadding(Yoga.EDGE_RIGHT) -
    parent.getComputedBorder(Yoga.EDGE_LEFT) -
    parent.getComputedBorder(Yoga.EDGE_RIGHT)

  // Attach offset to the current node.
  const left = x + containerLeft
  const top = y + containerTop

  const { matrix, opacity } = container(
    {
      left: containerLeft,
      top: containerTop,
      width: containerWidth,
      height: containerHeight,
      isInheritingTransform,
      parentTransform: isTransformInput(inheritedStyle.transform)
        ? inheritedStyle.transform
        : undefined,
      parentTransformSize: {
        width: parent.getComputedWidth(),
        height: parent.getComputedHeight(),
      },
    },
    parentStyle
  )

  let textShadowFilter = ''
  if (parentStyle.textShadowOffset) {
    const { textShadowColor, textShadowOffset, textShadowRadius } = parentStyle

    textShadowFilter = buildDropShadow(
      {
        width: measuredTextSize.width,
        height: measuredTextSize.height,
        id,
      },
      {
        shadowColor: textShadowColor,
        shadowOffset: textShadowOffset,
        shadowRadius: textShadowRadius,
      },
      isFullyTransparent(parentStyle.color)
    )

    textShadowFilter = buildXMLString('defs', {}, textShadowFilter)
  }

  const svgCssFilter = buildSvgCssFilter({
    id: `text-${id}`,
    filter: cssFilter,
    style: parentStyle,
    inheritedStyle,
  })

  let decorationShape = ''
  let mergedPath = ''
  let extra = ''
  let skippedLine = -1
  let decorationLines: Record<number, DecorationLine | null> = {}
  let decorationGlyphs: Record<number, GlyphBox[]> = {}
  let wordBuffer: string | null = null
  let bufferedOffset = 0

  for (let i = 0; i < texts.length; i++) {
    // Skip whitespace and empty characters.
    const layout = wordPositionInLayout[i]
    const nextLayout = wordPositionInLayout[i + 1]

    if (!layout) continue

    let text = texts[i]
    let path: string | null = null
    let isLastDisplayedBeforeEllipsis = false

    const image = graphemeImages ? graphemeImages[text] : null

    let topOffset = layout.y
    let leftOffset = layout.x
    const width = layout.width
    const line = layout.line
    const shouldCollectDecorationBoxes =
      parentStyle.textDecorationLine === 'underline' &&
      (parentStyle.textDecorationSkipInk || 'auto') !== 'none'

    if (line === skippedLine) {
      continue
    }

    if (!image && fontVariantBaselineShift !== 0) {
      topOffset += fontVariantBaselineShift
    }

    // When `text-align` is `justify`, the width of the line will be adjusted.
    let extendedWidth = false

    if (lineWidths.length > 1) {
      // Calculate alignment. Note that for Flexbox, there is only text
      // alignment when the container is multi-line.
      const remainingWidth = containerWidth - lineWidths[line]
      const isLastLine = line === lineWidths.length - 1
      const fallbackAlign =
        textAlign === 'justify'
          ? justifyDisabled || isLastLine
            ? 'start'
            : 'justify'
          : textAlign
      const effectiveAlign =
        isLastLine && textAlignLast && textAlignLast !== 'auto'
          ? textAlignLast
          : fallbackAlign

      if (effectiveAlign === 'right' || effectiveAlign === 'end') {
        leftOffset += remainingWidth
      } else if (effectiveAlign === 'center') {
        leftOffset += remainingWidth / 2
      } else if (effectiveAlign === 'justify') {
        const segments = lineSegmentNumber[line] || 1
        const gutter = segments > 1 ? remainingWidth / (segments - 1) : 0
        leftOffset += gutter * layout.lineIndex
        extendedWidth = true
      }

      leftOffset = Math.round(leftOffset)
    }

    const baselineOfLine = baselines[line]
    const baselineOfWord = engine.baseline(text)
    const heightOfWord = engine.height(text)
    const baselineDelta = baselineOfLine - baselineOfWord

    const buildUnderlineBand = (underlineOffset: number) => {
      if (
        !shouldCollectDecorationBoxes ||
        parentStyle.textDecorationLine !== 'underline'
      ) {
        return undefined
      }
      const baseline = top + underlineOffset + baselineDelta + baselineOfWord
      return {
        underlineY: baseline + baselineOfWord * 0.1,
        strokeWidth: Math.max(1, resolvedFontSize * 0.1),
      }
    }

    if (!decorationLines[line]) {
      decorationLines[line] = {
        left: leftOffset,
        top: top + topOffset + baselineDelta,
        ascender: baselineOfWord,
        width: extendedWidth ? containerWidth : lineWidths[line],
      }
    }

    if (lineLimit !== Infinity) {
      let _blockEllipsis = blockEllipsis
      let ellipsisWidth = measureGrapheme(blockEllipsis)
      if (ellipsisWidth > parentContainerInnerWidth) {
        _blockEllipsis = HorizontalEllipsis
        ellipsisWidth = measureGrapheme(_blockEllipsis)
      }
      const spaceWidth = measureGrapheme(Space)
      const isNotLastLine = line < lineWidths.length - 1
      const isLastAllowedLine = line + 1 === lineLimit

      function calcEllipsis(baseWidth: number, _text: string) {
        const chars = segment(_text, 'grapheme', locale)

        let subset = ''
        let resolvedWidth = 0

        for (const char of chars) {
          const w = baseWidth + measureGraphemeArray([subset + char])
          if (
            // Keep at least one character:
            // > The first character or atomic inline-level element on a line
            // must be clipped rather than ellipsed.
            // https://drafts.csswg.org/css-overflow/#text-overflow
            subset &&
            w + ellipsisWidth > parentContainerInnerWidth
          ) {
            break
          }
          subset += char
          resolvedWidth = w
        }

        return {
          subset,
          resolvedWidth,
        }
      }

      if (
        isLastAllowedLine &&
        (isNotLastLine || lineWidths[line] > parentContainerInnerWidth)
      ) {
        if (
          leftOffset + width + ellipsisWidth + spaceWidth >
          parentContainerInnerWidth
        ) {
          const { subset, resolvedWidth } = calcEllipsis(leftOffset, text)

          text = subset + _blockEllipsis
          skippedLine = line
          decorationLines[line]!.width = Math.max(
            0,
            resolvedWidth - decorationLines[line]!.left
          )
          isLastDisplayedBeforeEllipsis = true
        } else if (nextLayout && nextLayout.line !== line) {
          if (textAlign === 'center') {
            const { subset, resolvedWidth } = calcEllipsis(leftOffset, text)

            text = subset + _blockEllipsis
            skippedLine = line
            decorationLines[line]!.width = Math.max(
              0,
              resolvedWidth - decorationLines[line]!.left
            )
            isLastDisplayedBeforeEllipsis = true
          } else {
            const nextLineText = texts[i + 1]

            const { subset, resolvedWidth } = calcEllipsis(
              width + leftOffset,
              nextLineText
            )

            text = text + subset + _blockEllipsis
            skippedLine = line
            decorationLines[line]!.width = Math.max(
              0,
              resolvedWidth - decorationLines[line]!.left
            )
            isLastDisplayedBeforeEllipsis = true
          }
        }
      }
    }

    if (image) {
      // For images, we remove the baseline offset.
      topOffset += 0
    } else if (embedFont) {
      // If the current word and the next word are on the same line, we try to
      // merge them together to better handle the kerning.
      if (
        !text.includes(Tab) &&
        !wordSeparators.includes(text) &&
        texts[i + 1] &&
        nextLayout &&
        !nextLayout.isImage &&
        layout.y === nextLayout.y &&
        !isLastDisplayedBeforeEllipsis
      ) {
        if (wordBuffer === null) {
          bufferedOffset = leftOffset
        }
        wordBuffer = wordBuffer === null ? text : wordBuffer + text
        continue
      }

      const finalizedSegment = wordBuffer === null ? text : wordBuffer + text
      const finalizedLeftOffset =
        wordBuffer === null ? leftOffset : bufferedOffset
      const finalizedWidth = layout.width + leftOffset - finalizedLeftOffset

      const band = buildUnderlineBand(topOffset)

      const svg = engine.getSVG(
        finalizedSegment.replace(/(\t)+/g, ''),
        {
          fontSize: resolvedFontSize,
          left: left + finalizedLeftOffset,
          // Since we need to pass the baseline position, add the ascender to the top.
          top: top + topOffset + baselineOfWord + baselineDelta,
          letterSpacing,
          kerning,
        },
        band
      )

      path = svg.path

      if (shouldCollectDecorationBoxes && svg.boxes && svg.boxes.length) {
        ;(decorationGlyphs[line] || (decorationGlyphs[line] = [])).push(
          ...svg.boxes
        )
      }

      wordBuffer = null

      if (debug) {
        extra +=
          // Glyph
          buildXMLString('rect', {
            x: left + finalizedLeftOffset,
            y: top + topOffset + baselineDelta,
            width: finalizedWidth,
            height: heightOfWord,
            fill: 'transparent',
            stroke: '#575eff',
            'stroke-width': 1,
            transform: matrix ? matrix : undefined,
            'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
          }) +
          // Baseline
          buildXMLString('line', {
            x1: left + leftOffset,
            x2: left + leftOffset + layout.width,
            y1: top + topOffset + baselineDelta + baselineOfWord,
            y2: top + topOffset + baselineDelta + baselineOfWord,
            stroke: '#14c000',
            'stroke-width': 1,
            transform: matrix ? matrix : undefined,
            'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
          })
      }
    } else {
      // We need manually add the font ascender height to ensure it starts
      // at the baseline because <text>'s alignment baseline is set to `hanging`
      // by default and supported to change in SVG 1.1.
      topOffset += baselineOfWord + baselineDelta

      if (shouldCollectDecorationBoxes && !image) {
        const band = buildUnderlineBand(topOffset)

        const svg = engine.getSVG(
          text.replace(/(\t)+/g, ''),
          {
            fontSize: resolvedFontSize,
            left: left + leftOffset,
            top: top + topOffset,
            letterSpacing,
            kerning,
          },
          band
        )

        if (svg.boxes && svg.boxes.length) {
          ;(decorationGlyphs[line] || (decorationGlyphs[line] = [])).push(
            ...svg.boxes
          )
        }
      }
    }

    if (path !== null) {
      mergedPath += path + ' '
    } else {
      const [t, shape] = buildText(
        {
          content: text,
          filter: textShadowFilter,
          id,
          left: left + leftOffset,
          top: top + topOffset,
          width,
          height: heightOfWord,
          matrix,
          opacity,
          image,
          clipPathId,
          debug,
          shape: !!backgroundClipCollector,
        },
        textStyle
      )
      result += t
      backgroundClipDef += shape
    }

    if (isLastDisplayedBeforeEllipsis) {
      break
    }
  }

  if (parentStyle.textDecorationLine) {
    decorationShape = Object.entries(decorationLines)
      .map(([lineIndex, deco]) => {
        if (!deco) return ''
        const glyphBoxes = decorationGlyphs[lineIndex] || []

        return buildDecoration(
          {
            left: left + deco.left,
            top: deco.top,
            width: deco.width,
            ascender: deco.ascender,
            clipPathId,
            matrix,
            glyphBoxes,
            textUnderlineOffsetFromFont: config.textUnderlineOffsetFromFont,
            textDecorationThicknessFromFont:
              config.textDecorationThicknessFromFont,
          },
          decorationStyle
        )
      })
      .join('')
  }

  // Embed the font as path.
  if (mergedPath) {
    const embeddedPathStyle = [
      parentStyle.touchAction ? `touch-action:${parentStyle.touchAction}` : '',
      parentStyle.userSelect ? `user-select:${parentStyle.userSelect}` : '',
    ]
      .filter(Boolean)
      .join(';')

    const p =
      (!isFullyTransparent(parentStyle.color) || textShadowFilter) &&
      opacity !== 0
        ? `<g ${overflowMaskId ? `mask="url(#${overflowMaskId})"` : ''} ${
            clipPathId ? `clip-path="url(#${clipPathId})"` : ''
          }>` +
          buildXMLString('path', {
            fill:
              textShadowFilter && isFullyTransparent(parentStyle.color)
                ? 'black'
                : parentStyle.color,
            d: mergedPath,
            transform: matrix ? matrix : undefined,
            opacity: opacity !== 1 ? opacity : undefined,
            style: embeddedPathStyle || undefined,
            'pointer-events': parentStyle.pointerEvents as string | undefined,
            cursor: parentStyle.cursor as string | undefined,
            'stroke-width': inheritedStyle.WebkitTextStrokeWidth
              ? `${inheritedStyle.WebkitTextStrokeWidth}px`
              : undefined,
            stroke: inheritedStyle.WebkitTextStrokeWidth
              ? inheritedStyle.WebkitTextStrokeColor
              : undefined,
            'stroke-linejoin': inheritedStyle.WebkitTextStrokeWidth
              ? 'round'
              : undefined,
            'paint-order': inheritedStyle.WebkitTextStrokeWidth
              ? 'stroke'
              : undefined,
          }) +
          '</g>'
        : ''

    if (backgroundClipCollector) {
      backgroundClipDef = buildXMLString('path', {
        d: mergedPath,
        transform: matrix ? matrix : undefined,
      })
    }

    result +=
      (textShadowFilter
        ? textShadowFilter +
          buildXMLString(
            'g',
            { filter: `url(#satori_s-${id})` },
            p + decorationShape
          )
        : p + decorationShape) + extra
  } else if (decorationShape) {
    result += textShadowFilter
      ? buildXMLString('g', { filter: `url(#satori_s-${id})` }, decorationShape)
      : decorationShape
  }

  // Attach background-clip text path to the collector.
  if (backgroundClipDef && backgroundClipCollector) {
    backgroundClipCollector.append(backgroundClipDef)
  }

  // visibility: hidden — layout is computed but no visual output is emitted.
  if (parentStyle.visibility === 'hidden') {
    return ''
  }

  if (svgCssFilter) {
    result =
      buildXMLString('defs', {}, svgCssFilter.definition) +
      buildXMLString('g', { filter: `url(#${svgCssFilter.filterId})` }, result)
  }

  return result
}
