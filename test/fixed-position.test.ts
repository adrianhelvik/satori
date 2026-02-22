import { describe, expect, it } from 'vitest'

import type { SerializedStyle } from '../src/handler/style-types.js'
import {
  isolateFixedInheritance,
  isFixedPositionStyle,
  resolveFixedPosition,
} from '../src/fixed-position.js'

function baseInheritedStyle(): SerializedStyle {
  return {
    color: '#000',
    opacity: 1,
    fontSize: 16,
    _viewportWidth: 200,
    _viewportHeight: 100,
  } as SerializedStyle
}

describe('fixed position helpers', () => {
  it('should detect fixed position styles', () => {
    expect(isFixedPositionStyle({ position: ' fixed ' })).toBe(true)
    expect(isFixedPositionStyle({ position: 'absolute' })).toBe(false)
    expect(isFixedPositionStyle(undefined)).toBe(false)
  })

  it('should isolate inherited transform and mask/clip state', () => {
    const inherited = {
      ...baseInheritedStyle(),
      transform: [{ translateX: 10 }],
      _inheritedClipPathId: 'clip-id',
      _inheritedMaskId: 'mask-id',
      _inheritedBackgroundClipTextPath: 'bg-clip-id',
      letterSpacing: 0.2,
    } as SerializedStyle

    const isolated = isolateFixedInheritance(inherited)

    expect(isolated.transform).toBeUndefined()
    expect(isolated._inheritedClipPathId).toBeUndefined()
    expect(isolated._inheritedMaskId).toBeUndefined()
    expect(isolated._inheritedBackgroundClipTextPath).toBeUndefined()
    expect(isolated.letterSpacing).toBe(0.2)
  })

  it('should resolve right and bottom insets against viewport dimensions', () => {
    const style = {
      ...baseInheritedStyle(),
      position: 'fixed',
      right: '10%',
      bottom: '20%',
    } as SerializedStyle

    const position = resolveFixedPosition(
      { left: 0, top: 0, width: 40, height: 10 },
      style,
      baseInheritedStyle()
    )

    expect(position.left).toBeCloseTo(140, 4)
    expect(position.top).toBeCloseTo(70, 4)
  })
})
