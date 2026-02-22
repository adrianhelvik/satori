import type { ReactNode } from 'react'

import { splitByWhitespaceOutsideParens } from './css-value-parser.js'
import { resolveElementStyle, type TwStyleResolver } from './element-style.js'
import { normalizeDisplayValue } from './handler/display.js'
import { normalizePositionValue } from './handler/position.js'
import { parseFiniteNumber } from './style-number.js'
import { isReactElement, lengthToNumber, normalizeChildren } from './utils.js'

type TrackDefinition =
  | { kind: 'fixed'; value: number }
  | { kind: 'percent'; value: number }
  | { kind: 'fr'; value: number }
  | { kind: 'auto' }

interface AxisPlacement {
  start?: number
  span: number
}

interface GridItemDescriptor {
  child: ReactNode
  childStyle: Record<string, unknown> | undefined
  row: AxisPlacement
  column: AxisPlacement
}

interface GridPlacementResult {
  rowIndex: number
  columnIndex: number
  rowSpan: number
  columnSpan: number
}

type GridAutoFlowDirection = 'row' | 'column'
interface GridAutoFlowConfig {
  direction: GridAutoFlowDirection
  dense: boolean
}

interface GridPlacementBounds {
  rowCount: number
  columnCount: number
}

interface GridAutoPlacementResult {
  row: number
  column: number
  nextCursorRow: number
  nextCursorColumn: number
}

const GRID_CONTAINER_DISPLAYS = new Set(['grid', 'inline-grid'])
const GRID_PLACEMENT_STYLE_KEYS = new Set([
  'gridColumn',
  'gridColumnStart',
  'gridColumnEnd',
  'gridRow',
  'gridRowStart',
  'gridRowEnd',
  'gridArea',
  'placeSelf',
  'justifySelf',
  'alignSelf',
])
const GRID_TEMPLATE_COLUMN_KEYS = [
  'gridTemplateColumns',
  'grid-template-columns',
]
const GRID_TEMPLATE_ROW_KEYS = ['gridTemplateRows', 'grid-template-rows']
const GRID_AUTO_COLUMN_KEYS = ['gridAutoColumns', 'grid-auto-columns']
const GRID_AUTO_ROW_KEYS = ['gridAutoRows', 'grid-auto-rows']
const GRID_TEMPLATE_AREA_KEYS = ['gridTemplateAreas', 'grid-template-areas']
const GRID_ROW_GAP_KEYS = ['rowGap', 'row-gap']
const GRID_COLUMN_GAP_KEYS = ['columnGap', 'column-gap']
const GRID_GAP_KEYS = ['gap']
const GRID_ROW_SHORTHAND_KEYS = ['gridRow', 'grid-row']
const GRID_ROW_START_KEYS = ['gridRowStart', 'grid-row-start']
const GRID_ROW_END_KEYS = ['gridRowEnd', 'grid-row-end']
const GRID_COLUMN_SHORTHAND_KEYS = ['gridColumn', 'grid-column']
const GRID_COLUMN_START_KEYS = ['gridColumnStart', 'grid-column-start']
const GRID_COLUMN_END_KEYS = ['gridColumnEnd', 'grid-column-end']
const GRID_AREA_KEYS = ['gridArea', 'grid-area']

function clampToNonNegative(value: number): number {
  return value < 0 ? 0 : value
}

function toRounded(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 10000) / 10000
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

function resolveStyleValue(
  style: Record<string, unknown> | undefined,
  keys: string[]
): unknown {
  if (!style) return
  for (const key of keys) {
    if (typeof style[key] !== 'undefined') {
      return style[key]
    }
  }
}

function resolveBaseFontSize(
  style: Record<string, unknown> | undefined
): number {
  if (!style) return 16
  return parseFiniteNumber(style.fontSize, 16)
}

function resolveLengthValue(
  value: unknown,
  axisLength: number | undefined,
  baseFontSize: number,
  style: Record<string, unknown> | undefined
): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }
  if (typeof value !== 'string') return

  const token = value.trim()
  if (!token || token === 'auto') return

  if (token.endsWith('%')) {
    if (typeof axisLength !== 'number' || !Number.isFinite(axisLength)) return
    const percent = Number.parseFloat(token.slice(0, -1))
    if (!Number.isFinite(percent)) return
    return (percent / 100) * axisLength
  }

  const resolved = lengthToNumber(
    token,
    baseFontSize,
    typeof axisLength === 'number' ? axisLength : 1,
    (style || {}) as Record<string, string | number | object>,
    typeof axisLength === 'number'
  )
  if (typeof resolved === 'number' && Number.isFinite(resolved)) {
    return resolved
  }

  const numeric = Number.parseFloat(token)
  if (Number.isFinite(numeric) && token === String(numeric)) {
    return numeric
  }
}

function parseRepeatTrackList(
  token: string,
  baseFontSize: number
): TrackDefinition[] | undefined {
  const normalized = token.trim()
  if (
    !normalized.toLowerCase().startsWith('repeat(') ||
    !normalized.endsWith(')')
  ) {
    return
  }

  const body = normalized.slice('repeat('.length, -1)
  const commaIndex = body.indexOf(',')
  if (commaIndex <= 0) return

  const rawCount = body.slice(0, commaIndex).trim()
  const count = parsePositiveIntegerToken(rawCount)
  if (!count) return

  const pattern = body.slice(commaIndex + 1).trim()
  if (!pattern) return

  const patternTracks = parseGridTrackList(pattern, baseFontSize)
  if (!patternTracks.length) return

  const result: TrackDefinition[] = []
  for (let i = 0; i < count; i++) {
    result.push(...patternTracks)
  }
  return result
}

export function parseGridTrackList(
  value: unknown,
  baseFontSize = 16
): TrackDefinition[] {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return [{ kind: 'fixed', value: clampToNonNegative(value) }]
  }
  if (typeof value !== 'string') return []

  const tokens = splitByWhitespaceOutsideParens(value)
  const tracks: TrackDefinition[] = []
  for (const token of tokens) {
    if (!token || token === '/') continue

    const repeated = parseRepeatTrackList(token, baseFontSize)
    if (repeated?.length) {
      tracks.push(...repeated)
      continue
    }

    const normalized = token.trim().toLowerCase()
    if (!normalized || normalized === 'none') continue

    if (
      normalized === 'auto' ||
      normalized === 'min-content' ||
      normalized === 'max-content'
    ) {
      tracks.push({ kind: 'auto' })
      continue
    }

    if (normalized.endsWith('fr')) {
      const fr = Number.parseFloat(normalized.slice(0, -2))
      tracks.push({
        kind: 'fr',
        value: Number.isFinite(fr) && fr > 0 ? fr : 1,
      })
      continue
    }

    if (normalized.endsWith('%')) {
      const percent = Number.parseFloat(normalized.slice(0, -1))
      if (Number.isFinite(percent)) {
        tracks.push({
          kind: 'percent',
          value: clampToNonNegative(percent / 100),
        })
      } else {
        tracks.push({ kind: 'auto' })
      }
      continue
    }

    const fixed = lengthToNumber(normalized, baseFontSize, 1, {}, false)
    if (typeof fixed === 'number' && Number.isFinite(fixed)) {
      tracks.push({ kind: 'fixed', value: clampToNonNegative(fixed) })
      continue
    }

    // Keep unsupported track functions deterministic for now.
    tracks.push({ kind: 'auto' })
  }

  return tracks
}

function parseGridLineToken(token: string | undefined): {
  line?: number
  span?: number
} {
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

export function parseGridTemplateAreas(value: unknown): string[][] {
  if (typeof value !== 'string') return []
  const normalized = value.trim()
  if (!normalized || normalized.toLowerCase() === 'none') return []

  const rows: string[][] = []
  const rowRe = /"([^"]*)"|'([^']*)'/g
  let match: RegExpExecArray | null
  while ((match = rowRe.exec(normalized))) {
    const rowContent = (match[1] || match[2] || '').trim()
    if (!rowContent) return []
    const tokens = rowContent.split(/\s+/).filter(Boolean)
    if (!tokens.length) return []
    rows.push(tokens)
  }

  if (!rows.length) return []
  const columnCount = rows[0].length
  if (!columnCount) return []
  for (const row of rows) {
    if (row.length !== columnCount) return []
  }

  return rows
}

function resolveTemplateAreaPlacements(
  templateRows: string[][]
): Map<string, GridTemplateAreaPlacement> {
  if (!templateRows.length) return new Map()

  const bounds = new Map<
    string,
    { minRow: number; maxRow: number; minColumn: number; maxColumn: number }
  >()

  for (let rowIndex = 0; rowIndex < templateRows.length; rowIndex++) {
    const row = templateRows[rowIndex]
    for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {
      const token = row[columnIndex]
      if (!token || token === '.') continue

      const existing = bounds.get(token)
      if (!existing) {
        bounds.set(token, {
          minRow: rowIndex,
          maxRow: rowIndex,
          minColumn: columnIndex,
          maxColumn: columnIndex,
        })
        continue
      }

      existing.minRow = Math.min(existing.minRow, rowIndex)
      existing.maxRow = Math.max(existing.maxRow, rowIndex)
      existing.minColumn = Math.min(existing.minColumn, columnIndex)
      existing.maxColumn = Math.max(existing.maxColumn, columnIndex)
    }
  }

  // Invalid non-rectangular template areas make the whole declaration invalid.
  for (const [name, box] of bounds) {
    for (let row = box.minRow; row <= box.maxRow; row++) {
      for (let column = box.minColumn; column <= box.maxColumn; column++) {
        if (templateRows[row][column] !== name) {
          return new Map()
        }
      }
    }
  }

  const placements = new Map<string, GridTemplateAreaPlacement>()
  for (const [name, box] of bounds) {
    placements.set(name, {
      row: {
        start: box.minRow,
        span: box.maxRow - box.minRow + 1,
      },
      column: {
        start: box.minColumn,
        span: box.maxColumn - box.minColumn + 1,
      },
    })
  }

  return placements
}

export function parseGridAxisPlacement(
  shorthandValue: unknown,
  explicitStart: unknown,
  explicitEnd: unknown,
  explicitTrackCount = 1
): AxisPlacement {
  const parsedPair = parsePlacementPair(shorthandValue)
  const startToken = parseGridLineToken(
    typeof explicitStart === 'string' || typeof explicitStart === 'number'
      ? String(explicitStart)
      : parsedPair.start
  )
  const endToken = parseGridLineToken(
    typeof explicitEnd === 'string' || typeof explicitEnd === 'number'
      ? String(explicitEnd)
      : parsedPair.end
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

function isGridContainerElement(
  style: Record<string, unknown> | undefined
): boolean {
  return GRID_CONTAINER_DISPLAYS.has(
    normalizeDisplayValue(resolveStyleValue(style, ['display']))
  )
}

function parseGapShorthand(value: unknown, axis: 'row' | 'column'): unknown {
  if (typeof value !== 'string') return value
  const tokens = splitByWhitespaceOutsideParens(value)
  if (!tokens.length) return
  if (axis === 'row') return tokens[0]
  return tokens[1] || tokens[0]
}

function resolveGridAutoFlow(
  style: Record<string, unknown> | undefined
): GridAutoFlowConfig {
  const value = resolveStyleValue(style, ['gridAutoFlow', 'grid-auto-flow'])
  if (typeof value !== 'string') {
    return { direction: 'row', dense: false }
  }

  const tokens = splitByWhitespaceOutsideParens(value.trim().toLowerCase())
  return {
    direction: tokens.includes('column') ? 'column' : 'row',
    dense: tokens.includes('dense'),
  }
}

function normalizeAlignmentToken(value: unknown): string | undefined {
  if (typeof value !== 'string') return
  const normalized = value.trim().toLowerCase()
  if (!normalized) return
  return normalized.replace(/^(safe|unsafe)\s+/, '')
}

function parsePlaceAlignmentValue(value: unknown): {
  align?: string
  justify?: string
} {
  if (typeof value !== 'string') return {}
  const tokens = splitByWhitespaceOutsideParens(value.trim())
  if (!tokens.length) return {}

  const parseAlignment = (
    list: string[],
    startIndex: number
  ): { value?: string; nextIndex: number } => {
    const token = list[startIndex]
    if (!token) return { nextIndex: startIndex }
    if (
      (token === 'safe' || token === 'unsafe') &&
      typeof list[startIndex + 1] === 'string'
    ) {
      return {
        value: `${token} ${list[startIndex + 1]}`,
        nextIndex: startIndex + 2,
      }
    }
    return { value: token, nextIndex: startIndex + 1 }
  }

  const first = parseAlignment(tokens, 0)
  const second =
    first.nextIndex < tokens.length
      ? parseAlignment(tokens, first.nextIndex)
      : undefined

  return {
    align: first.value,
    justify: second?.value || first.value,
  }
}

function mapGridAlignmentToFlex(value: string | undefined): string {
  switch (value) {
    case 'start':
    case 'self-start':
    case 'left':
    case 'flex-start':
      return 'flex-start'
    case 'end':
    case 'self-end':
    case 'right':
    case 'flex-end':
      return 'flex-end'
    case 'center':
      return 'center'
    case 'baseline':
      return 'baseline'
    case 'stretch':
    case 'normal':
    default:
      return 'flex-start'
  }
}

function resolveEffectiveItemAlignment(
  childStyle: Record<string, unknown> | undefined,
  alignItemsDefault: string,
  justifyItemsDefault: string
): {
  align: string
  justify: string
} {
  const placeSelf = parsePlaceAlignmentValue(
    resolveStyleValue(childStyle, ['placeSelf', 'place-self'])
  )
  const alignSelf = normalizeAlignmentToken(
    placeSelf.align ||
      resolveStyleValue(childStyle, ['alignSelf', 'align-self'])
  )
  const justifySelf = normalizeAlignmentToken(
    placeSelf.justify ||
      resolveStyleValue(childStyle, ['justifySelf', 'justify-self'])
  )

  const resolvedAlign =
    !alignSelf || alignSelf === 'auto' ? alignItemsDefault : alignSelf
  const resolvedJustify =
    !justifySelf || justifySelf === 'auto' ? justifyItemsDefault : justifySelf

  return {
    align: resolvedAlign,
    justify: resolvedJustify,
  }
}

function resolveContainerAlignment(
  style: Record<string, unknown> | undefined
): { alignItems: string; justifyItems: string } {
  const placeItems = parsePlaceAlignmentValue(
    resolveStyleValue(style, ['placeItems', 'place-items'])
  )

  const alignItems = normalizeAlignmentToken(
    placeItems.align || resolveStyleValue(style, ['alignItems', 'align-items'])
  )
  const justifyItems = normalizeAlignmentToken(
    placeItems.justify ||
      resolveStyleValue(style, ['justifyItems', 'justify-items'])
  )

  return {
    alignItems: alignItems || 'stretch',
    justifyItems: justifyItems || 'stretch',
  }
}

function hasExplicitSize(value: unknown): boolean {
  if (typeof value === 'undefined' || value === null) return false
  if (typeof value === 'string' && value.trim().toLowerCase() === 'auto') {
    return false
  }
  return true
}

function sanitizeGridItemStyle(
  style: Record<string, unknown> | undefined
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...(style || {}) }
  for (const key of GRID_PLACEMENT_STYLE_KEYS) {
    delete result[key]
  }
  return result
}

function resolveGridItemStyle(
  child: ReactNode,
  getTwStyles: TwStyleResolver
): Record<string, unknown> | undefined {
  return resolveElementStyle(child, getTwStyles)
}

function ensureGridRows(occupancy: boolean[][], rowCount: number): void {
  while (occupancy.length < rowCount) {
    occupancy.push([])
  }
}

function markOccupied(
  occupancy: boolean[][],
  row: number,
  column: number,
  rowSpan: number,
  columnSpan: number
): void {
  ensureGridRows(occupancy, row + rowSpan)
  for (let r = row; r < row + rowSpan; r++) {
    for (let c = column; c < column + columnSpan; c++) {
      occupancy[r][c] = true
    }
  }
}

function canPlace(
  occupancy: boolean[][],
  row: number,
  column: number,
  rowSpan: number,
  columnSpan: number
): boolean {
  if (row < 0 || column < 0) return false
  ensureGridRows(occupancy, row + rowSpan)
  for (let r = row; r < row + rowSpan; r++) {
    for (let c = column; c < column + columnSpan; c++) {
      if (occupancy[r][c]) return false
    }
  }
  return true
}

function ensureBoundsForPlacement(
  occupancy: boolean[][],
  bounds: GridPlacementBounds,
  row: number,
  column: number,
  rowSpan: number,
  columnSpan: number
): void {
  if (column + columnSpan > bounds.columnCount) {
    bounds.columnCount = column + columnSpan
  }
  if (row + rowSpan > bounds.rowCount) {
    bounds.rowCount = row + rowSpan
    ensureGridRows(occupancy, bounds.rowCount)
  }
}

function findColumnForFixedRow(
  occupancy: boolean[][],
  bounds: GridPlacementBounds,
  row: number,
  rowSpan: number,
  columnSpan: number
): number {
  let searchColumn = 0
  for (;;) {
    ensureBoundsForPlacement(
      occupancy,
      bounds,
      row,
      searchColumn,
      rowSpan,
      columnSpan
    )
    if (canPlace(occupancy, row, searchColumn, rowSpan, columnSpan)) {
      return searchColumn
    }
    searchColumn++
  }
}

function findRowForFixedColumn(
  occupancy: boolean[][],
  bounds: GridPlacementBounds,
  column: number,
  rowSpan: number,
  columnSpan: number
): number {
  let searchRow = 0
  for (;;) {
    ensureBoundsForPlacement(
      occupancy,
      bounds,
      searchRow,
      column,
      rowSpan,
      columnSpan
    )
    if (canPlace(occupancy, searchRow, column, rowSpan, columnSpan)) {
      return searchRow
    }
    searchRow++
  }
}

function findAutoPlacementWithColumnFlow(
  occupancy: boolean[][],
  bounds: GridPlacementBounds,
  cursorRow: number,
  cursorColumn: number,
  rowSpan: number,
  columnSpan: number
): GridAutoPlacementResult {
  let searchRow = cursorRow
  let searchColumn = cursorColumn

  for (;;) {
    if (searchRow + rowSpan > bounds.rowCount) {
      searchColumn++
      searchRow = 0
    }

    ensureBoundsForPlacement(
      occupancy,
      bounds,
      searchRow,
      searchColumn,
      rowSpan,
      columnSpan
    )
    if (canPlace(occupancy, searchRow, searchColumn, rowSpan, columnSpan)) {
      let nextCursorColumn = searchColumn
      let nextCursorRow = searchRow + rowSpan
      if (nextCursorRow >= bounds.rowCount) {
        nextCursorColumn++
        nextCursorRow = 0
      }
      return {
        row: searchRow,
        column: searchColumn,
        nextCursorRow,
        nextCursorColumn,
      }
    }

    searchRow++
  }
}

function findAutoPlacementWithRowFlow(
  occupancy: boolean[][],
  bounds: GridPlacementBounds,
  cursorRow: number,
  cursorColumn: number,
  rowSpan: number,
  columnSpan: number
): GridAutoPlacementResult {
  let searchRow = cursorRow
  let searchColumn = cursorColumn

  for (;;) {
    if (searchColumn + columnSpan > bounds.columnCount) {
      searchRow++
      searchColumn = 0
      ensureBoundsForPlacement(
        occupancy,
        bounds,
        searchRow,
        searchColumn,
        rowSpan,
        columnSpan
      )
      continue
    }

    ensureBoundsForPlacement(
      occupancy,
      bounds,
      searchRow,
      searchColumn,
      rowSpan,
      columnSpan
    )
    if (canPlace(occupancy, searchRow, searchColumn, rowSpan, columnSpan)) {
      let nextCursorRow = searchRow
      let nextCursorColumn = searchColumn + columnSpan
      if (nextCursorColumn >= bounds.columnCount) {
        nextCursorRow++
        nextCursorColumn = 0
      }
      return {
        row: searchRow,
        column: searchColumn,
        nextCursorRow,
        nextCursorColumn,
      }
    }

    searchColumn++
  }
}

function placeGridItems(
  items: GridItemDescriptor[],
  explicitRowCount: number,
  explicitColumnCount: number,
  autoFlowDirection: GridAutoFlowDirection,
  autoFlowDense: boolean
): {
  placements: GridPlacementResult[]
  rowCount: number
  columnCount: number
} {
  const occupancy: boolean[][] = []
  const bounds = {
    rowCount: Math.max(1, explicitRowCount),
    columnCount: Math.max(1, explicitColumnCount),
  }
  let cursorRow = 0
  let cursorColumn = 0
  const placements: GridPlacementResult[] = []

  ensureGridRows(occupancy, bounds.rowCount)

  for (const item of items) {
    const rowSpan = item.row.span
    const columnSpan = item.column.span
    let row = item.row.start
    let column = item.column.start

    if (typeof row === 'number' && typeof column === 'number') {
      ensureBoundsForPlacement(
        occupancy,
        bounds,
        row,
        column,
        rowSpan,
        columnSpan
      )
    }

    if (typeof row === 'number' && typeof column === 'number') {
      // Explicit row/column placements can overlap in CSS Grid. We keep the
      // requested position deterministic without re-flow.
      markOccupied(occupancy, row, column, rowSpan, columnSpan)
      placements.push({
        rowIndex: row,
        columnIndex: column,
        rowSpan,
        columnSpan,
      })
      continue
    }

    if (typeof row === 'number') {
      column = findColumnForFixedRow(
        occupancy,
        bounds,
        row,
        rowSpan,
        columnSpan
      )
    } else if (typeof column === 'number') {
      row = findRowForFixedColumn(
        occupancy,
        bounds,
        column,
        rowSpan,
        columnSpan
      )
    } else {
      const searchStartRow = autoFlowDense ? 0 : cursorRow
      const searchStartColumn = autoFlowDense ? 0 : cursorColumn
      const autoPlacement =
        autoFlowDirection === 'column'
          ? findAutoPlacementWithColumnFlow(
              occupancy,
              bounds,
              searchStartRow,
              searchStartColumn,
              rowSpan,
              columnSpan
            )
          : findAutoPlacementWithRowFlow(
              occupancy,
              bounds,
              searchStartRow,
              searchStartColumn,
              rowSpan,
              columnSpan
            )
      row = autoPlacement.row
      column = autoPlacement.column
      if (!autoFlowDense) {
        cursorRow = autoPlacement.nextCursorRow
        cursorColumn = autoPlacement.nextCursorColumn
      }
    }

    const resolvedRow = row || 0
    const resolvedColumn = column || 0
    ensureBoundsForPlacement(
      occupancy,
      bounds,
      resolvedRow,
      resolvedColumn,
      rowSpan,
      columnSpan
    )
    markOccupied(occupancy, resolvedRow, resolvedColumn, rowSpan, columnSpan)
    placements.push({
      rowIndex: resolvedRow,
      columnIndex: resolvedColumn,
      rowSpan,
      columnSpan,
    })
  }

  return {
    placements,
    rowCount: Math.max(bounds.rowCount, 1),
    columnCount: Math.max(bounds.columnCount, 1),
  }
}

function resolveTrackDefinitions(
  explicit: TrackDefinition[],
  totalCount: number,
  implicitPattern: TrackDefinition[]
): TrackDefinition[] {
  const tracks: TrackDefinition[] = []
  for (let i = 0; i < totalCount; i++) {
    if (i < explicit.length) {
      tracks.push(explicit[i])
      continue
    }

    if (implicitPattern.length) {
      tracks.push(
        implicitPattern[(i - explicit.length) % implicitPattern.length]
      )
      continue
    }

    tracks.push({ kind: 'auto' })
  }
  return tracks
}

function resolveTrackSizes(
  tracks: TrackDefinition[],
  axisLength: number | undefined,
  gap: number,
  fallbackTrackSize: number
): { sizes: number[]; total: number } {
  const sizes = new Array(tracks.length).fill(0)
  if (!tracks.length) {
    return { sizes: [], total: 0 }
  }

  if (typeof axisLength === 'number' && Number.isFinite(axisLength)) {
    let fixedTotal = 0
    let frTotal = 0

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i]
      if (track.kind === 'fixed') {
        sizes[i] = clampToNonNegative(track.value)
        fixedTotal += sizes[i]
      } else if (track.kind === 'percent') {
        sizes[i] = clampToNonNegative(axisLength * track.value)
        fixedTotal += sizes[i]
      } else if (track.kind === 'fr') {
        frTotal += track.value
      } else {
        frTotal += 1
      }
    }

    const totalGaps = Math.max(0, tracks.length - 1) * gap
    const remaining = Math.max(0, axisLength - fixedTotal - totalGaps)
    const frUnit = frTotal > 0 ? remaining / frTotal : 0
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i]
      if (track.kind === 'fr') {
        sizes[i] = clampToNonNegative(track.value * frUnit)
      } else if (track.kind === 'auto') {
        sizes[i] = clampToNonNegative(frUnit)
      }
    }

    return { sizes, total: axisLength }
  }

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i]
    if (track.kind === 'fixed') {
      sizes[i] = clampToNonNegative(track.value)
    } else if (track.kind === 'fr') {
      sizes[i] = clampToNonNegative(track.value * fallbackTrackSize)
    } else {
      sizes[i] = fallbackTrackSize
    }
  }

  const total =
    sizes.reduce((sum, size) => sum + size, 0) +
    Math.max(0, tracks.length - 1) * gap
  return { sizes, total }
}

function buildTrackPrefixSums(trackSizes: number[]): number[] {
  const prefix = [0]
  for (let i = 0; i < trackSizes.length; i++) {
    prefix.push(prefix[i] + trackSizes[i])
  }
  return prefix
}

function buildGridItemContentNode(
  child: ReactNode,
  index: number,
  resolvedChildStyle: Record<string, unknown> | undefined,
  stretchWidth: boolean,
  stretchHeight: boolean
): ReactNode {
  const styleForChild = sanitizeGridItemStyle(resolvedChildStyle)
  const shouldApplyStretchWidth =
    stretchWidth && !hasExplicitSize(styleForChild.width)
  const shouldApplyStretchHeight =
    stretchHeight && !hasExplicitSize(styleForChild.height)

  const stretchStyle: Record<string, unknown> = {}
  if (shouldApplyStretchWidth) stretchStyle.width = '100%'
  if (shouldApplyStretchHeight) stretchStyle.height = '100%'

  if (!isReactElement(child)) {
    if (!Object.keys(stretchStyle).length) return child

    return {
      type: 'div',
      key: `grid-anon-${index}`,
      props: {
        style: stretchStyle,
        children: child,
      },
    }
  }

  const childProps = child.props || {}
  const mergedStyle = {
    ...styleForChild,
    ...stretchStyle,
  }
  const { style: _style, tw: _tw, children, ...restProps } = childProps

  return {
    type: child.type,
    key: child.key,
    props: {
      ...restProps,
      style: mergedStyle,
      children,
    },
  }
}

function normalizeGridTemplateValue(value: unknown): unknown {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return
  const normalized = value.trim()
  if (!normalized || normalized.toLowerCase() === 'none') return
  return normalized
}

interface GridTrackCollections {
  explicitColumnTracks: TrackDefinition[]
  explicitRowTracks: TrackDefinition[]
  autoColumnTracks: TrackDefinition[]
  autoRowTracks: TrackDefinition[]
}

interface GridContainerMetrics {
  explicitWidth: number | undefined
  explicitHeight: number | undefined
  rowGap: number
  columnGap: number
}

interface GridTemplateAreaPlacement {
  row: AxisPlacement
  column: AxisPlacement
}

function parseTrackListFromStyle(
  style: Record<string, unknown> | undefined,
  keys: string[],
  baseFontSize: number
): TrackDefinition[] {
  return parseGridTrackList(
    normalizeGridTemplateValue(resolveStyleValue(style, keys)),
    baseFontSize
  )
}

function resolveGridTrackCollections(
  style: Record<string, unknown> | undefined,
  baseFontSize: number
): GridTrackCollections {
  return {
    explicitColumnTracks: parseTrackListFromStyle(
      style,
      GRID_TEMPLATE_COLUMN_KEYS,
      baseFontSize
    ),
    explicitRowTracks: parseTrackListFromStyle(
      style,
      GRID_TEMPLATE_ROW_KEYS,
      baseFontSize
    ),
    autoColumnTracks: parseTrackListFromStyle(
      style,
      GRID_AUTO_COLUMN_KEYS,
      baseFontSize
    ),
    autoRowTracks: parseTrackListFromStyle(
      style,
      GRID_AUTO_ROW_KEYS,
      baseFontSize
    ),
  }
}

function resolveGapValue(
  style: Record<string, unknown> | undefined,
  explicitAxisLength: number | undefined,
  baseFontSize: number,
  axis: 'row' | 'column'
): number {
  const axisGapRaw = resolveStyleValue(
    style,
    axis === 'row' ? GRID_ROW_GAP_KEYS : GRID_COLUMN_GAP_KEYS
  )
  const gapRaw = resolveStyleValue(style, GRID_GAP_KEYS)
  const gapToken =
    typeof axisGapRaw !== 'undefined'
      ? axisGapRaw
      : parseGapShorthand(gapRaw, axis)
  return clampToNonNegative(
    resolveLengthValue(gapToken, explicitAxisLength, baseFontSize, style) || 0
  )
}

function resolveGridContainerMetrics(
  style: Record<string, unknown> | undefined,
  baseFontSize: number
): GridContainerMetrics {
  const explicitWidth = resolveLengthValue(
    resolveStyleValue(style, ['width']),
    undefined,
    baseFontSize,
    style
  )
  const explicitHeight = resolveLengthValue(
    resolveStyleValue(style, ['height']),
    undefined,
    baseFontSize,
    style
  )

  return {
    explicitWidth,
    explicitHeight,
    rowGap: resolveGapValue(style, explicitHeight, baseFontSize, 'row'),
    columnGap: resolveGapValue(style, explicitWidth, baseFontSize, 'column'),
  }
}

function hasStyleValue(
  style: Record<string, unknown> | undefined,
  keys: string[]
): boolean {
  return typeof resolveStyleValue(style, keys) !== 'undefined'
}

function parseGridAreaShorthandPlacement(
  value: unknown,
  explicitRowTrackCount: number,
  explicitColumnTrackCount: number
): { row?: AxisPlacement; column?: AxisPlacement } {
  if (typeof value !== 'string') return {}

  const parts = value
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
  if (!parts.length || parts.length === 1) return {}

  const [rowStart, columnStart, rowEnd, columnEnd] = parts

  return {
    row: parseGridAxisPlacement(
      undefined,
      rowStart,
      rowEnd,
      explicitRowTrackCount
    ),
    column: parseGridAxisPlacement(
      undefined,
      columnStart,
      columnEnd,
      explicitColumnTrackCount
    ),
  }
}

function resolveNamedGridAreaPlacement(
  value: unknown,
  areaPlacements: Map<string, GridTemplateAreaPlacement>
): GridTemplateAreaPlacement | undefined {
  if (typeof value !== 'string') return
  const normalized = value.trim()
  if (!normalized || normalized.includes('/') || normalized === 'auto') return
  return areaPlacements.get(normalized)
}

function resolveGridItemPlacements(
  childStyle: Record<string, unknown> | undefined,
  explicitRowTrackCount: number,
  explicitColumnTrackCount: number,
  templateAreaPlacements: Map<string, GridTemplateAreaPlacement>
): { row: AxisPlacement; column: AxisPlacement } {
  const hasExplicitRowPlacement =
    hasStyleValue(childStyle, GRID_ROW_SHORTHAND_KEYS) ||
    hasStyleValue(childStyle, GRID_ROW_START_KEYS) ||
    hasStyleValue(childStyle, GRID_ROW_END_KEYS)
  const hasExplicitColumnPlacement =
    hasStyleValue(childStyle, GRID_COLUMN_SHORTHAND_KEYS) ||
    hasStyleValue(childStyle, GRID_COLUMN_START_KEYS) ||
    hasStyleValue(childStyle, GRID_COLUMN_END_KEYS)

  let row = parseGridAxisPlacement(
    resolveStyleValue(childStyle, GRID_ROW_SHORTHAND_KEYS),
    resolveStyleValue(childStyle, GRID_ROW_START_KEYS),
    resolveStyleValue(childStyle, GRID_ROW_END_KEYS),
    explicitRowTrackCount
  )
  let column = parseGridAxisPlacement(
    resolveStyleValue(childStyle, GRID_COLUMN_SHORTHAND_KEYS),
    resolveStyleValue(childStyle, GRID_COLUMN_START_KEYS),
    resolveStyleValue(childStyle, GRID_COLUMN_END_KEYS),
    explicitColumnTrackCount
  )

  const gridAreaValue = resolveStyleValue(childStyle, GRID_AREA_KEYS)
  const areaShorthand = parseGridAreaShorthandPlacement(
    gridAreaValue,
    explicitRowTrackCount,
    explicitColumnTrackCount
  )

  if (!hasExplicitRowPlacement && areaShorthand.row) {
    row = areaShorthand.row
  }
  if (!hasExplicitColumnPlacement && areaShorthand.column) {
    column = areaShorthand.column
  }

  const namedAreaPlacement = resolveNamedGridAreaPlacement(
    gridAreaValue,
    templateAreaPlacements
  )
  if (namedAreaPlacement) {
    if (!hasExplicitRowPlacement && !areaShorthand.row) {
      row = namedAreaPlacement.row
    }
    if (!hasExplicitColumnPlacement && !areaShorthand.column) {
      column = namedAreaPlacement.column
    }
  }

  return { row, column }
}

function buildGridItemDescriptors(
  children: ReactNode[],
  getTwStyles: TwStyleResolver,
  explicitRowTrackCount: number,
  explicitColumnTrackCount: number,
  templateAreaPlacements: Map<string, GridTemplateAreaPlacement>
): GridItemDescriptor[] {
  return children.map((child) => {
    const childStyle = resolveGridItemStyle(child, getTwStyles)
    const placements = resolveGridItemPlacements(
      childStyle,
      explicitRowTrackCount,
      explicitColumnTrackCount,
      templateAreaPlacements
    )
    return {
      child,
      childStyle,
      row: placements.row,
      column: placements.column,
    }
  })
}

function resolveTrackOffset(
  prefix: number[],
  trackIndex: number,
  gap: number
): number {
  return prefix[trackIndex] + trackIndex * gap
}

function resolveTrackSpanSize(
  prefix: number[],
  trackIndex: number,
  span: number,
  gap: number
): number {
  return (
    prefix[trackIndex + span] - prefix[trackIndex] + Math.max(0, span - 1) * gap
  )
}

export function convertGridElement(
  element: ReactNode,
  style: Record<string, unknown> | undefined,
  children: ReactNode,
  getTwStyles: TwStyleResolver
): ReactNode | null {
  if (!isReactElement(element)) return null
  if (!isGridContainerElement(style)) return null

  const normalizedChildren = normalizeChildren(children)
  if (!normalizedChildren.length) return null

  const baseFontSize = resolveBaseFontSize(style)
  const {
    explicitColumnTracks,
    explicitRowTracks,
    autoColumnTracks,
    autoRowTracks,
  } = resolveGridTrackCollections(style, baseFontSize)
  const templateRows = parseGridTemplateAreas(
    normalizeGridTemplateValue(
      resolveStyleValue(style, GRID_TEMPLATE_AREA_KEYS)
    )
  )
  const templateAreaPlacements = resolveTemplateAreaPlacements(templateRows)
  const templateColumnCount = templateRows[0]?.length || 0
  const templateRowCount = templateRows.length
  const explicitColumnCount = Math.max(
    explicitColumnTracks.length,
    templateColumnCount,
    1
  )
  const explicitRowCount = Math.max(
    explicitRowTracks.length,
    templateRowCount,
    1
  )
  const { explicitWidth, explicitHeight, rowGap, columnGap } =
    resolveGridContainerMetrics(style, baseFontSize)
  const autoFlow = resolveGridAutoFlow(style)

  const items = buildGridItemDescriptors(
    normalizedChildren,
    getTwStyles,
    explicitRowCount,
    explicitColumnCount,
    templateAreaPlacements
  )

  const placement = placeGridItems(
    items,
    explicitRowCount,
    explicitColumnCount,
    autoFlow.direction,
    autoFlow.dense
  )

  const columnTracks = resolveTrackDefinitions(
    explicitColumnTracks,
    placement.columnCount,
    autoColumnTracks
  )
  const rowTracks = resolveTrackDefinitions(
    explicitRowTracks,
    placement.rowCount,
    autoRowTracks
  )

  const resolvedColumns = resolveTrackSizes(
    columnTracks,
    explicitWidth,
    columnGap,
    80
  )
  const resolvedRows = resolveTrackSizes(rowTracks, explicitHeight, rowGap, 40)
  const columnPrefix = buildTrackPrefixSums(resolvedColumns.sizes)
  const rowPrefix = buildTrackPrefixSums(resolvedRows.sizes)
  const { alignItems, justifyItems } = resolveContainerAlignment(style)

  const convertedChildren = placement.placements.map((cellPlacement, index) => {
    const descriptor = items[index]
    const left = resolveTrackOffset(
      columnPrefix,
      cellPlacement.columnIndex,
      columnGap
    )
    const top = resolveTrackOffset(rowPrefix, cellPlacement.rowIndex, rowGap)
    const width = resolveTrackSpanSize(
      columnPrefix,
      cellPlacement.columnIndex,
      cellPlacement.columnSpan,
      columnGap
    )
    const height = resolveTrackSpanSize(
      rowPrefix,
      cellPlacement.rowIndex,
      cellPlacement.rowSpan,
      rowGap
    )

    const itemAlignment = resolveEffectiveItemAlignment(
      descriptor.childStyle,
      alignItems,
      justifyItems
    )
    const normalizedAlign =
      normalizeAlignmentToken(itemAlignment.align) || 'stretch'
    const normalizedJustify =
      normalizeAlignmentToken(itemAlignment.justify) || 'stretch'

    const childNode = buildGridItemContentNode(
      descriptor.child,
      index,
      descriptor.childStyle,
      normalizedJustify === 'stretch',
      normalizedAlign === 'stretch'
    )

    return {
      type: 'div',
      key:
        (isReactElement(descriptor.child) ? descriptor.child.key : undefined) ??
        `grid-item-${index}`,
      props: {
        style: {
          position: 'absolute',
          left: toRounded(left),
          top: toRounded(top),
          width: toRounded(width),
          height: toRounded(height),
          display: 'flex',
          justifyContent: mapGridAlignmentToFlex(normalizedJustify),
          alignItems: mapGridAlignmentToFlex(normalizedAlign),
          boxSizing: 'border-box',
        },
        children: childNode,
      },
    }
  })

  const gridStyle = { ...(style || {}) }
  const normalizedPosition = normalizePositionValue(gridStyle.position)
  if (typeof normalizedPosition === 'string') {
    gridStyle.position = normalizedPosition
  }
  if (!gridStyle.position || gridStyle.position === 'static') {
    gridStyle.position = 'relative'
  }
  gridStyle.display = 'flex'
  if (typeof gridStyle.width === 'undefined') {
    gridStyle.width = toRounded(resolvedColumns.total)
  }
  if (typeof gridStyle.height === 'undefined') {
    gridStyle.height = toRounded(resolvedRows.total)
  }

  const elementProps = element.props || {}
  const {
    style: _style,
    tw: _tw,
    children: _children,
    ...restProps
  } = elementProps

  return {
    type: 'div',
    key: element.key,
    props: {
      ...restProps,
      style: gridStyle,
      children: convertedChildren,
    },
  }
}
