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
  rowIndex: number
  columnIndex: number
}

interface GridPlacementResult {
  rowIndex: number
  columnIndex: number
  rowSpan: number
  columnSpan: number
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

function clampToNonNegative(value: number): number {
  return value < 0 ? 0 : value
}

function toRounded(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 10000) / 10000
}

function parsePositiveIntegerToken(token: string): number | undefined {
  const parsed = Number.parseInt(token, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return
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

  const line = Number.parseInt(normalized, 10)
  if (Number.isFinite(line) && line > 0) {
    return { line }
  }

  return {}
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
  explicitEnd: unknown
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

  let startLine = startToken.line
  let span = startToken.span || endToken.span || 1
  if (startLine && endToken.line) {
    span = Math.max(1, endToken.line - startLine)
  } else if (!startLine && endToken.line) {
    startLine = Math.max(1, endToken.line - span)
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

function placeGridItems(
  items: GridItemDescriptor[],
  explicitRowCount: number,
  explicitColumnCount: number
): {
  placements: GridPlacementResult[]
  rowCount: number
  columnCount: number
} {
  const occupancy: boolean[][] = []
  let rowCount = Math.max(1, explicitRowCount)
  let columnCount = Math.max(1, explicitColumnCount)
  let cursorRow = 0
  let cursorColumn = 0
  const placements: GridPlacementResult[] = []

  ensureGridRows(occupancy, rowCount)

  for (const item of items) {
    const rowSpan = item.row.span
    const columnSpan = item.column.span
    let row = item.row.start
    let column = item.column.start

    if (typeof column === 'number' && column + columnSpan > columnCount) {
      columnCount = column + columnSpan
    }
    if (typeof row === 'number' && row + rowSpan > rowCount) {
      rowCount = row + rowSpan
      ensureGridRows(occupancy, rowCount)
    }

    if (typeof row === 'number' && typeof column === 'number') {
      // Explicit row/column placements can overlap in CSS Grid. We keep the
      // requested position deterministic without re-flow.
      if (column + columnSpan > columnCount) {
        columnCount = column + columnSpan
      }
      if (row + rowSpan > rowCount) {
        rowCount = row + rowSpan
        ensureGridRows(occupancy, rowCount)
      }
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
      let searchColumn = 0
      for (;;) {
        if (searchColumn + columnSpan > columnCount) {
          columnCount = searchColumn + columnSpan
        }
        if (canPlace(occupancy, row, searchColumn, rowSpan, columnSpan)) {
          column = searchColumn
          break
        }
        searchColumn++
      }
    } else if (typeof column === 'number') {
      let searchRow = 0
      for (;;) {
        if (searchRow + rowSpan > rowCount) {
          rowCount = searchRow + rowSpan
          ensureGridRows(occupancy, rowCount)
        }
        if (canPlace(occupancy, searchRow, column, rowSpan, columnSpan)) {
          row = searchRow
          break
        }
        searchRow++
      }
    } else {
      let searchRow = cursorRow
      let searchColumn = cursorColumn

      for (;;) {
        if (searchColumn + columnSpan > columnCount) {
          searchRow++
          searchColumn = 0
          if (searchRow + rowSpan > rowCount) {
            rowCount = searchRow + rowSpan
            ensureGridRows(occupancy, rowCount)
          }
          continue
        }

        if (canPlace(occupancy, searchRow, searchColumn, rowSpan, columnSpan)) {
          row = searchRow
          column = searchColumn
          break
        }

        searchColumn++
      }

      cursorRow = row
      cursorColumn = (column || 0) + columnSpan
      if (cursorColumn >= columnCount) {
        cursorRow++
        cursorColumn = 0
      }
    }

    const resolvedRow = row || 0
    const resolvedColumn = column || 0
    if (resolvedColumn + columnSpan > columnCount) {
      columnCount = resolvedColumn + columnSpan
    }
    if (resolvedRow + rowSpan > rowCount) {
      rowCount = resolvedRow + rowSpan
      ensureGridRows(occupancy, rowCount)
    }
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
    rowCount: Math.max(rowCount, 1),
    columnCount: Math.max(columnCount, 1),
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

export function convertGridElement(
  element: ReactNode,
  type: string,
  style: Record<string, unknown> | undefined,
  children: ReactNode,
  getTwStyles: TwStyleResolver
): ReactNode | null {
  if (!isReactElement(element)) return null
  if (!isGridContainerElement(style)) return null

  const normalizedChildren = normalizeChildren(children)
  if (!normalizedChildren.length) return null

  const baseFontSize = resolveBaseFontSize(style)
  const explicitColumnTracks = parseGridTrackList(
    normalizeGridTemplateValue(
      resolveStyleValue(style, ['gridTemplateColumns', 'grid-template-columns'])
    ),
    baseFontSize
  )
  const explicitRowTracks = parseGridTrackList(
    normalizeGridTemplateValue(
      resolveStyleValue(style, ['gridTemplateRows', 'grid-template-rows'])
    ),
    baseFontSize
  )
  const autoColumnTracks = parseGridTrackList(
    normalizeGridTemplateValue(
      resolveStyleValue(style, ['gridAutoColumns', 'grid-auto-columns'])
    ),
    baseFontSize
  )
  const autoRowTracks = parseGridTrackList(
    normalizeGridTemplateValue(
      resolveStyleValue(style, ['gridAutoRows', 'grid-auto-rows'])
    ),
    baseFontSize
  )

  const widthValue = resolveStyleValue(style, ['width'])
  const heightValue = resolveStyleValue(style, ['height'])
  const explicitWidth = resolveLengthValue(
    widthValue,
    undefined,
    baseFontSize,
    style
  )
  const explicitHeight = resolveLengthValue(
    heightValue,
    undefined,
    baseFontSize,
    style
  )

  const rowGapRaw = resolveStyleValue(style, ['rowGap', 'row-gap'])
  const columnGapRaw = resolveStyleValue(style, ['columnGap', 'column-gap'])
  const gapRaw = resolveStyleValue(style, ['gap'])
  const rowGap = clampToNonNegative(
    resolveLengthValue(
      typeof rowGapRaw !== 'undefined'
        ? rowGapRaw
        : parseGapShorthand(gapRaw, 'row'),
      explicitHeight,
      baseFontSize,
      style
    ) || 0
  )
  const columnGap = clampToNonNegative(
    resolveLengthValue(
      typeof columnGapRaw !== 'undefined'
        ? columnGapRaw
        : parseGapShorthand(gapRaw, 'column'),
      explicitWidth,
      baseFontSize,
      style
    ) || 0
  )

  const items: GridItemDescriptor[] = normalizedChildren.map((child) => {
    const childStyle = resolveGridItemStyle(child, getTwStyles)
    const rowPlacement = parseGridAxisPlacement(
      resolveStyleValue(childStyle, ['gridRow', 'grid-row']),
      resolveStyleValue(childStyle, ['gridRowStart', 'grid-row-start']),
      resolveStyleValue(childStyle, ['gridRowEnd', 'grid-row-end'])
    )
    const columnPlacement = parseGridAxisPlacement(
      resolveStyleValue(childStyle, ['gridColumn', 'grid-column']),
      resolveStyleValue(childStyle, ['gridColumnStart', 'grid-column-start']),
      resolveStyleValue(childStyle, ['gridColumnEnd', 'grid-column-end'])
    )

    return {
      child,
      childStyle,
      row: rowPlacement,
      column: columnPlacement,
      rowIndex: 0,
      columnIndex: 0,
    }
  })

  const placement = placeGridItems(
    items,
    explicitRowTracks.length || 1,
    explicitColumnTracks.length || 1
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
    const left =
      columnPrefix[cellPlacement.columnIndex] +
      cellPlacement.columnIndex * columnGap
    const top =
      rowPrefix[cellPlacement.rowIndex] + cellPlacement.rowIndex * rowGap
    const width =
      columnPrefix[cellPlacement.columnIndex + cellPlacement.columnSpan] -
      columnPrefix[cellPlacement.columnIndex] +
      Math.max(0, cellPlacement.columnSpan - 1) * columnGap
    const height =
      rowPrefix[cellPlacement.rowIndex + cellPlacement.rowSpan] -
      rowPrefix[cellPlacement.rowIndex] +
      Math.max(0, cellPlacement.rowSpan - 1) * rowGap

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
