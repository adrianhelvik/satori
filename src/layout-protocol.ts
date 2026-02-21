import type { Locale } from './language.js'

export interface LayoutBlendPrimitive {
  left: number
  top: number
  width: number
  height: number
  color: string
}

export interface MissingFontSegment {
  word: string
  locale?: Locale
}

export interface MissingFontsPhase {
  type: 'missing-font-segments'
  segments: MissingFontSegment[]
}

export interface ReadyForRenderPhase {
  type: 'ready-for-render'
}

export type LayoutPhase = MissingFontsPhase | ReadyForRenderPhase

export interface LayoutRenderInput {
  type: 'render'
  offset: [number, number]
  siblingBlendBackdrops?: LayoutBlendPrimitive[]
}

export const READY_FOR_RENDER_PHASE: ReadyForRenderPhase = {
  type: 'ready-for-render',
}

export function createMissingFontsPhase(
  segments: MissingFontSegment[]
): MissingFontsPhase {
  return {
    type: 'missing-font-segments',
    segments,
  }
}

export function createRenderInput(
  offset: [number, number],
  siblingBlendBackdrops?: LayoutBlendPrimitive[]
): LayoutRenderInput {
  return {
    type: 'render',
    offset,
    siblingBlendBackdrops,
  }
}

type LayoutIteratorResult = IteratorResult<LayoutPhase, string>

function isLayoutPhase(value: unknown): value is LayoutPhase {
  return typeof value === 'object' && value !== null && 'type' in value
}

export function expectMissingFontsPhase(
  result: LayoutIteratorResult,
  stage: string
): MissingFontSegment[] {
  if (result.done) {
    throw new Error(
      `Layout pipeline ended before missing-font collection (${stage}).`
    )
  }

  if (!isLayoutPhase(result.value)) {
    throw new Error(
      `Unexpected layout iterator value while collecting missing-font segments (${stage}).`
    )
  }

  if (result.value.type !== 'missing-font-segments') {
    throw new Error(
      `Unexpected layout phase "${result.value.type}" while collecting missing-font segments (${stage}).`
    )
  }

  return result.value.segments
}

export function expectReadyForRenderPhase(
  result: LayoutIteratorResult,
  stage: string
): void {
  if (result.done) {
    throw new Error(`Layout pipeline ended before render phase (${stage}).`)
  }

  if (!isLayoutPhase(result.value)) {
    throw new Error(
      `Unexpected layout iterator value while preparing render phase (${stage}).`
    )
  }

  if (result.value.type !== 'ready-for-render') {
    throw new Error(
      `Unexpected layout phase "${result.value.type}" while preparing render phase (${stage}).`
    )
  }
}
