import { describe, expect, it } from 'vitest'

import type { SerializedStyle } from '../src/handler/style-types.js'
import {
  createsFixedContainingBlock,
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

  it('should isolate inherited transform and containing-block state', () => {
    const inherited = {
      ...baseInheritedStyle(),
      transform: [{ translateX: 10 }],
      filter: 'blur(2px)',
      perspective: 100,
      contain: 'paint',
      willChange: 'transform',
      letterSpacing: 0.2,
    } as SerializedStyle

    const isolated = isolateFixedInheritance(inherited)

    expect(isolated.transform).toBeUndefined()
    expect(isolated.filter).toBeUndefined()
    expect(isolated.perspective).toBeUndefined()
    expect(isolated.contain).toBeUndefined()
    expect(isolated.willChange).toBeUndefined()
    expect(isolated.letterSpacing).toBe(0.2)
  })

  it('should detect containing-block triggers for fixed descendants', () => {
    expect(
      createsFixedContainingBlock({
        ...baseInheritedStyle(),
        transform: [{ translateX: 10 }],
      } as SerializedStyle)
    ).toBe(true)
    expect(
      createsFixedContainingBlock({
        ...baseInheritedStyle(),
        filter: 'blur(1px)',
      } as SerializedStyle)
    ).toBe(true)
    expect(
      createsFixedContainingBlock({
        ...baseInheritedStyle(),
        perspective: 120,
      } as SerializedStyle)
    ).toBe(true)
    expect(
      createsFixedContainingBlock({
        ...baseInheritedStyle(),
        contain: 'layout paint',
      } as SerializedStyle)
    ).toBe(true)
    expect(
      createsFixedContainingBlock({
        ...baseInheritedStyle(),
        willChange: 'transform, opacity',
      } as SerializedStyle)
    ).toBe(true)
    expect(
      createsFixedContainingBlock({
        ...baseInheritedStyle(),
        willChange: 'opacity',
      } as SerializedStyle)
    ).toBe(false)
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
