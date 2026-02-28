import type { ReactNode } from 'react'

import { isReactElement, normalizeChildren } from './utils.js'
import { normalizeDisplayValue } from './handler/display.js'
import { normalizePositionValue } from './handler/position.js'
import { resolveElementStyle, type TwStyleResolver } from './element-style.js'
import { parseFiniteNumber } from './style-number.js'

interface TableCellPlacement {
  cell: ReactNode
  row: number
  column: number
  rowSpan: number
  colSpan: number
}

const TABLE_CONTAINER_DISPLAYS = new Set(['table', 'inline-table'])
const TABLE_ROW_GROUP_DISPLAYS = new Set([
  'table-row-group',
  'table-header-group',
  'table-footer-group',
])

function parseTableSpanValue(value: unknown): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) return Number.NaN
    return value
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return Number.NaN
    return Number.parseInt(trimmed, 10)
  }

  return Number.NaN
}

function parseTableColSpan(value: unknown): number {
  const parsed = parseTableSpanValue(value)

  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return Math.floor(parsed)
}

function parseTableRowSpan(
  value: unknown,
  rowIndex: number,
  totalRows: number
): number {
  const parsed = parseTableSpanValue(value)

  if (!Number.isFinite(parsed) || parsed < 0) return 1
  if (parsed === 0) return Math.max(1, totalRows - rowIndex)
  return Math.floor(parsed)
}

function parseTableSpan(value: unknown): number {
  const parsed = parseTableSpanValue(value)

  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return Math.floor(parsed)
}

function collectColumnWidths(
  children: ReactNode,
  getTwStyles: TwStyleResolver
): number[] {
  const columns: number[] = []
  let cursor = 0

  const normalizeColumnsFromElement = (
    element: ReactNode,
    inheritedSpan = 1
  ) => {
    if (!isReactElement(element) || typeof element.type !== 'string') return

    if (element.type === 'col') {
      const colProps = element.props || {}
      const colStyle = resolveElementStyle(element, getTwStyles)
      const width = parseFiniteNumber(colStyle?.width)
      const span = parseTableSpan(colProps.span)

      for (let index = 0; index < span * inheritedSpan; index++) {
        if (!Number.isFinite(width) || width <= 0) continue
        const targetIndex = cursor + index
        columns[targetIndex] = Math.max(columns[targetIndex] || 0, width)
      }

      cursor += span * inheritedSpan
      return
    }

    if (element.type === 'colgroup') {
      const groupSpan = parseTableSpan(
        element.props?.span || element.props?.colspan
      )
      const normalizedGroupSpan = groupSpan * inheritedSpan

      let start = cursor
      for (const groupChild of normalizeChildren(element.props?.children)) {
        normalizeColumnsFromElement(groupChild, normalizedGroupSpan)
      }
      if (cursor === start) {
        cursor += normalizedGroupSpan
      }
    }
  }

  for (const child of normalizeChildren(children)) {
    if (!isReactElement(child) || typeof child.type !== 'string') continue

    if (child.type === 'col' || child.type === 'colgroup') {
      normalizeColumnsFromElement(child)
      continue
    }

    if (isTableRowElement(child, getTwStyles)) {
      break
    }
  }

  return columns
}

function isTableContainerElement(
  type: string,
  style: Record<string, unknown> | undefined
): boolean {
  if (type === 'table') return true
  return TABLE_CONTAINER_DISPLAYS.has(normalizeDisplayValue(style?.display))
}

function isTableRowElement(
  child: ReactNode,
  getTwStyles: TwStyleResolver
): boolean {
  if (!isReactElement(child) || typeof child.type !== 'string') return false

  if (child.type === 'tr') return true

  const childStyle = resolveElementStyle(child, getTwStyles)
  return normalizeDisplayValue(childStyle?.display) === 'table-row'
}

function isTableRowGroupElement(
  child: ReactNode,
  getTwStyles: TwStyleResolver
): boolean {
  if (!isReactElement(child) || typeof child.type !== 'string') return false

  if (
    child.type === 'thead' ||
    child.type === 'tbody' ||
    child.type === 'tfoot'
  ) {
    return true
  }

  const childStyle = resolveElementStyle(child, getTwStyles)
  return TABLE_ROW_GROUP_DISPLAYS.has(
    normalizeDisplayValue(childStyle?.display)
  )
}

function isTableCellElement(
  child: ReactNode,
  getTwStyles: TwStyleResolver
): boolean {
  if (!isReactElement(child) || typeof child.type !== 'string') return false

  if (child.type === 'td' || child.type === 'th') return true

  const childStyle = resolveElementStyle(child, getTwStyles)
  return normalizeDisplayValue(childStyle?.display) === 'table-cell'
}

function collectTableRows(
  children: ReactNode,
  getTwStyles: TwStyleResolver
): ReactNode[] {
  const rows: ReactNode[] = []
  for (const child of normalizeChildren(children)) {
    if (isTableRowElement(child, getTwStyles)) {
      rows.push(child)
      continue
    }

    if (!isReactElement(child) || !isTableRowGroupElement(child, getTwStyles)) {
      continue
    }

    for (const groupChild of normalizeChildren(child.props?.children)) {
      if (isTableRowElement(groupChild, getTwStyles)) {
        rows.push(groupChild)
      }
    }
  }
  return rows
}

function buildTableMatrix(
  rows: ReactNode[],
  getTwStyles: TwStyleResolver,
  initialColumnWidths: number[] = []
): {
  placements: TableCellPlacement[]
  columnCount: number
  rowCount: number
  columnWidths: number[]
  rowHeights: number[]
  cellGrid: number[][]
} | null {
  const placements: TableCellPlacement[] = []
  const occupied: boolean[][] = []
  let columnCount = 0
  const totalRows = rows.length
  const columnWidths: number[] = [...initialColumnWidths]
  const rowHeights: number[] = []

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]
    if (!isReactElement(row)) continue

    const rowChildren = normalizeChildren(row.props?.children)
    const cells = rowChildren.filter((child) =>
      isTableCellElement(child, getTwStyles)
    )
    if (cells.length === 0) continue

    occupied[rowIndex] ||= []
    let columnIndex = 0

    for (const cell of cells) {
      while (occupied[rowIndex][columnIndex]) {
        columnIndex++
      }

      if (!isReactElement(cell)) continue
      const cellProps = cell.props || {}
      const cellStyle = resolveElementStyle(cell, getTwStyles)
      const explicitWidth = parseFiniteNumber(cellStyle?.width)
      const explicitHeight = parseFiniteNumber(cellStyle?.height)
      const rowSpan = parseTableRowSpan(
        cellProps.rowSpan ?? cellProps.rowspan,
        rowIndex,
        totalRows
      )
      const colSpan = parseTableColSpan(cellProps.colSpan ?? cellProps.colspan)

      placements.push({
        cell,
        row: rowIndex,
        column: columnIndex,
        rowSpan,
        colSpan,
      })

      for (let r = rowIndex; r < rowIndex + rowSpan; r++) {
        occupied[r] ||= []
        for (let c = columnIndex; c < columnIndex + colSpan; c++) {
          occupied[r][c] = true
        }
      }

      if (explicitWidth > 0 && colSpan > 0) {
        const widthPerCol = explicitWidth / colSpan
        for (let c = columnIndex; c < columnIndex + colSpan; c++) {
          columnWidths[c] = Math.max(columnWidths[c] || 0, widthPerCol)
        }
      }

      if (explicitHeight > 0 && rowSpan > 0) {
        const heightPerRow = explicitHeight / rowSpan
        for (let r = rowIndex; r < rowIndex + rowSpan; r++) {
          rowHeights[r] = Math.max(rowHeights[r] || 0, heightPerRow)
        }
      }

      columnIndex += colSpan
    }

    columnCount = Math.max(columnCount, occupied[rowIndex].length)
  }

  if (placements.length === 0 || columnCount === 0) {
    return null
  }

  let rowCount = Math.max(
    occupied.length,
    ...placements.map((placement) => placement.row + placement.rowSpan)
  )
  if (!Number.isFinite(rowCount) || rowCount <= 0) return null

  for (const placement of placements) {
    rowCount = Math.max(rowCount, placement.row + placement.rowSpan)
  }

  const cellGrid: number[][] = []
  for (let index = 0; index < placements.length; index++) {
    const placement = placements[index]
    for (
      let row = placement.row;
      row < placement.row + placement.rowSpan;
      row++
    ) {
      cellGrid[row] ||= []
      for (
        let column = placement.column;
        column < placement.column + placement.colSpan;
        column++
      ) {
        cellGrid[row][column] = index
      }
    }
  }

  return {
    placements,
    columnCount,
    rowCount,
    columnWidths,
    rowHeights,
    cellGrid,
  }
}

function setZeroBorder(
  style: Record<string, unknown>,
  side: 'Top' | 'Right' | 'Bottom' | 'Left'
) {
  style[`border${side}Width`] = 0
  style[`border${side}Style`] = 'none'
}

interface BorderDescriptor {
  width: number
  style: string
  color: string
}

interface BorderCandidate {
  width: number
  style: string
  color: string
  source: 'table-top' | 'table-right' | 'table-bottom' | 'table-left' | 'cell'
}

const BORDER_STYLE_PRECEDENCE: Record<string, number> = {
  hidden: 100,
  double: 90,
  solid: 80,
  dashed: 70,
  dotted: 60,
  ridge: 50,
  inset: 40,
  outset: 30,
  groove: 20,
  none: -1,
}

function toBorderDescriptor(
  style: Record<string, unknown> | undefined,
  side: 'Top' | 'Right' | 'Bottom' | 'Left'
): BorderDescriptor {
  const widthKey = `border${side}Width` as const
  const styleKey = `border${side}Style` as const
  const colorKey = `border${side}Color` as const
  const globalWidthKey = 'borderWidth' as const
  const globalStyleKey = 'borderStyle' as const
  const globalColorKey = 'borderColor' as const
  const shorthandKey = `border${side}` as const

  const parseBorderWidth = (value: unknown): number => {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value !== 'string') return Number.NaN
    const match = value.trim().match(/-?\d*\.?\d+/)
    if (!match) return Number.NaN
    return Number(match[0])
  }

  let width = parseBorderWidth(style?.[widthKey])
  if (!Number.isFinite(width)) {
    width = parseBorderWidth(style?.[globalWidthKey])
  }

  let borderStyle = String(
    (typeof style?.[styleKey] === 'string' && style?.[styleKey]) ||
      (typeof style?.[globalStyleKey] === 'string' &&
        style?.[globalStyleKey]) ||
      ''
  )
    .toLowerCase()
    .trim()

  let color = String(
    (typeof style?.[colorKey] === 'string' && style?.[colorKey]) ||
      (typeof style?.[globalColorKey] === 'string' &&
        style?.[globalColorKey]) ||
      ''
  ).trim()

  const shorthand = String(style?.[shorthandKey] || style?.border || '')
    .trim()
    .toLowerCase()
  if (shorthand) {
    const parts = shorthand.split(/\s+/)
    const parsedWidth = parts
      .map((part) => parseBorderWidth(part))
      .find((partWidth) => Number.isFinite(partWidth) && partWidth > 0)

    if (!Number.isFinite(width) && Number.isFinite(parsedWidth)) {
      width = parsedWidth
    }

    if (!borderStyle) {
      for (const part of parts) {
        if (BORDER_STYLE_PRECEDENCE[part] !== undefined) {
          borderStyle = part
          break
        }
      }
    }

    if (!color) {
      for (const part of parts) {
        if (
          part === borderStyle ||
          part === `${width}` ||
          part === `${width}px` ||
          Number.isFinite(Number(part))
        ) {
          continue
        }

        color = part
        break
      }
    }
  }

  if (!borderStyle || borderStyle === 'none') {
    if (!Number.isFinite(width) || width <= 0) {
      return { width: 0, style: 'none', color: color || 'black' }
    }
    return { width, style: 'solid', color: color || 'black' }
  }

  if (!Number.isFinite(width) || width < 0) {
    width = 0
  }

  return {
    width,
    style: borderStyle,
    color: color || 'black',
  }
}

function compareBorderDescriptors(
  a: BorderDescriptor,
  b: BorderDescriptor
): number {
  if (a.style === 'hidden') return 1
  if (b.style === 'hidden') return -1

  if (a.width !== b.width) {
    return a.width > b.width ? 1 : -1
  }

  const aStylePriority = BORDER_STYLE_PRECEDENCE[a.style] ?? 0
  const bStylePriority = BORDER_STYLE_PRECEDENCE[b.style] ?? 0
  if (aStylePriority !== bStylePriority) {
    return aStylePriority > bStylePriority ? 1 : -1
  }

  return 0
}

function pickBorderCandidate(
  candidates: BorderCandidate[],
  preferredSourcePriority: Array<BorderCandidate['source']>
): BorderCandidate | undefined {
  const active = candidates.filter(
    (candidate) => candidate.width > 0 && candidate.style !== 'none'
  )
  if (active.length === 0) return

  let winner = active[0]

  for (const candidate of active.slice(1)) {
    const comparison = compareBorderDescriptors(candidate, winner)
    if (comparison > 0) {
      winner = candidate
      continue
    }

    if (comparison === 0) {
      const candidatePriority = preferredSourcePriority.indexOf(
        candidate.source
      )
      const winnerPriority = preferredSourcePriority.indexOf(winner.source)
      if (winnerPriority < 0 || candidatePriority < winnerPriority) {
        winner = candidate
      }
    }
  }

  return winner
}

function hasCellBorderOnSide(
  style: Record<string, unknown> | undefined,
  side: 'Top' | 'Right' | 'Bottom' | 'Left'
): boolean {
  const widthKey = `border${side}Width` as const
  const styleKey = `border${side}Style` as const
  const width = parseFiniteNumber(style?.[widthKey])
  if (typeof width === 'number' && width > 0) {
    return true
  }

  const explicitStyle = String(style?.[styleKey] || '')
    .toLowerCase()
    .trim()
  if (explicitStyle && explicitStyle !== 'none' && explicitStyle !== 'hidden') {
    return true
  }

  const borderShorthand = String(style?.border || '')
    .trim()
    .toLowerCase()
  if (!borderShorthand || borderShorthand === 'none') return false
  const firstBorderPart = borderShorthand.split(/\s+/)[0]
  const shorthandWidth = parseFiniteNumber(firstBorderPart)
  if (typeof shorthandWidth === 'number' && shorthandWidth >= 0) {
    return shorthandWidth > 0
  }

  return explicitStyle !== 'hidden'
}

function hasFullHorizontalNeighbor(
  tableCellGrid: number[][],
  placement: TableCellPlacement,
  row: number
) {
  if (row < 0 || row >= tableCellGrid.length) return false

  for (
    let column = placement.column;
    column < placement.column + placement.colSpan;
    column++
  ) {
    if (typeof tableCellGrid[row]?.[column] !== 'number') return false
  }

  return true
}

function hasFullVerticalNeighbor(
  tableCellGrid: number[][],
  placement: TableCellPlacement,
  column: number
) {
  if (column < 0 || column >= placement.column + placement.colSpan) return false
  const maxColumn = placement.column + placement.colSpan
  if (maxColumn <= 0) return false

  for (
    let row = placement.row;
    row < placement.row + placement.rowSpan;
    row++
  ) {
    if (typeof tableCellGrid[row]?.[column] !== 'number') return false
  }

  return true
}

function resolveTrackSizes(values: number[], fallback: number, count: number) {
  const result = new Array(count).fill(fallback)
  for (let i = 0; i < count; i++) {
    if (typeof values[i] === 'number' && values[i] > 0) {
      result[i] = values[i]
    }
  }
  return result
}

function sumRange(values: number[], start: number, end: number) {
  let total = 0
  for (let i = start; i < end; i++) {
    total += values[i]
  }
  return total
}

export function convertTableElement(
  element: ReactNode,
  type: string,
  style: Record<string, unknown> | undefined,
  children: ReactNode,
  getTwStyles: TwStyleResolver
): ReactNode | null {
  if (!isTableContainerElement(type, style)) return null
  if (!isReactElement(element)) return null

  const rows = collectTableRows(children, getTwStyles)
  if (rows.length === 0) return null

  const matrix = buildTableMatrix(
    rows,
    getTwStyles,
    collectColumnWidths(children, getTwStyles)
  )
  if (!matrix) return null

  const tableStyle = { ...(style || {}) }
  const normalizedPosition = normalizePositionValue(tableStyle.position)
  if (typeof normalizedPosition === 'string') {
    tableStyle.position = normalizedPosition
  }
  if (!tableStyle.position || tableStyle.position === 'static') {
    tableStyle.position = 'relative'
  }
  const isBorderCollapsed =
    typeof tableStyle.borderCollapse === 'string' &&
    tableStyle.borderCollapse.trim().toLowerCase() === 'collapse'

  tableStyle.display = 'flex'
  const columnSizes = resolveTrackSizes(
    matrix.columnWidths,
    80,
    matrix.columnCount
  )
  const rowSizes = resolveTrackSizes(matrix.rowHeights, 40, matrix.rowCount)
  const totalInferredWidth = columnSizes.reduce((sum, value) => sum + value, 0)
  const totalInferredHeight = rowSizes.reduce((sum, value) => sum + value, 0)

  if (typeof tableStyle.width === 'undefined') {
    tableStyle.width = totalInferredWidth
  }
  if (typeof tableStyle.height === 'undefined') {
    tableStyle.height = totalInferredHeight
  }

  const placementStyles = matrix.placements.map(
    (placement) => resolveElementStyle(placement.cell, getTwStyles) || {}
  )

  if (isBorderCollapsed) {
    const tableStyleSides = {
      top: { hasBorder: false, hasGap: false },
      right: { hasBorder: false, hasGap: false },
      bottom: { hasBorder: false, hasGap: false },
      left: { hasBorder: false, hasGap: false },
    }

    for (let index = 0; index < matrix.placements.length; index++) {
      const placement = matrix.placements[index]
      const placementStyle = placementStyles[index]
      if (placement.row === 0) {
        if (hasCellBorderOnSide(placementStyle, 'Top')) {
          tableStyleSides.top.hasBorder = true
        } else {
          tableStyleSides.top.hasGap = true
        }
      }

      if (placement.row + placement.rowSpan === matrix.rowCount) {
        if (hasCellBorderOnSide(placementStyle, 'Bottom')) {
          tableStyleSides.bottom.hasBorder = true
        } else {
          tableStyleSides.bottom.hasGap = true
        }
      }

      if (placement.column === 0) {
        if (hasCellBorderOnSide(placementStyle, 'Left')) {
          tableStyleSides.left.hasBorder = true
        } else {
          tableStyleSides.left.hasGap = true
        }
      }

      if (placement.column + placement.colSpan === matrix.columnCount) {
        if (hasCellBorderOnSide(placementStyle, 'Right')) {
          tableStyleSides.right.hasBorder = true
        } else {
          tableStyleSides.right.hasGap = true
        }
      }
    }

    if (tableStyleSides.top.hasBorder && !tableStyleSides.top.hasGap) {
      setZeroBorder(tableStyle, 'Top')
    }
    if (tableStyleSides.right.hasBorder && !tableStyleSides.right.hasGap) {
      setZeroBorder(tableStyle, 'Right')
    }
    if (tableStyleSides.bottom.hasBorder && !tableStyleSides.bottom.hasGap) {
      setZeroBorder(tableStyle, 'Bottom')
    }
    if (tableStyleSides.left.hasBorder && !tableStyleSides.left.hasGap) {
      setZeroBorder(tableStyle, 'Left')
    }
  }

  const tableLefts = [0]
  for (const size of columnSizes) {
    tableLefts.push(tableLefts[tableLefts.length - 1] + size)
  }

  const tableTops = [0]
  for (const size of rowSizes) {
    tableTops.push(tableTops[tableTops.length - 1] + size)
  }

  const collapsedBorders: ReactNode[] = []
  if (isBorderCollapsed) {
    for (let row = 0; row <= matrix.rowCount; row++) {
      for (let column = 0; column < matrix.columnCount; column++) {
        const topCandidateIndex =
          row > 0 ? matrix.cellGrid[row - 1]?.[column] : undefined
        const bottomCandidateIndex =
          row < matrix.rowCount ? matrix.cellGrid[row]?.[column] : undefined

        const candidates: BorderCandidate[] = []

        if (
          typeof topCandidateIndex === 'number' &&
          placementStyles[topCandidateIndex] &&
          matrix.placements[topCandidateIndex]?.row +
            matrix.placements[topCandidateIndex].rowSpan ===
            row
        ) {
          const topDescriptor = toBorderDescriptor(
            placementStyles[topCandidateIndex],
            'Bottom'
          )
          candidates.push({ ...topDescriptor, source: 'cell' })
        }

        if (
          typeof bottomCandidateIndex === 'number' &&
          placementStyles[bottomCandidateIndex] &&
          matrix.placements[bottomCandidateIndex]?.row === row
        ) {
          const bottomDescriptor = toBorderDescriptor(
            placementStyles[bottomCandidateIndex],
            'Top'
          )
          candidates.push({ ...bottomDescriptor, source: 'cell' })
        }

        const candidateSources: Array<BorderCandidate['source']> = ['cell']

        const hasCellCandidate = candidates.some(
          (candidate) => candidate.source === 'cell'
        )
        if (row === 0 && !hasCellCandidate) {
          candidates.push({
            ...toBorderDescriptor(tableStyle, 'Top'),
            source: 'table-top',
          })
          candidateSources.push('table-top')
        }
        if (row === matrix.rowCount && !hasCellCandidate) {
          candidates.push({
            ...toBorderDescriptor(tableStyle, 'Bottom'),
            source: 'table-bottom',
          })
          candidateSources.push('table-bottom')
        }

        const winner = pickBorderCandidate(candidates, candidateSources)
        if (!winner || winner.width <= 0 || winner.style === 'none') {
          continue
        }

        const x = tableLefts[column]
        const segmentWidth = tableLefts[column + 1] - tableLefts[column]
        const y = tableTops[row]
        collapsedBorders.push({
          type: 'div',
          key: `table-border-h-${row}-${column}`,
          props: {
            style: {
              position: 'absolute',
              left: `${(x / totalInferredWidth) * 100}%`,
              top: `${(y / totalInferredHeight) * 100}%`,
              width: `${(segmentWidth / totalInferredWidth) * 100}%`,
              height: 0,
              borderTopWidth: winner.width,
              borderTopStyle: winner.style,
              borderTopColor: winner.color,
              pointerEvents: 'none',
            },
          },
        })
      }
    }

    for (let column = 0; column <= matrix.columnCount; column++) {
      for (let row = 0; row < matrix.rowCount; row++) {
        const leftCandidateIndex =
          column > 0 ? matrix.cellGrid[row]?.[column - 1] : undefined
        const rightCandidateIndex =
          column < matrix.columnCount
            ? matrix.cellGrid[row]?.[column]
            : undefined

        const candidates: BorderCandidate[] = []

        if (
          typeof leftCandidateIndex === 'number' &&
          placementStyles[leftCandidateIndex] &&
          matrix.placements[leftCandidateIndex]?.column +
            matrix.placements[leftCandidateIndex].colSpan ===
            column
        ) {
          const leftDescriptor = toBorderDescriptor(
            placementStyles[leftCandidateIndex],
            'Right'
          )
          candidates.push({ ...leftDescriptor, source: 'cell' })
        }

        if (
          typeof rightCandidateIndex === 'number' &&
          placementStyles[rightCandidateIndex] &&
          matrix.placements[rightCandidateIndex]?.column === column
        ) {
          const rightDescriptor = toBorderDescriptor(
            placementStyles[rightCandidateIndex],
            'Left'
          )
          candidates.push({ ...rightDescriptor, source: 'cell' })
        }

        const candidateSources: Array<BorderCandidate['source']> = ['cell']

        const hasCellCandidateVertical = candidates.some(
          (candidate) => candidate.source === 'cell'
        )
        if (column === 0 && !hasCellCandidateVertical) {
          candidates.push({
            ...toBorderDescriptor(tableStyle, 'Left'),
            source: 'table-left',
          })
          candidateSources.push('table-left')
        }
        if (column === matrix.columnCount && !hasCellCandidateVertical) {
          candidates.push({
            ...toBorderDescriptor(tableStyle, 'Right'),
            source: 'table-right',
          })
          candidateSources.push('table-right')
        }

        const winner = pickBorderCandidate(candidates, candidateSources)
        if (!winner || winner.width <= 0 || winner.style === 'none') {
          continue
        }

        const x = tableLefts[column]
        const y = tableTops[row]
        const segmentHeight = tableTops[row + 1] - tableTops[row]
        collapsedBorders.push({
          type: 'div',
          key: `table-border-v-${row}-${column}`,
          props: {
            style: {
              position: 'absolute',
              left: `${(x / totalInferredWidth) * 100}%`,
              top: `${(y / totalInferredHeight) * 100}%`,
              width: 0,
              height: `${(segmentHeight / totalInferredHeight) * 100}%`,
              borderLeftWidth: winner.width,
              borderLeftStyle: winner.style,
              borderLeftColor: winner.color,
              pointerEvents: 'none',
            },
          },
        })
      }
    }
  }

  const convertedChildren = matrix.placements.map((placement, index) => {
    if (!isReactElement(placement.cell)) {
      return placement.cell
    }

    const placementStyle = placementStyles[index] || {}
    const cellStyle: Record<string, unknown> = {
      ...(placementStyle as Record<string, unknown>),
      position: 'absolute',
      left: `${
        (sumRange(columnSizes, 0, placement.column) / totalInferredWidth) * 100
      }%`,
      top: `${
        (sumRange(rowSizes, 0, placement.row) / totalInferredHeight) * 100
      }%`,
      width: `${
        (sumRange(
          columnSizes,
          placement.column,
          placement.column + placement.colSpan
        ) /
          totalInferredWidth) *
        100
      }%`,
      height: `${
        (sumRange(rowSizes, placement.row, placement.row + placement.rowSpan) /
          totalInferredHeight) *
        100
      }%`,
      display: 'flex',
      boxSizing: placementStyle?.boxSizing || 'border-box',
    }

    if (isBorderCollapsed) {
      if (
        hasFullHorizontalNeighbor(matrix.cellGrid, placement, placement.row - 1)
      ) {
        setZeroBorder(cellStyle, 'Top')
      }
      if (
        hasFullVerticalNeighbor(
          matrix.cellGrid,
          placement,
          placement.column - 1
        )
      ) {
        setZeroBorder(cellStyle, 'Left')
      }
    }

    const cellProps = placement.cell.props || {}
    const {
      style: _style,
      tw: _tw,
      rowSpan: _rowSpan,
      rowspan: _rowspan,
      colSpan: _colSpan,
      colspan: _colspan,
      children: cellChildren,
      ...restCellProps
    } = cellProps

    return {
      type: 'div',
      key: placement.cell.key ?? `table-cell-${index}`,
      props: {
        ...restCellProps,
        style: cellStyle,
        children: cellChildren,
      },
    }
  })

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
      style: tableStyle,
      children: isBorderCollapsed
        ? [...convertedChildren, ...collapsedBorders]
        : convertedChildren,
    },
  }
}
