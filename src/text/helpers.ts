import { isUndefined, isString } from '../utils.js'
import cssColorParse from 'parse-css-color'
import { Tab } from './characters.js'

const skippedWordWhenFindingMissingFont = new Set([Tab])

export function shouldSkipWhenFindingMissingFont(word: string): boolean {
  return skippedWordWhenFindingMissingFont.has(word)
}

export function isFullyTransparent(color: string): boolean {
  if (color === 'transparent') return true
  const parsed = cssColorParse(color)
  return parsed ? parsed.alpha === 0 : false
}

export function resolveFontSizeAdjustTarget(
  value: number | string | undefined,
  fontAspect: number | undefined
): number | undefined {
  if (typeof value === 'number') {
    return value > 0 ? value : undefined
  }

  if (!isString(value)) return
  const normalized = value.trim().toLowerCase()
  if (!normalized || normalized === 'none') return

  if (normalized === 'from-font') {
    return fontAspect && fontAspect > 0 ? fontAspect : undefined
  }

  const parsed = parseFloat(normalized.split(/\s+/)[0])
  if (isFinite(parsed) && parsed > 0) {
    return parsed
  }
}

export function resolveAdjustedFontSize(
  fontSize: number,
  fontSizeAdjust: number | string | undefined,
  fontAspect: number | undefined
) {
  const targetAspect = resolveFontSizeAdjustTarget(fontSizeAdjust, fontAspect)
  if (
    !targetAspect ||
    !fontAspect ||
    fontAspect <= 0 ||
    !isFinite(targetAspect) ||
    !isFinite(fontAspect)
  ) {
    return fontSize
  }

  return fontSize * (targetAspect / fontAspect)
}

export function hasExplicitWidth(width: unknown): boolean {
  if (isUndefined(width)) return false
  if (isString(width) && width.trim().toLowerCase() === 'auto') return false
  return true
}

export function detectTabs(text: string):
  | {
      index: null
      tabCount: 0
    }
  | {
      index: number
      tabCount: number
    } {
  const result = /(\t)+/.exec(text)
  return result
    ? {
        index: result.index,
        tabCount: result[0].length,
      }
    : {
        index: null,
        tabCount: 0,
      }
}
