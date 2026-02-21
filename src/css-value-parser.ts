export interface CalcTerm {
  sign: 1 | -1
  value: string
}

export function splitByWhitespaceOutsideParens(input: string): string[] {
  const tokens: string[] = []
  let current = ''
  let parenDepth = 0

  for (let i = 0; i < input.length; i++) {
    const char = input[i]

    if (char === '(') {
      parenDepth++
      current += char
      continue
    }

    if (char === ')') {
      if (parenDepth > 0) parenDepth--
      current += char
      continue
    }

    if (/\s/.test(char) && parenDepth === 0) {
      const token = current.trim()
      if (token) tokens.push(token)
      current = ''
      continue
    }

    current += char
  }

  const token = current.trim()
  if (token) tokens.push(token)
  return tokens
}

export function parseSimpleCalcTerms(input: string): CalcTerm[] | undefined {
  const normalized = input.trim()
  const lower = normalized.toLowerCase()
  if (!(lower.startsWith('calc(') && lower.endsWith(')'))) {
    return
  }

  const expression = normalized.slice(5, -1).trim()
  if (!expression) return

  const rawTerms = expression.match(/[+-]?\s*[^+-]+/g)
  if (!rawTerms || !rawTerms.length) return

  const terms: CalcTerm[] = []
  for (const rawTerm of rawTerms) {
    const normalizedTerm = rawTerm.trim()
    if (!normalizedTerm) continue

    let sign: 1 | -1 = 1
    let valueToken = normalizedTerm
    if (valueToken.startsWith('+')) {
      valueToken = valueToken.slice(1).trim()
    } else if (valueToken.startsWith('-')) {
      sign = -1
      valueToken = valueToken.slice(1).trim()
    }

    if (!valueToken) return
    terms.push({
      sign,
      value: valueToken,
    })
  }

  return terms.length ? terms : undefined
}
