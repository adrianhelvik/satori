export interface WordPosition {
  x: number
  y: number
  width: number
  line: number
  lineIndex: number
  isImage: boolean
}

export interface TextFlowResult {
  texts: string[]
  wordPositionInLayout: (WordPosition | null)[]
  lineWidths: number[]
  baselines: number[]
  lineSegmentNumber: number[]
  measuredTextSize: { width: number; height: number }
}
