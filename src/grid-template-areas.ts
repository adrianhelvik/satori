export interface GridTemplateAxisPlacement {
  start?: number
  span: number
}

export interface GridTemplateAreaPlacement {
  row: GridTemplateAxisPlacement
  column: GridTemplateAxisPlacement
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

export function resolveGridTemplateAreaPlacements(
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
