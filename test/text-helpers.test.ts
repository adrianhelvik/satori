import { describe, expect, it } from 'vitest'

import {
  isFullyTransparent,
  hasExplicitWidth,
  resolveFontSizeAdjustTarget,
  resolveAdjustedFontSize,
  detectTabs,
  shouldSkipWhenFindingMissingFont,
} from '../src/text/helpers.js'

describe('isFullyTransparent', () => {
  it('should return true for "transparent"', () => {
    expect(isFullyTransparent('transparent')).toBe(true)
  })

  it('should return true for rgba with zero alpha', () => {
    expect(isFullyTransparent('rgba(0,0,0,0)')).toBe(true)
    expect(isFullyTransparent('rgba(255, 128, 0, 0)')).toBe(true)
  })

  it('should return false for opaque colors', () => {
    expect(isFullyTransparent('red')).toBe(false)
    expect(isFullyTransparent('rgba(0,0,0,1)')).toBe(false)
    expect(isFullyTransparent('#ff0000')).toBe(false)
  })

  it('should return false for invalid color strings', () => {
    expect(isFullyTransparent('notacolor')).toBe(false)
    expect(isFullyTransparent('')).toBe(false)
  })
})

describe('hasExplicitWidth', () => {
  it('should return false for undefined', () => {
    expect(hasExplicitWidth(undefined)).toBe(false)
  })

  it('should return false for "auto"', () => {
    expect(hasExplicitWidth('auto')).toBe(false)
    expect(hasExplicitWidth('  AUTO  ')).toBe(false)
  })

  it('should return true for numeric values', () => {
    expect(hasExplicitWidth(100)).toBe(true)
    expect(hasExplicitWidth(0)).toBe(true)
  })

  it('should return true for percentage strings', () => {
    expect(hasExplicitWidth('50%')).toBe(true)
  })
})

describe('resolveFontSizeAdjustTarget', () => {
  it('should return the number when positive', () => {
    expect(resolveFontSizeAdjustTarget(0.5, undefined)).toBe(0.5)
    expect(resolveFontSizeAdjustTarget(1, undefined)).toBe(1)
  })

  it('should return undefined for zero or negative numbers', () => {
    expect(resolveFontSizeAdjustTarget(0, undefined)).toBeUndefined()
    expect(resolveFontSizeAdjustTarget(-1, undefined)).toBeUndefined()
  })

  it('should return fontAspect for "from-font"', () => {
    expect(resolveFontSizeAdjustTarget('from-font', 0.5)).toBe(0.5)
  })

  it('should return undefined for "from-font" without valid fontAspect', () => {
    expect(resolveFontSizeAdjustTarget('from-font', undefined)).toBeUndefined()
    expect(resolveFontSizeAdjustTarget('from-font', 0)).toBeUndefined()
  })

  it('should return undefined for "none"', () => {
    expect(resolveFontSizeAdjustTarget('none', undefined)).toBeUndefined()
  })

  it('should return undefined for undefined', () => {
    expect(resolveFontSizeAdjustTarget(undefined, undefined)).toBeUndefined()
  })

  it('should parse numeric strings', () => {
    expect(resolveFontSizeAdjustTarget('0.5', undefined)).toBe(0.5)
  })
})

describe('resolveAdjustedFontSize', () => {
  it('should adjust font size based on aspect ratio', () => {
    // fontSize * (targetAspect / fontAspect)
    expect(resolveAdjustedFontSize(16, 0.5, 0.25)).toBe(32)
  })

  it('should return original size when fontSizeAdjust is undefined', () => {
    expect(resolveAdjustedFontSize(16, undefined, 0.5)).toBe(16)
  })

  it('should return original size when fontAspect is zero', () => {
    expect(resolveAdjustedFontSize(16, 0.5, 0)).toBe(16)
  })

  it('should return original size when fontAspect is undefined', () => {
    expect(resolveAdjustedFontSize(16, 0.5, undefined)).toBe(16)
  })
})

describe('detectTabs', () => {
  it('should return tabCount 0 for strings without tabs', () => {
    const result = detectTabs('hello world')
    expect(result.tabCount).toBe(0)
    expect(result.index).toBeNull()
  })

  it('should detect a single tab', () => {
    const result = detectTabs('hello\tworld')
    expect(result.tabCount).toBe(1)
    expect(result.index).toBe(5)
  })

  it('should detect multiple consecutive tabs', () => {
    const result = detectTabs('a\t\t\tb')
    expect(result.tabCount).toBe(3)
    expect(result.index).toBe(1)
  })

  it('should detect first tab group in mixed positions', () => {
    const result = detectTabs('\tfoo\tbar')
    expect(result.tabCount).toBe(1)
    expect(result.index).toBe(0)
  })

  it('should return tabCount 0 for empty string', () => {
    const result = detectTabs('')
    expect(result.tabCount).toBe(0)
    expect(result.index).toBeNull()
  })
})

describe('shouldSkipWhenFindingMissingFont', () => {
  it('should skip tab characters', () => {
    expect(shouldSkipWhenFindingMissingFont('\t')).toBe(true)
  })

  it('should not skip regular text', () => {
    expect(shouldSkipWhenFindingMissingFont('hello')).toBe(false)
    expect(shouldSkipWhenFindingMissingFont(' ')).toBe(false)
  })
})
