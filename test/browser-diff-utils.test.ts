import { describe, expect, it } from 'vitest'

import { resolveBrowserCaptureSize } from './browser-diff-utils.js'

describe('resolveBrowserCaptureSize', () => {
  it('prefers explicit width and height from options', () => {
    const result = resolveBrowserCaptureSize(
      { width: 320, height: 180 },
      '<svg width="40" height="20"></svg>'
    )

    expect(result).toEqual({ width: 320, height: 180 })
  })

  it('uses dynamic width from svg when options width is omitted', () => {
    const result = resolveBrowserCaptureSize(
      { height: 25 },
      '<svg width="334.7" height="25"></svg>'
    )

    expect(result).toEqual({ width: 335, height: 25 })
  })

  it('uses dynamic height from svg when options height is omitted', () => {
    const result = resolveBrowserCaptureSize(
      { width: 100 },
      '<svg width="100" height="73.2"></svg>'
    )

    expect(result).toEqual({ width: 100, height: 73 })
  })

  it('falls back to viewBox dimensions when width and height are missing', () => {
    const result = resolveBrowserCaptureSize(
      undefined,
      '<svg viewBox="0 0 640 360"></svg>'
    )

    expect(result).toEqual({ width: 640, height: 360 })
  })

  it('falls back to defaults for invalid dimensions', () => {
    const result = resolveBrowserCaptureSize(
      { width: Number.NaN },
      '<svg width="100%" height="auto"></svg>'
    )

    expect(result).toEqual({ width: 100, height: 100 })
  })
})
