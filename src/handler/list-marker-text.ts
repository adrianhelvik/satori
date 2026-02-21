function parseListStyleStringToken(
  value: string | undefined
): string | undefined {
  if (!value) return

  const token = value.trim()
  if (token.length < 2) return

  const quote = token[0]
  if ((quote !== '"' && quote !== "'") || token[token.length - 1] !== quote) {
    return
  }

  return token
    .slice(1, -1)
    .replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, hex: string) => {
      const codePoint = parseInt(hex, 16)
      if (!Number.isFinite(codePoint)) return ''
      try {
        return String.fromCodePoint(codePoint)
      } catch {
        return ''
      }
    })
    .replace(/\\(.)/g, (_, escaped: string) => {
      if (escaped === 'n') return '\n'
      if (escaped === 'r') return '\r'
      if (escaped === 't') return '\t'
      return escaped
    })
}

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

function toAlphabeticIndex(index: number, upper: boolean): string {
  const chars = upper
    ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
    : 'abcdefghijklmnopqrstuvwxyz'.split('')
  return toAlphabeticBySymbols(index, chars)
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

const upperArmenianSymbols: Array<[number, string]> = [
  [9000, 'Ք'],
  [8000, 'Փ'],
  [7000, 'Ւ'],
  [6000, 'Ց'],
  [5000, 'Ր'],
  [4000, 'Տ'],
  [3000, 'Վ'],
  [2000, 'Ս'],
  [1000, 'Ռ'],
  [900, 'Ջ'],
  [800, 'Պ'],
  [700, 'Չ'],
  [600, 'Ո'],
  [500, 'Շ'],
  [400, 'Ն'],
  [300, 'Յ'],
  [200, 'Մ'],
  [100, 'Ճ'],
  [90, 'Ղ'],
  [80, 'Ձ'],
  [70, 'Հ'],
  [60, 'Կ'],
  [50, 'Ծ'],
  [40, 'Խ'],
  [30, 'Լ'],
  [20, 'Ի'],
  [10, 'Ժ'],
  [9, 'Թ'],
  [8, 'Ը'],
  [7, 'Է'],
  [6, 'Զ'],
  [5, 'Ե'],
  [4, 'Դ'],
  [3, 'Գ'],
  [2, 'Բ'],
  [1, 'Ա'],
]

const lowerArmenianSymbols: Array<[number, string]> = [
  [9000, 'ք'],
  [8000, 'փ'],
  [7000, 'ւ'],
  [6000, 'ց'],
  [5000, 'ր'],
  [4000, 'տ'],
  [3000, 'վ'],
  [2000, 'ս'],
  [1000, 'ռ'],
  [900, 'ջ'],
  [800, 'պ'],
  [700, 'չ'],
  [600, 'ո'],
  [500, 'շ'],
  [400, 'ն'],
  [300, 'յ'],
  [200, 'մ'],
  [100, 'ճ'],
  [90, 'ղ'],
  [80, 'ձ'],
  [70, 'հ'],
  [60, 'կ'],
  [50, 'ծ'],
  [40, 'խ'],
  [30, 'լ'],
  [20, 'ի'],
  [10, 'ժ'],
  [9, 'թ'],
  [8, 'ը'],
  [7, 'է'],
  [6, 'զ'],
  [5, 'ե'],
  [4, 'դ'],
  [3, 'գ'],
  [2, 'բ'],
  [1, 'ա'],
]

const georgianSymbols: Array<[number, string]> = [
  [10000, 'ჶ'],
  [9000, 'ჵ'],
  [8000, 'ჰ'],
  [7000, 'ჯ'],
  [6000, 'ხ'],
  [5000, 'ჭ'],
  [4000, 'წ'],
  [3000, 'ძ'],
  [2000, 'ც'],
  [1000, 'ჩ'],
  [900, 'შ'],
  [800, 'ყ'],
  [700, 'ღ'],
  [600, 'ქ'],
  [500, 'ფ'],
  [400, 'უ'],
  [300, 'ტ'],
  [200, 'ს'],
  [100, 'რ'],
  [90, 'ჟ'],
  [80, 'პ'],
  [70, 'ო'],
  [60, 'ჲ'],
  [50, 'ნ'],
  [40, 'მ'],
  [30, 'ლ'],
  [20, 'კ'],
  [10, 'ი'],
  [9, 'თ'],
  [8, 'ჱ'],
  [7, 'ზ'],
  [6, 'ვ'],
  [5, 'ე'],
  [4, 'დ'],
  [3, 'გ'],
  [2, 'ბ'],
  [1, 'ა'],
]

const lowerCyrillicSymbols = [
  'а',
  'б',
  'в',
  'г',
  'д',
  'е',
  'ж',
  'з',
  'и',
  'й',
  'к',
  'л',
  'м',
  'н',
  'о',
  'п',
  'р',
  'с',
  'т',
  'у',
  'ф',
  'х',
  'ц',
  'ч',
  'ш',
  'щ',
  'ъ',
  'ы',
  'ь',
  'э',
  'ю',
  'я',
]
const upperCyrillicSymbols = lowerCyrillicSymbols.map((symbol) =>
  symbol.toUpperCase()
)

const hiraganaSymbols = [
  'あ',
  'い',
  'う',
  'え',
  'お',
  'か',
  'き',
  'く',
  'け',
  'こ',
  'さ',
  'し',
  'す',
  'せ',
  'そ',
  'た',
  'ち',
  'つ',
  'て',
  'と',
  'な',
  'に',
  'ぬ',
  'ね',
  'の',
  'は',
  'ひ',
  'ふ',
  'へ',
  'ほ',
  'ま',
  'み',
  'む',
  'め',
  'も',
  'や',
  'ゆ',
  'よ',
  'ら',
  'り',
  'る',
  'れ',
  'ろ',
  'わ',
  'を',
  'ん',
]
const katakanaSymbols = [
  'ア',
  'イ',
  'ウ',
  'エ',
  'オ',
  'カ',
  'キ',
  'ク',
  'ケ',
  'コ',
  'サ',
  'シ',
  'ス',
  'セ',
  'ソ',
  'タ',
  'チ',
  'ツ',
  'テ',
  'ト',
  'ナ',
  'ニ',
  'ヌ',
  'ネ',
  'ノ',
  'ハ',
  'ヒ',
  'フ',
  'ヘ',
  'ホ',
  'マ',
  'ミ',
  'ム',
  'メ',
  'モ',
  'ヤ',
  'ユ',
  'ヨ',
  'ラ',
  'リ',
  'ル',
  'レ',
  'ロ',
  'ワ',
  'ヲ',
  'ン',
]

export function getListMarkerText(
  type: string | undefined,
  index: number
): string | null {
  const rawType = (type || '').trim()
  const markerString = parseListStyleStringToken(rawType)
  if (typeof markerString === 'string') {
    return markerString
  }

  const markerType = rawType.toLowerCase()
  switch (markerType) {
    case 'none':
      return null
    case 'circle':
      return '\u25e6'
    case 'square':
      return '\u25aa'
    case 'decimal':
      return `${index}.`
    case 'decimal-leading-zero':
      return `${String(index).padStart(2, '0')}.`
    case 'lower-hexadecimal':
      return `${index > 0 ? index.toString(16) : String(index)}.`
    case 'upper-hexadecimal':
      return `${index > 0 ? index.toString(16).toUpperCase() : String(index)}.`
    case 'armenian':
    case 'upper-armenian':
      return `${toAdditiveIndex(index, upperArmenianSymbols)}.`
    case 'lower-armenian':
      return `${toAdditiveIndex(index, lowerArmenianSymbols)}.`
    case 'georgian':
      return `${toAdditiveIndex(index, georgianSymbols)}.`
    case 'upper-alpha':
    case 'upper-latin':
      return `${toAlphabeticIndex(index, true)}.`
    case 'lower-alpha':
    case 'lower-latin':
      return `${toAlphabeticIndex(index, false)}.`
    case 'lower-cyrillic':
      return `${toAlphabeticBySymbols(index, lowerCyrillicSymbols)}.`
    case 'upper-cyrillic':
      return `${toAlphabeticBySymbols(index, upperCyrillicSymbols)}.`
    case 'hiragana':
      return `${toAlphabeticBySymbols(index, hiraganaSymbols)}.`
    case 'katakana':
      return `${toAlphabeticBySymbols(index, katakanaSymbols)}.`
    case 'lower-greek':
      return `${toAlphabeticBySymbols(index, [
        '\u03b1',
        '\u03b2',
        '\u03b3',
        '\u03b4',
        '\u03b5',
        '\u03b6',
        '\u03b7',
        '\u03b8',
        '\u03b9',
        '\u03ba',
        '\u03bb',
        '\u03bc',
        '\u03bd',
        '\u03be',
        '\u03bf',
        '\u03c0',
        '\u03c1',
        '\u03c3',
        '\u03c4',
        '\u03c5',
        '\u03c6',
        '\u03c7',
        '\u03c8',
        '\u03c9',
      ])}.`
    case 'upper-roman':
      return `${toRomanIndex(index, true)}.`
    case 'lower-roman':
      return `${toRomanIndex(index, false)}.`
    case 'disclosure-open':
      return '\u25be'
    case 'disclosure-closed':
      return '\u25b8'
    case 'disc':
    default:
      return '\u2022'
  }
}
