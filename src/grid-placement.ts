export interface GridAxisPlacement {
  start?: number
  span: number
}

function parseIntegerToken(token: string): number | undefined {
  if (!/^[+-]?\d+$/.test(token.trim())) return
  const parsed = Number.parseInt(token, 10)
  if (!Number.isFinite(parsed)) return
  return parsed
}

function parsePositiveIntegerToken(token: string): number | undefined {
  const parsed = parseIntegerToken(token)
  if (typeof parsed !== 'number' || parsed <= 0) return
  return parsed
}

function parseGridLineToken(
  token: string | undefined,
  namedLines?: Record<string, number[]>
): {
  line?: number
  span?: number
} {
  return parseGridLineTokenWithNamedLines(token, namedLines)
}

function parseGridLineTokenWithNamedLines(
  token: string | undefined,
  namedLines?: Record<string, number[]>
): { line?: number; span?: number } {
  if (!token) return {}
  const normalized = token.trim().toLowerCase()
  if (!normalized || normalized === 'auto') return {}

  const spanMatch = normalized.match(/^span\s+(-?\d+)$/)
  if (spanMatch) {
    const span = parsePositiveIntegerToken(spanMatch[1])
    if (span) return { span }
    return {}
  }

  const line = parseIntegerToken(normalized)
  if (typeof line === 'number' && line !== 0) {
    return { line }
  }

  const explicitLine = namedLines?.[normalized]
  if (explicitLine?.length) {
    return { line: explicitLine[0] }
  }

  return {}
}

function resolveGridLineIndexFromToken(
  line: number | undefined,
  explicitTrackCount: number
): number | undefined {
  if (typeof line !== 'number') return
  if (line > 0) return line

  const lineCount = Math.max(1, explicitTrackCount) + 1
  const resolved = lineCount + 1 + line
  if (resolved <= 0) return
  return resolved
}

function parsePlacementPair(value: unknown): {
  start?: string
  end?: string
} {
  if (typeof value !== 'string') return {}
  const parts = value
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)

  return {
    start: parts[0],
    end: parts[1],
  }
}

export function parseGridAxisPlacement(
  shorthandValue: unknown,
  explicitStart: unknown,
  explicitEnd: unknown,
  explicitTrackCount = 1,
  namedLines?: Record<string, number[]>
): GridAxisPlacement {
  const parsedPair = parsePlacementPair(shorthandValue)
  const startToken = parseGridLineToken(
    typeof explicitStart === 'string' || typeof explicitStart === 'number'
      ? String(explicitStart)
      : parsedPair.start,
    namedLines
  )
  const endToken = parseGridLineToken(
    typeof explicitEnd === 'string' || typeof explicitEnd === 'number'
      ? String(explicitEnd)
      : parsedPair.end,
    namedLines
  )

  let startLine = resolveGridLineIndexFromToken(
    startToken.line,
    explicitTrackCount
  )
  const endLine = resolveGridLineIndexFromToken(
    endToken.line,
    explicitTrackCount
  )
  let span = startToken.span || endToken.span || 1
  if (startLine && endLine) {
    span = Math.max(1, endLine - startLine)
  } else if (!startLine && endLine) {
    startLine = Math.max(1, endLine - span)
  }

  return {
    start: typeof startLine === 'number' ? startLine - 1 : undefined,
    span: Math.max(1, span),
  }
}
