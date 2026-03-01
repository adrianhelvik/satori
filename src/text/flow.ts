import { segment } from '../utils.js'
import { Space } from './characters.js'
import { detectTabs } from './helpers.js'
import { getLineIndent, resolveTextIndentConfig } from './text-indent.js'
import type { WordPosition, TextFlowResult } from './types.js'

export interface TextFlowConfig {
  words: string[]
  requiredBreaks: boolean[]
  softHyphenBreaks: boolean[]
  allowSoftWrap: boolean
  allowBreakWord: boolean
  shouldCollapseTabsAndSpaces: boolean
  lineLimit: number
  textIndent: unknown
  resolvedFontSize: number
  parentStyle: Record<string, number | string | object>
  locale: string | undefined
  allowedToJustify: boolean
  justifyByCharacter: boolean
  discretionaryHyphenCharacter: string

  // Measurement callbacks
  measureText: (text: string) => number
  measureGrapheme: (text: string) => number
  tabWidth: number
  isImage: (s: string) => boolean

  // Engine callbacks
  engineHeight: (word?: string) => number
  engineBaseline: (word: string) => number
}

function calcWordWidth(
  text: string,
  currentWidth: number,
  measureText: (text: string) => number,
  tabWidth: number
): {
  originWidth: number
  endingSpacesWidth: number
  text: string
} {
  if (text.length === 0) {
    return {
      originWidth: 0,
      endingSpacesWidth: 0,
      text,
    }
  }

  const tabResult = detectTabs(text)

  let originWidth = 0

  if (tabResult.tabCount > 0) {
    const textBeforeTab = text.slice(0, tabResult.index)
    const textAfterTab = text.slice(tabResult.index + tabResult.tabCount)
    const textWidthBeforeTab = measureText(textBeforeTab)
    const offsetBeforeTab = textWidthBeforeTab + currentWidth
    const tabMoveDistance =
      tabWidth === 0
        ? textWidthBeforeTab
        : (Math.floor(offsetBeforeTab / tabWidth) + tabResult.tabCount) *
          tabWidth
    originWidth = tabMoveDistance - currentWidth + measureText(textAfterTab)
  } else {
    originWidth = measureText(text)
  }

  const afterTrimEndWidth =
    text.trimEnd() === text ? originWidth : measureText(text.trimEnd())

  return {
    originWidth,
    endingSpacesWidth: originWidth - afterTrimEndWidth,
    text,
  }
}

/**
 * Core text flow algorithm. Computes line-broken text layout for a given width.
 *
 * Note: This function mutates `config.words` (via splice when breaking words).
 */
export function computeTextFlow(
  config: TextFlowConfig,
  width: number
): TextFlowResult {
  const {
    words,
    requiredBreaks,
    softHyphenBreaks,
    allowSoftWrap,
    allowBreakWord,
    shouldCollapseTabsAndSpaces,
    lineLimit,
    textIndent,
    resolvedFontSize,
    parentStyle,
    locale,
    allowedToJustify,
    justifyByCharacter,
    discretionaryHyphenCharacter,
    measureText,
    measureGrapheme,
    tabWidth,
    isImage,
    engineHeight,
    engineBaseline,
  } = config

  const textIndentConfig = resolveTextIndentConfig(
    textIndent,
    width,
    resolvedFontSize,
    parentStyle
  )

  let lines = 0
  let maxWidth = 0
  let lineIndex = -1
  let height = 0
  let currentWidth = 0
  let currentLineHeight = 0
  let currentBaselineOffset = 0

  const lineWidths: number[] = []
  const lineSegmentNumber: number[] = [0]
  const texts: string[] = []
  const wordPositionInLayout: (WordPosition | null)[] = []
  const baselines: number[] = []

  currentWidth = getLineIndent(0, textIndentConfig)
  const emptyLineHeight = Math.round(engineHeight())

  // We naively implement the width calculation without proper kerning.
  // @TODO: Support different writing modes.
  // @TODO: Support RTL languages.
  let i = 0
  let prevLineEndingSpacesWidth = 0
  while (i < words.length && lines < lineLimit) {
    let word = words[i]
    const forceBreak = requiredBreaks[i]

    let w = 0

    const {
      originWidth,
      endingSpacesWidth,
      text: _word,
    } = calcWordWidth(word, currentWidth, measureText, tabWidth)
    word = _word

    w = originWidth
    const lineEndingSpacesWidth = endingSpacesWidth

    // When starting a new line from an empty line, we should push one extra
    // line height.
    if (forceBreak && currentLineHeight === 0) {
      currentLineHeight = engineHeight(word)
    }

    const willWrap =
      i &&
      // When determining whether a line break is necessary, the width of the
      // trailing spaces is not included in the calculation, as the end boundary
      // can be closely adjacent to the last non-space character.
      // e.g.
      // 'aaa bbb ccc'
      // When the break line happens at the end of the `bbb`, what we see looks like this
      // |aaa bbb|
      // |ccc    |
      currentWidth + w > width + lineEndingSpacesWidth &&
      allowSoftWrap

    // Need to break the word if:
    // - we have break-word
    // - the word is wider than the container width
    // - the word will be put at the beginning of the line
    const currentLineIndent = getLineIndent(lines, textIndentConfig)
    const isAtLineStart =
      currentWidth === currentLineIndent || currentWidth === 0

    const needToBreakWord =
      allowBreakWord && w > width && (isAtLineStart || willWrap || forceBreak)

    if (needToBreakWord) {
      // Break the word into multiple segments and continue the loop.
      const chars = segment(word, 'grapheme', locale)
      words.splice(i, 1, ...chars)
      if (currentWidth > 0) {
        // Start a new line, spaces can be ignored.
        lineWidths.push(currentWidth - prevLineEndingSpacesWidth)
        baselines.push(currentBaselineOffset)
        lines++
        height += currentLineHeight
        currentWidth = getLineIndent(lines, textIndentConfig)
        currentLineHeight = 0
        currentBaselineOffset = 0
        lineSegmentNumber.push(justifyByCharacter ? 0 : 1)
        lineIndex = -1
      }
      prevLineEndingSpacesWidth = lineEndingSpacesWidth
      continue
    }
    if (forceBreak || willWrap) {
      // Start a new line, spaces can be ignored.
      if (shouldCollapseTabsAndSpaces && word === Space) {
        w = 0
      }

      if (willWrap && softHyphenBreaks[i]) {
        const hyphenWidth = measureText(discretionaryHyphenCharacter)
        if (hyphenWidth > 0) {
          const hyphenX = currentWidth
          texts.push(discretionaryHyphenCharacter)
          wordPositionInLayout.push({
            y: height,
            x: hyphenX,
            width: hyphenWidth,
            line: lines,
            lineIndex,
            isImage: false,
          })
          currentWidth += hyphenWidth
          maxWidth = Math.max(maxWidth, currentWidth)
        }
      }

      lineWidths.push(currentWidth - prevLineEndingSpacesWidth)
      baselines.push(currentBaselineOffset)
      lines++
      height += currentLineHeight
      const lineIndent = getLineIndent(lines, textIndentConfig)
      currentWidth = lineIndent + w
      currentLineHeight = w ? Math.round(engineHeight(word)) : emptyLineHeight
      currentBaselineOffset = w ? Math.round(engineBaseline(word)) : 0
      lineSegmentNumber.push(justifyByCharacter ? 0 : 1)
      lineIndex = -1

      // If it's naturally broken, we update the max width.
      // Since if there are multiple lines, the width should fit the
      // container.
      if (!forceBreak) {
        maxWidth = Math.max(maxWidth, width)
      }
    } else {
      // It fits into the current line.
      currentWidth += w
      const glyphHeight = Math.round(engineHeight(word))
      if (glyphHeight > currentLineHeight) {
        // Use the baseline of the highest segment as the baseline of the line.
        currentLineHeight = glyphHeight
        currentBaselineOffset = Math.round(engineBaseline(word))
      }
    }

    maxWidth = Math.max(maxWidth, currentWidth)

    let x = currentWidth - w

    const graphemes = w === 0 ? [] : segment(word, 'grapheme', locale)
    if (allowedToJustify && !justifyByCharacter) {
      lineIndex++
    }

    if (w === 0) {
      wordPositionInLayout.push({
        y: height,
        x,
        width: 0,
        line: lines,
        lineIndex,
        isImage: false,
      })
    } else {
      const _texts = justifyByCharacter
        ? graphemes
        : segment(word, 'word', locale)

      for (let j = 0; j < _texts.length; j++) {
        const _text = _texts[j]
        let _width = 0
        let _isImage = false

        if (_text === '\t') {
          // Advance to the next tab stop from the current line position.
          if (tabWidth > 0) {
            const nextStop = (Math.floor(x / tabWidth) + 1) * tabWidth
            _width = nextStop - x
          }
        } else if (isImage(_text)) {
          _width = resolvedFontSize
          _isImage = true
        } else {
          _width = measureGrapheme(_text)
        }

        const graphemeLineIndex =
          allowedToJustify && justifyByCharacter ? ++lineIndex : lineIndex

        texts.push(_text)
        wordPositionInLayout.push({
          y: height,
          x,
          width: _width,
          line: lines,
          lineIndex: graphemeLineIndex,
          isImage: _isImage,
        })

        x += _width
      }
    }

    if (allowedToJustify) {
      if (justifyByCharacter) {
        lineSegmentNumber[lineSegmentNumber.length - 1] += graphemes.length
      } else {
        lineSegmentNumber[lineSegmentNumber.length - 1]++
      }
    }

    i++
    prevLineEndingSpacesWidth = lineEndingSpacesWidth
  }

  if (currentWidth) {
    if (lines < lineLimit) {
      height += currentLineHeight
    }
    lines++
    lineWidths.push(currentWidth)
    baselines.push(currentBaselineOffset)
  }

  // @TODO: Support `line-height`.
  return {
    texts,
    wordPositionInLayout,
    lineWidths,
    baselines,
    lineSegmentNumber,
    measuredTextSize: { width: maxWidth, height },
  }
}

/**
 * Applies text-wrap strategy (balance, pretty) on top of the core flow.
 * Returns the final TextFlowResult to use.
 */
export function computeTextFlowWithTextWrap(
  config: TextFlowConfig,
  containerWidth: number,
  textWrap: string | undefined
): TextFlowResult {
  const result = computeTextFlow(config, containerWidth)
  const { width, height } = result.measuredTextSize

  if (textWrap === 'balance') {
    let l = width / 2
    let r = width
    let m: number = width
    while (l + 1 < r) {
      m = (l + r) / 2
      const mResult = computeTextFlow(config, m)
      if (mResult.measuredTextSize.height > height) {
        l = m
      } else {
        r = m
      }
    }
    const finalResult = computeTextFlow(config, r)
    const _width = Math.ceil(r)
    finalResult.measuredTextSize = { width: _width, height }
    return finalResult
  }

  if (textWrap === 'pretty') {
    const lastLineWidth = result.lineWidths[result.lineWidths.length - 1]
    const isLastLineShort = lastLineWidth < width / 3

    if (isLastLineShort) {
      const adjustedWidth = width * 0.9
      const prettyResult = computeTextFlow(config, adjustedWidth)

      if (prettyResult.measuredTextSize.height <= height * 1.3) {
        prettyResult.measuredTextSize = {
          width,
          height: prettyResult.measuredTextSize.height,
        }
        return prettyResult
      }
    }
  }

  const _width = Math.ceil(width)
  result.measuredTextSize = { width: _width, height }
  return result
}
