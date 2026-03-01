/**
 * This module calculates the layout of a text string. Currently the only
 * supported inline node is text. All other nodes are using block layout.
 */
import type { LayoutContext } from '../layout.js'
import { v, segment, isUndefined, isString, lengthToNumber } from '../utils.js'
import { getYoga, TYoga, YogaNode } from '../yoga.js'
import {
  createMissingFontsPhase,
  READY_FOR_RENDER_PHASE,
  type LayoutPhase,
  type LayoutRenderInput,
} from '../layout-protocol.js'
import { Space } from './characters.js'
import { genMeasurer } from './measurer.js'
import { preprocess } from './processor.js'
import {
  getFontVariantPositionMetrics,
  resolveFontVariantPosition,
} from './font-variant-position.js'
import {
  shouldSkipWhenFindingMissingFont,
  resolveAdjustedFontSize,
  hasExplicitWidth,
} from './helpers.js'
import { computeTextFlowWithTextWrap, type TextFlowConfig } from './flow.js'
import type { TextFlowResult } from './types.js'
import { renderTextToSVG } from './render.js'

export default async function* buildTextNodes(
  content: string,
  context: LayoutContext
): AsyncGenerator<LayoutPhase, string, LayoutRenderInput> {
  const Yoga = await getYoga()

  const {
    parentStyle,
    inheritedStyle,
    parent,
    font,
    id,
    isInheritingTransform,
    debug,
    embedFont,
    graphemeImages,
    locale,
    canLoadAdditionalAssets,
  } = context

  const {
    textAlign,
    textAlignLast,
    textJustify,
    lineHeight,
    textWrap,
    fontSize,
    filter: cssFilter,
    tabSize = 8,
    letterSpacing,
    wordSpacing,
    textIndent,
    hyphenateCharacter,
    fontKerning,
    flexShrink,
  } = parentStyle

  const fontAspect = font.getFontAspect(parentStyle, locale)
  const resolvedFontSizeBase = resolveAdjustedFontSize(
    fontSize,
    parentStyle.fontSizeAdjust as number | string | undefined,
    fontAspect
  )
  const fontVariantPosition = resolveFontVariantPosition(
    parentStyle.fontVariantPosition,
    parentStyle.fontVariant
  )
  const fontVariantPositionMetrics = getFontVariantPositionMetrics(
    fontVariantPosition,
    resolvedFontSizeBase
  )
  const resolvedFontSize =
    resolvedFontSizeBase * fontVariantPositionMetrics.fontSizeScale
  const fontVariantBaselineShift = fontVariantPositionMetrics.baselineShift
  const textStyle =
    resolvedFontSize === fontSize
      ? parentStyle
      : {
          ...parentStyle,
          fontSize: resolvedFontSize,
        }

  const {
    words,
    requiredBreaks,
    softHyphenBreaks,
    allowSoftWrap,
    allowBreakWord,
    processedContent,
    shouldCollapseTabsAndSpaces,
    lineLimit,
    blockEllipsis,
  } = preprocess(content, parentStyle, locale)

  const normalizedTextJustify = String(textJustify || 'auto')
    .trim()
    .toLowerCase()
  const justifyDisabled =
    textAlign === 'justify' && normalizedTextJustify === 'none'
  const justifyByCharacter =
    textAlign === 'justify' && normalizedTextJustify === 'inter-character'
  const allowedToJustify = textAlign === 'justify' && !justifyDisabled

  const textContainer = createTextContainerNode(Yoga, textAlign)
  parent.insertChild(textContainer, parent.getChildCount())

  if (isUndefined(flexShrink) && !hasExplicitWidth(parentStyle.width)) {
    parent.setFlexShrink(1)
  }

  // Get the correct font according to the container style.
  // https://www.w3.org/TR/CSS2/visudet.html
  let engine = font.getEngine(resolvedFontSize, lineHeight, textStyle, locale)

  // Yield segments that are missing a font.
  const wordsMissingFont = canLoadAdditionalAssets
    ? segment(processedContent, 'grapheme', locale).filter(
        (word) => !shouldSkipWhenFindingMissingFont(word) && !engine.has(word)
      )
    : []

  yield createMissingFontsPhase(
    wordsMissingFont.map((word) => {
      return {
        word,
        locale,
      }
    })
  )

  if (wordsMissingFont.length) {
    // Reload the engine with additional fonts.
    engine = font.getEngine(resolvedFontSize, lineHeight, textStyle, locale)
  }

  const normalizedUnderlinePosition = String(
    textStyle.textUnderlinePosition || 'auto'
  ).toLowerCase()
  const prefersFontUnderlinePosition = normalizedUnderlinePosition
    .split(/\s+/)
    .includes('from-font')
  const underlineOffsetFromFont = prefersFontUnderlinePosition
    ? engine.underlineOffset()
    : undefined
  const normalizedDecorationThickness = String(
    textStyle.textDecorationThickness || 'auto'
  ).toLowerCase()
  const prefersFontDecorationThickness = normalizedDecorationThickness
    .split(/\s+/)
    .includes('from-font')
  const underlineThicknessFromFont = prefersFontDecorationThickness
    ? engine.underlineThickness()
    : undefined
  const decorationStyle = textStyle

  function isImage(s: string): boolean {
    return !!(graphemeImages && graphemeImages[s])
  }

  const wordSpacingValue = typeof wordSpacing === 'number' ? wordSpacing : 0

  function resolveHyphenateCharacter(): string {
    if (!isString(hyphenateCharacter)) return '-'

    const raw = hyphenateCharacter.trim()
    if (!raw || raw.toLowerCase() === 'auto') return '-'
    if (
      raw.length >= 2 &&
      ((raw[0] === '"' && raw[raw.length - 1] === '"') ||
        (raw[0] === "'" && raw[raw.length - 1] === "'"))
    ) {
      return raw.slice(1, -1)
    }

    return raw
  }

  const discretionaryHyphenCharacter = resolveHyphenateCharacter()
  const kerning = fontKerning !== 'none'

  const { measureGrapheme, measureGraphemeArray, measureText } = genMeasurer(
    engine,
    isImage,
    {
      fontSize: resolvedFontSize,
      letterSpacing,
      wordSpacing: wordSpacingValue,
      kerning,
      locale,
    }
  )

  const tabWidth = isString(tabSize)
    ? lengthToNumber(tabSize, resolvedFontSize, 1, parentStyle) ?? 0
    : measureGrapheme(Space) * (typeof tabSize === 'number' ? tabSize : 8)

  const flowConfig: TextFlowConfig = {
    words,
    requiredBreaks,
    softHyphenBreaks,
    allowSoftWrap,
    allowBreakWord,
    shouldCollapseTabsAndSpaces,
    lineLimit,
    textIndent,
    resolvedFontSize,
    parentStyle: parentStyle as Record<string, number | string | object>,
    locale,
    allowedToJustify,
    justifyByCharacter,
    discretionaryHyphenCharacter,
    measureText,
    measureGrapheme,
    tabWidth,
    isImage,
    engineHeight: (word?: string) => engine.height(word),
    engineBaseline: (word: string) => engine.baseline(word),
  }

  // It's possible that the text's measured size is different from the container's
  // size, because the container might have a fixed width or height or being
  // expanded by its parent.
  let flowResult: TextFlowResult | null = null

  // CSS min-height: auto — flex items in column layouts can't shrink below
  // their content height. We set minHeight on the parent node during text
  // measurement so Yoga enforces it in the same layout pass.
  // Row layouts don't need this: text wrapping naturally constrains width,
  // and CSS min-width:auto for text equals the longest-word width (complex
  // to compute here; the existing flexShrink=1 + wrapping handles it).
  const hasExplicitMinHeight = !isUndefined(parentStyle.minHeight)
  const applyContentMinSize = (contentHeight: number) => {
    if (hasExplicitMinHeight) return
    const grandparent = parent.getParent()
    const dir = grandparent?.getFlexDirection()
    if (
      dir === Yoga.FLEX_DIRECTION_COLUMN ||
      dir === Yoga.FLEX_DIRECTION_COLUMN_REVERSE
    ) {
      parent.setMinHeight(contentHeight)
    }
  }

  textContainer.setMeasureFunc((containerWidth) => {
    flowResult = computeTextFlowWithTextWrap(
      flowConfig,
      containerWidth,
      textWrap as string | undefined
    )
    const { width, height } = flowResult.measuredTextSize

    applyContentMinSize(height)

    // This may be a temporary fix, I didn't dig deep into yoga.
    // But when the return value of width here doesn't change (assuming the value of width is 216.9),
    // when we later get the width through `parent.getComputedWidth()`, sometimes it returns 216 and sometimes 217.
    // I'm not sure if this is a yoga bug, but it seems related to the entire page width.
    // So I use Math.ceil.
    return { width, height }
  })

  const renderInput = yield READY_FOR_RENDER_PHASE

  // flowResult may be null if the text container was never measured
  // (e.g., display: none on an ancestor). Nothing to render.
  if (!flowResult) {
    return ''
  }

  return renderTextToSVG({
    flowResult,
    offset: renderInput.offset,
    textContainer,
    parent,
    Yoga,
    id,
    embedFont,
    debug,
    graphemeImages,
    locale,
    isInheritingTransform,
    clipPathId: context.renderContext.clipPathId,
    overflowMaskId: context.renderContext.overflowMaskId,
    backgroundClipTextPath: context.renderContext.backgroundClipTextPath,
    parentStyle,
    inheritedStyle,
    textStyle,
    decorationStyle,
    resolvedFontSize,
    fontVariantBaselineShift,
    textUnderlineOffsetFromFont: underlineOffsetFromFont,
    textDecorationThicknessFromFont: underlineThicknessFromFont,
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
  })
}

function createTextContainerNode(Yoga: TYoga, textAlign: string): YogaNode {
  // Create a container node for this text fragment.
  const textContainer = Yoga.Node.create()
  textContainer.setAlignItems(Yoga.ALIGN_BASELINE)
  textContainer.setJustifyContent(
    v(
      textAlign,
      {
        left: Yoga.JUSTIFY_FLEX_START,
        right: Yoga.JUSTIFY_FLEX_END,
        center: Yoga.JUSTIFY_CENTER,
        justify: Yoga.JUSTIFY_SPACE_BETWEEN,
        // We don't have other writing modes yet.
        start: Yoga.JUSTIFY_FLEX_START,
        end: Yoga.JUSTIFY_FLEX_END,
      },
      Yoga.JUSTIFY_FLEX_START,
      'textAlign'
    )
  )

  return textContainer
}
