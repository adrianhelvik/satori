import valueParser from 'postcss-value-parser'
import cssColorParse from 'parse-css-color'

type BlurFilter = {
  type: 'blur'
  radius: string
}

type NumericFilter = {
  type: 'brightness' | 'contrast' | 'saturate' | 'opacity'
  amount: number
}

type DropShadowFilter = {
  type: 'drop-shadow'
  offsetX: string
  offsetY: string
  blurRadius: string
  color?: string
}

export type ParsedFilterFunction = BlurFilter | NumericFilter | DropShadowFilter

export interface ParsedFilterList {
  filters: ParsedFilterFunction[]
  unsupported: string[]
}

type FilterFunctionNode = valueParser.FunctionNode
type FilterFunctionParser = (
  node: FilterFunctionNode
) => ParsedFilterFunction | null

function parseAmount(value: string): number | undefined {
  const token = value.trim().toLowerCase()
  if (!token) return

  if (token.endsWith('%')) {
    const percentValue = parseFloat(token.slice(0, -1))
    if (!Number.isFinite(percentValue)) return
    return percentValue / 100
  }

  const numericValue = parseFloat(token)
  if (!Number.isFinite(numericValue)) return
  return numericValue
}

function tokenizeFunctionArgs(nodes: valueParser.Node[]): string[] {
  return nodes
    .filter((node) => node.type !== 'space' && node.type !== 'div')
    .map((node) => valueParser.stringify(node))
    .map((token) => token.trim())
    .filter(Boolean)
}

function parseDropShadow(args: valueParser.Node[]): DropShadowFilter | null {
  const tokens = tokenizeFunctionArgs(args)
  if (tokens.length < 2) return null

  let color: string | undefined
  const lengths: string[] = []

  for (const token of tokens) {
    if (!color && cssColorParse(token)) {
      color = token
      continue
    }
    lengths.push(token)
  }

  if (lengths.length < 2) return null

  return {
    type: 'drop-shadow',
    offsetX: lengths[0],
    offsetY: lengths[1],
    blurRadius: lengths[2] || '0',
    color,
  }
}

function parseBlur(node: FilterFunctionNode): BlurFilter | null {
  const radius = valueParser.stringify(node.nodes).trim()
  if (!radius) return null
  return { type: 'blur', radius }
}

function parseNumericFilter(
  type: NumericFilter['type'],
  node: FilterFunctionNode
): NumericFilter | null {
  const argsText = valueParser.stringify(node.nodes).trim()
  if (!argsText) return null

  const amount = parseAmount(argsText)
  if (typeof amount !== 'number') return null

  return { type, amount }
}

const FILTER_FUNCTION_PARSERS: Record<string, FilterFunctionParser> = {
  blur: parseBlur,
  brightness: (node) => parseNumericFilter('brightness', node),
  contrast: (node) => parseNumericFilter('contrast', node),
  saturate: (node) => parseNumericFilter('saturate', node),
  opacity: (node) => parseNumericFilter('opacity', node),
  'drop-shadow': (node) => parseDropShadow(node.nodes),
}

export function parseFilterList(value: unknown): ParsedFilterList {
  if (typeof value !== 'string') {
    return { filters: [], unsupported: [] }
  }

  const normalized = value.trim()
  if (!normalized || normalized.toLowerCase() === 'none') {
    return { filters: [], unsupported: [] }
  }

  const parsed = valueParser(normalized)
  const filters: ParsedFilterFunction[] = []
  const unsupported: string[] = []

  for (const node of parsed.nodes) {
    if (node.type === 'space') continue

    const rawToken = valueParser.stringify(node).trim()
    if (node.type !== 'function') {
      if (rawToken) unsupported.push(rawToken)
      continue
    }

    const fnName = node.value.trim().toLowerCase()
    const parser = FILTER_FUNCTION_PARSERS[fnName]
    if (!parser) {
      unsupported.push(rawToken)
      continue
    }

    const parsedFilter = parser(node)
    if (!parsedFilter) {
      unsupported.push(rawToken)
      continue
    }

    filters.push(parsedFilter)
  }

  return { filters, unsupported }
}
