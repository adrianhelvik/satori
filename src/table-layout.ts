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

function parseTableColSpan(value: unknown): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
      ? parseInt(value, 10)
      : NaN

  if (!Number.isFinite(parsed) || parsed < 0) return 1
  return Math.floor(parsed)
}

function parseTableRowSpan(
  value: unknown,
  rowIndex: number,
  totalRows: number
): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
      ? parseInt(value, 10)
      : NaN

  if (!Number.isFinite(parsed) || parsed < 0) return 1
  if (parsed === 0) return Math.max(1, totalRows - rowIndex)
  return Math.floor(parsed)
}

function parseTableSpan(value: unknown): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
      ? parseInt(value, 10)
      : NaN

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

      cursor += span
      return
    }

    if (element.type === 'colgroup') {
      const groupSpan = parseTableSpan(
        element.props?.span || element.props?.colspan
      )

      let start = cursor
      for (const groupChild of normalizeChildren(element.props?.children)) {
        normalizeColumnsFromElement(groupChild)
      }
      if (cursor === start) {
        cursor += groupSpan
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
        const provisionalColSpan = colSpan === 0 ? 1 : colSpan
        for (let c = columnIndex; c < columnIndex + provisionalColSpan; c++) {
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
    if (placement.colSpan !== 0) continue

    const resolvedColSpan = Math.max(1, columnCount - placement.column)
    let canExpand = true

    for (let r = placement.row; r < placement.row + placement.rowSpan; r++) {
      occupied[r] ||= []
      for (
        let c = placement.column + 1;
        c < placement.column + resolvedColSpan;
        c++
      ) {
        if (occupied[r][c]) {
          canExpand = false
          break
        }
      }
      if (!canExpand) break
    }

    if (canExpand) {
      for (let r = placement.row; r < placement.row + placement.rowSpan; r++) {
        for (
          let c = placement.column + 1;
          c < placement.column + resolvedColSpan;
          c++
        ) {
          occupied[r][c] = true
        }
      }
      placement.colSpan = resolvedColSpan
    } else {
      placement.colSpan = 1
    }
  }

  for (const placement of placements) {
    rowCount = Math.max(rowCount, placement.row + placement.rowSpan)
  }

  return {
    placements,
    columnCount,
    rowCount,
    columnWidths,
    rowHeights,
  }
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

  const convertedChildren = matrix.placements.map((placement, index) => {
    if (!isReactElement(placement.cell)) {
      return placement.cell
    }

    const placementStyle = resolveElementStyle(placement.cell, getTwStyles)
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
      children: convertedChildren,
    },
  }
}
