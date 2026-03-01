export interface RenderContext {
  viewportWidth: number
  viewportHeight: number
  clipPathId?: string
  overflowMaskId?: string
  parentBackgroundColor?: string
  backgroundClipTextPath?: BackgroundClipTextPathCollector
}

export class BackgroundClipTextPathCollector {
  private parts: string[] = []

  append(pathDef: string): void {
    this.parts.push(pathDef)
  }

  build(): string {
    return this.parts.join('')
  }

  get hasContent(): boolean {
    return this.parts.length > 0
  }
}

export function createRenderContext(
  viewportWidth: number,
  viewportHeight: number
): RenderContext {
  return { viewportWidth, viewportHeight }
}

export function deriveChildRenderContext(
  parent: RenderContext,
  overrides?: Partial<RenderContext>
): RenderContext {
  return { ...parent, ...overrides }
}
