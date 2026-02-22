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
    const argsText = valueParser.stringify(node.nodes).trim()

    if (!argsText) {
      unsupported.push(rawToken)
      continue
    }

    if (fnName === 'blur') {
      filters.push({ type: 'blur', radius: argsText })
      continue
    }

    if (
      fnName === 'brightness' ||
      fnName === 'contrast' ||
      fnName === 'saturate' ||
      fnName === 'opacity'
    ) {
      const amount = parseAmount(argsText)
      if (typeof amount !== 'number') {
        unsupported.push(rawToken)
        continue
      }

      filters.push({
        type: fnName,
        amount,
      })
      continue
    }

    if (fnName === 'drop-shadow') {
      const parsedShadow = parseDropShadow(node.nodes)
      if (parsedShadow) {
        filters.push(parsedShadow)
      } else {
        unsupported.push(rawToken)
      }
      continue
    }

    unsupported.push(rawToken)
  }

  return { filters, unsupported }
}
