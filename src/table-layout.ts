import type { ReactNode } from 'react'

import { isReactElement, normalizeChildren } from './utils.js'
import { normalizeDisplayValue } from './handler/display.js'
import { normalizePositionValue } from './handler/position.js'
import { resolveElementStyle, type TwStyleResolver } from './element-style.js'

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

function parsePositiveInteger(value: unknown): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
      ? parseInt(value, 10)
      : NaN

  if (!Number.isFinite(parsed) || parsed < 1) return 1
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
  getTwStyles: TwStyleResolver
): {
  placements: TableCellPlacement[]
  columnCount: number
  rowCount: number
} | null {
  const placements: TableCellPlacement[] = []
  const occupied: boolean[][] = []
  let columnCount = 0
  const totalRows = rows.length

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
      const rowSpan = parseTableRowSpan(
        cellProps.rowSpan ?? cellProps.rowspan,
        rowIndex,
        totalRows
      )
      const colSpan = parsePositiveInteger(
        cellProps.colSpan ?? cellProps.colspan
      )

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

      columnIndex += colSpan
    }

    columnCount = Math.max(columnCount, occupied[rowIndex].length)
  }

  if (placements.length === 0 || columnCount === 0) {
    return null
  }

  const rowCount = Math.max(
    occupied.length,
    ...placements.map((placement) => placement.row + placement.rowSpan)
  )
  if (!Number.isFinite(rowCount) || rowCount <= 0) return null

  return {
    placements,
    columnCount,
    rowCount,
  }
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

  const matrix = buildTableMatrix(rows, getTwStyles)
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
  if (typeof tableStyle.width === 'undefined') {
    tableStyle.width = matrix.columnCount * 80
  }
  if (typeof tableStyle.height === 'undefined') {
    tableStyle.height = matrix.rowCount * 40
  }

  const convertedChildren = matrix.placements.map((placement, index) => {
    if (!isReactElement(placement.cell)) {
      return placement.cell
    }

    const placementStyle = resolveElementStyle(placement.cell, getTwStyles)
    const cellStyle: Record<string, unknown> = {
      ...(placementStyle as Record<string, unknown>),
      position: 'absolute',
      left: `${(placement.column / matrix.columnCount) * 100}%`,
      top: `${(placement.row / matrix.rowCount) * 100}%`,
      width: `${(placement.colSpan / matrix.columnCount) * 100}%`,
      height: `${(placement.rowSpan / matrix.rowCount) * 100}%`,
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
