import { describe, expect, it } from 'vitest'

import {
  createMissingFontsPhase,
  createRenderInput,
  expectMissingFontsPhase,
  expectReadyForRenderPhase,
  READY_FOR_RENDER_PHASE,
} from '../src/layout-protocol.js'

describe('layout protocol helpers', () => {
  it('extracts missing font segments from missing-font phase', () => {
    const result = {
      done: false as const,
      value: createMissingFontsPhase([{ word: 'A' }]),
    }

    expect(expectMissingFontsPhase(result, 'unit')).toEqual([{ word: 'A' }])
  })

  it('throws when missing-font extraction receives wrong phase', () => {
    const result = {
      done: false as const,
      value: READY_FOR_RENDER_PHASE,
    }

    expect(() => expectMissingFontsPhase(result, 'unit')).toThrow(
      'Unexpected layout phase "ready-for-render" while collecting missing-font segments (unit).'
    )
  })

  it('accepts ready-for-render phase', () => {
    const result = {
      done: false as const,
      value: READY_FOR_RENDER_PHASE,
    }

    expect(() => expectReadyForRenderPhase(result, 'unit')).not.toThrow()
  })

  it('throws when render phase is requested after pipeline completion', () => {
    const result = {
      done: true as const,
      value: 'done',
    }

    expect(() => expectReadyForRenderPhase(result, 'unit')).toThrow(
      'Layout pipeline ended before render phase (unit).'
    )
  })

  it('builds render input payloads', () => {
    expect(createRenderInput([10, 20])).toEqual({
      type: 'render',
      offset: [10, 20],
      siblingBlendBackdrops: undefined,
    })
  })
})
