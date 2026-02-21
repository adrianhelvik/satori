import { isString, lengthToNumber } from '../utils.js'

export interface TextIndentConfig {
  width: number
  eachLine: boolean
  hanging: boolean
}

const NO_TEXT_INDENT: TextIndentConfig = {
  width: 0,
  eachLine: false,
  hanging: false,
}

export function resolveTextIndentConfig(
  textIndent: unknown,
  containerWidth: number,
  fontSize: number,
  inheritedStyle: Record<string, number | string | object>
): TextIndentConfig {
  if (typeof textIndent === 'number') {
    return {
      width: textIndent,
      eachLine: false,
      hanging: false,
    }
  }

  if (!isString(textIndent)) {
    return NO_TEXT_INDENT
  }

  const tokens = textIndent.trim().split(/\s+/).filter(Boolean)
  let indentToken: string | null = null
  let eachLine = false
  let hanging = false

  for (const token of tokens) {
    const normalizedToken = token.toLowerCase()
    if (normalizedToken === 'each-line') {
      if (eachLine) return NO_TEXT_INDENT
      eachLine = true
      continue
    }
    if (normalizedToken === 'hanging') {
      if (hanging) return NO_TEXT_INDENT
      hanging = true
      continue
    }
    if (indentToken !== null) return NO_TEXT_INDENT
    indentToken = token
  }
  if (!indentToken) return NO_TEXT_INDENT

  const resolved = lengthToNumber(
    indentToken,
    fontSize,
    containerWidth,
    inheritedStyle as Record<string, number | string>,
    true
  )
  if (typeof resolved !== 'number') return NO_TEXT_INDENT

  return {
    width: resolved,
    eachLine,
    hanging,
  }
}

export function getLineIndent(
  lineNumber: number,
  startsAfterForcedBreak: boolean,
  textIndentConfig: TextIndentConfig
): number {
  if (!textIndentConfig.width) return 0

  let shouldIndent = lineNumber === 0
  if (textIndentConfig.eachLine && startsAfterForcedBreak) {
    shouldIndent = true
  }
  if (textIndentConfig.hanging) {
    shouldIndent = !shouldIndent
  }

  return shouldIndent ? textIndentConfig.width : 0
}
