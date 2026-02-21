export type MarkerFormatter = (index: number) => string | null

function toAlphabeticBySymbols(index: number, symbols: string[]): string {
  if (index <= 0 || symbols.length === 0) return '0'

  let result = ''
  let n = index
  while (n > 0) {
    n -= 1
    result = symbols[n % symbols.length] + result
    n = Math.floor(n / symbols.length)
  }
  return result
}

function toRomanIndex(index: number, upper: boolean): string {
  if (index <= 0 || index >= 4000) return String(index)

  const numerals: [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ]

  let n = index
  let result = ''
  for (const [value, symbol] of numerals) {
    while (n >= value) {
      result += symbol
      n -= value
    }
  }

  return upper ? result : result.toLowerCase()
}

function toAdditiveIndex(
  index: number,
  symbols: Array<[value: number, symbol: string]>
): string {
  if (index <= 0) return String(index)

  let remaining = index
  let result = ''
  for (const [value, symbol] of symbols) {
    if (remaining < value) continue
    result += symbol
    remaining -= value
    if (remaining === 0) return result
  }

  return String(index)
}

function toHebrewIndex(index: number): string {
  if (index <= 0) return String(index)
  if (index >= 10_000) return String(index)

  let remaining = index
  let result = ''

  const thousands = Math.floor(remaining / 1000)
  if (thousands > 0) {
    const thousandsSymbols = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט']
    const token = thousandsSymbols[thousands]
    if (!token) return String(index)
    result += `${token}׳`
    remaining -= thousands * 1000
  }

  while (remaining >= 400) {
    result += 'ת'
    remaining -= 400
  }

  const hundredsMap: Array<[number, string]> = [
    [300, 'ש'],
    [200, 'ר'],
    [100, 'ק'],
  ]
  for (const [value, symbol] of hundredsMap) {
    if (remaining >= value) {
      result += symbol
      remaining -= value
      break
    }
  }

  // Traditional Hebrew numbering avoids using יה/יו for 15/16.
  if (remaining === 15) return `${result}טו`
  if (remaining === 16) return `${result}טז`

  const tensMap: Array<[number, string]> = [
    [90, 'צ'],
    [80, 'פ'],
    [70, 'ע'],
    [60, 'ס'],
    [50, 'נ'],
    [40, 'מ'],
    [30, 'ל'],
    [20, 'כ'],
    [10, 'י'],
  ]
  for (const [value, symbol] of tensMap) {
    if (remaining >= value) {
      result += symbol
      remaining -= value
      break
    }
  }

  const onesMap: Array<[number, string]> = [
    [9, 'ט'],
    [8, 'ח'],
    [7, 'ז'],
    [6, 'ו'],
    [5, 'ה'],
    [4, 'ד'],
    [3, 'ג'],
    [2, 'ב'],
    [1, 'א'],
  ]
  for (const [value, symbol] of onesMap) {
    if (remaining >= value) {
      result += symbol
      remaining -= value
      break
    }
  }

  return remaining === 0 && result ? result : String(index)
}

function toEthiopicPairValue(value: number): string {
  const ones = ['', '፩', '፪', '፫', '፬', '፭', '፮', '፯', '፰', '፱']
  const tens = ['', '፲', '፳', '፴', '፵', '፶', '፷', '፸', '፹', '፺']
  const onesDigit = value % 10
  const tensDigit = Math.floor(value / 10)
  return `${tens[tensDigit] || ''}${ones[onesDigit] || ''}`
}

function toEthiopicNumericIndex(index: number): string {
  if (index <= 0) return String(index)
  if (index >= 1_000_000) return String(index)

  let digits = String(Math.trunc(index))
  if (digits.length % 2 === 1) digits = `0${digits}`

  const pairCount = digits.length / 2
  let result = ''

  for (let i = 0; i < pairCount; i++) {
    const pair = Number.parseInt(digits.slice(i * 2, i * 2 + 2), 10)
    const isMostSignificant = i === 0
    const isLast = i === pairCount - 1
    const remainingPairs = pairCount - i - 1

    const shouldOmitLeadingOne = pair === 1 && isMostSignificant && !isLast
    if (pair !== 0 && !shouldOmitLeadingOne) {
      result += toEthiopicPairValue(pair)
    }

    if (pair !== 0 && !isLast) {
      result += remainingPairs % 2 === 1 ? '፻' : '፼'
    }
  }

  return result || String(index)
}

export function markerText(text: string | null): MarkerFormatter {
  return () => text
}

export function markerDecimal(index: number): string {
  return `${index}.`
}

export function markerDecimalLeadingZero(index: number): string {
  return `${String(index).padStart(2, '0')}.`
}

export function markerLowerHex(index: number): string {
  return `${index > 0 ? index.toString(16) : String(index)}.`
}

export function markerUpperHex(index: number): string {
  return `${index > 0 ? index.toString(16).toUpperCase() : String(index)}.`
}

export function toNumericBySymbols(index: number, symbols: string[]): string {
  const raw = String(index)
  let result = ''
  for (const ch of raw) {
    if (ch >= '0' && ch <= '9') {
      result += symbols[ch.charCodeAt(0) - 48]
    } else {
      result += ch
    }
  }
  return result
}

export function markerRoman(upper: boolean): MarkerFormatter {
  return (index) => `${toRomanIndex(index, upper)}.`
}

export function markerAlphabetic(symbols: string[]): MarkerFormatter {
  return (index) => `${toAlphabeticBySymbols(index, symbols)}.`
}

export function markerNumeric(symbols: string[]): MarkerFormatter {
  return (index) => `${toNumericBySymbols(index, symbols)}.`
}

export function markerAdditive(
  symbols: Array<[value: number, symbol: string]>
): MarkerFormatter {
  return (index) => `${toAdditiveIndex(index, symbols)}.`
}

export function markerHebrew(index: number): string {
  return `${toHebrewIndex(index)}.`
}

export function markerEthiopicNumeric(index: number): string {
  return `${toEthiopicNumericIndex(index)}/`
}
