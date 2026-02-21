type CaptureOptionsLike = {
  width?: number
  height?: number
}

const DEFAULT_CAPTURE_DIMENSION = 100

function isFinitePositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function parseLength(value: string | undefined): number | undefined {
  if (!value) return
  const normalized = value.trim()
  if (!normalized || normalized.endsWith('%')) return

  const match = normalized.match(/^([+-]?\d*\.?\d+)(px)?$/i)
  if (!match) return

  const numericValue = Number(match[1])
  if (!Number.isFinite(numericValue) || numericValue <= 0) return
  return numericValue
}

function parseViewBoxDimension(
  svgOpenTag: string,
  index: 2 | 3
): number | undefined {
  const viewBoxMatch = svgOpenTag.match(/\bviewBox\s*=\s*(['"])([^'"]+)\1/i)
  if (!viewBoxMatch) return

  const values = viewBoxMatch[2]
    .trim()
    .split(/[\s,]+/)
    .map((token) => Number(token))

  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) {
    return
  }

  const dimension = values[index]
  return dimension > 0 ? dimension : undefined
}

function getSvgOpenTag(svg: string): string {
  const match = svg.match(/<svg\b[^>]*>/i)
  return match?.[0] || ''
}

function extractSvgDimension(svgOpenTag: string, axis: 'width' | 'height') {
  const attributeMatch = svgOpenTag.match(
    new RegExp(`\\b${axis}\\s*=\\s*(['"])([^'"]+)\\1`, 'i')
  )
  const attributeValue = parseLength(attributeMatch?.[2])

  if (attributeValue) return attributeValue
  return parseViewBoxDimension(svgOpenTag, axis === 'width' ? 2 : 3)
}

function normalizeDimension(value: number): number {
  return Math.max(1, Math.round(value))
}

export function resolveBrowserCaptureSize(
  options: CaptureOptionsLike | undefined,
  svg: string
): { width: number; height: number } {
  const svgOpenTag = getSvgOpenTag(svg)
  const svgWidth = extractSvgDimension(svgOpenTag, 'width')
  const svgHeight = extractSvgDimension(svgOpenTag, 'height')

  const width = isFinitePositiveNumber(options?.width)
    ? options.width
    : svgWidth ?? DEFAULT_CAPTURE_DIMENSION
  const height = isFinitePositiveNumber(options?.height)
    ? options.height
    : svgHeight ?? DEFAULT_CAPTURE_DIMENSION

  return {
    width: normalizeDimension(width),
    height: normalizeDimension(height),
  }
}
