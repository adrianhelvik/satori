type MarkerFormatter = (index: number) => string | null

type ListStyleDefinition = {
  ordered: boolean
  format: MarkerFormatter
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

function markerText(text: string | null): MarkerFormatter {
  return () => text
}

function markerDecimal(index: number): string {
  return `${index}.`
}

function markerDecimalLeadingZero(index: number): string {
  return `${String(index).padStart(2, '0')}.`
}

function markerLowerHex(index: number): string {
  return `${index > 0 ? index.toString(16) : String(index)}.`
}

function markerUpperHex(index: number): string {
  return `${index > 0 ? index.toString(16).toUpperCase() : String(index)}.`
}

function toNumericBySymbols(index: number, symbols: string[]): string {
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

function markerRoman(upper: boolean): MarkerFormatter {
  return (index) => `${toRomanIndex(index, upper)}.`
}

function markerAlphabetic(symbols: string[]): MarkerFormatter {
  return (index) => `${toAlphabeticBySymbols(index, symbols)}.`
}

function markerNumeric(symbols: string[]): MarkerFormatter {
  return (index) => `${toNumericBySymbols(index, symbols)}.`
}

function markerAdditive(
  symbols: Array<[value: number, symbol: string]>
): MarkerFormatter {
  return (index) => `${toAdditiveIndex(index, symbols)}.`
}

function markerHebrew(index: number): string {
  return `${toHebrewIndex(index)}.`
}

function ordered(format: MarkerFormatter): ListStyleDefinition {
  return { ordered: true, format }
}

function unordered(text: string | null): ListStyleDefinition {
  return { ordered: false, format: markerText(text) }
}

function registerListStyle(
  registry: Record<string, ListStyleDefinition>,
  types: string | string[],
  definition: ListStyleDefinition
): void {
  const values = Array.isArray(types) ? types : [types]
  for (const type of values) {
    registry[type] = definition
  }
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

const lowerLatinSymbols = 'abcdefghijklmnopqrstuvwxyz'.split('')
const upperLatinSymbols = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const lowerNorwegianSymbols = 'abcdefghijklmnopqrstuvwxyzæøå'.split('')
const upperNorwegianSymbols = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ'.split('')
const arabicIndicDigits = '٠١٢٣٤٥٦٧٨٩'.split('')
const persianDigits = '۰۱۲۳۴۵۶۷۸۹'.split('')
const devanagariDigits = '०१२३४५६७८९'.split('')
const bengaliDigits = '০১২৩৪৫৬৭৮৯'.split('')
const gurmukhiDigits = '੦੧੨੩੪੫੬੭੮੯'.split('')
const gujaratiDigits = '૦૧૨૩૪૫૬૭૮૯'.split('')
const kannadaDigits = '೦೧೨೩೪೫೬೭೮೯'.split('')
const malayalamDigits = '൦൧൨൩൪൫൬൭൮൯'.split('')
const tamilDigits = '௦௧௨௩௪௫௬௭௮௯'.split('')
const teluguDigits = '౦౧౨౩౪౫౬౭౮౯'.split('')
const thaiDigits = '๐๑๒๓๔๕๖๗๘๙'.split('')
const laoDigits = '໐໑໒໓໔໕໖໗໘໙'.split('')
const myanmarDigits = '၀၁၂၃၄၅၆၇၈၉'.split('')
const khmerDigits = '០១២៣៤៥៦៧៨៩'.split('')
const mongolianDigits = '᠐᠑᠒᠓᠔᠕᠖᠗᠘᠙'.split('')
const oriyaDigits = '୦୧୨୩୪୫୬୭୮୯'.split('')
const tibetanDigits = '༠༡༢༣༤༥༦༧༨༩'.split('')
const cjkDecimalDigits = '〇一二三四五六七八九'.split('')
const lowerGreekSymbols = [
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
const hiraganaIrohaSymbols = [
  'い',
  'ろ',
  'は',
  'に',
  'ほ',
  'へ',
  'と',
  'ち',
  'り',
  'ぬ',
  'る',
  'を',
  'わ',
  'か',
  'よ',
  'た',
  'れ',
  'そ',
  'つ',
  'ね',
  'な',
  'ら',
  'む',
  'う',
  'ゐ',
  'の',
  'お',
  'く',
  'や',
  'ま',
  'け',
  'ふ',
  'こ',
  'え',
  'て',
  'あ',
  'さ',
  'き',
  'ゆ',
  'め',
  'み',
  'し',
  'ゑ',
  'ひ',
  'も',
  'せ',
  'す',
]
const katakanaIrohaSymbols = [
  'イ',
  'ロ',
  'ハ',
  'ニ',
  'ホ',
  'ヘ',
  'ト',
  'チ',
  'リ',
  'ヌ',
  'ル',
  'ヲ',
  'ワ',
  'カ',
  'ヨ',
  'タ',
  'レ',
  'ソ',
  'ツ',
  'ネ',
  'ナ',
  'ラ',
  'ム',
  'ウ',
  'ヰ',
  'ノ',
  'オ',
  'ク',
  'ヤ',
  'マ',
  'ケ',
  'フ',
  'コ',
  'エ',
  'テ',
  'ア',
  'サ',
  'キ',
  'ユ',
  'メ',
  'ミ',
  'シ',
  'ヱ',
  'ヒ',
  'モ',
  'セ',
  'ス',
]

function createRegistry(): Record<string, ListStyleDefinition> {
  const registry: Record<string, ListStyleDefinition> = {}

  const unorderedStyles: Array<[string, string | null]> = [
    ['none', null],
    ['disc', '\u2022'],
    ['circle', '\u25e6'],
    ['square', '\u25aa'],
    ['disclosure-open', '\u25be'],
    ['disclosure-closed', '\u25b8'],
  ]
  for (const [type, text] of unorderedStyles) {
    registerListStyle(registry, type, unordered(text))
  }

  const simpleOrderedStyles: Array<[string, MarkerFormatter]> = [
    ['decimal', markerDecimal],
    ['decimal-leading-zero', markerDecimalLeadingZero],
    ['lower-hexadecimal', markerLowerHex],
    ['upper-hexadecimal', markerUpperHex],
    ['hebrew', markerHebrew],
  ]
  for (const [type, formatter] of simpleOrderedStyles) {
    registerListStyle(registry, type, ordered(formatter))
  }

  const additiveStyles: Array<[string[], MarkerFormatter]> = [
    [['armenian', 'upper-armenian'], markerAdditive(upperArmenianSymbols)],
    [['lower-armenian'], markerAdditive(lowerArmenianSymbols)],
    [['georgian'], markerAdditive(georgianSymbols)],
  ]
  for (const [types, formatter] of additiveStyles) {
    registerListStyle(registry, types, ordered(formatter))
  }

  const alphabeticStyles: Array<[string[], MarkerFormatter]> = [
    [['upper-alpha', 'upper-latin'], markerAlphabetic(upperLatinSymbols)],
    [['lower-alpha', 'lower-latin'], markerAlphabetic(lowerLatinSymbols)],
    [
      ['lower-norwegian', 'lower-danish'],
      markerAlphabetic(lowerNorwegianSymbols),
    ],
    [
      ['upper-norwegian', 'upper-danish'],
      markerAlphabetic(upperNorwegianSymbols),
    ],
    [['lower-greek'], markerAlphabetic(lowerGreekSymbols)],
    [['lower-cyrillic'], markerAlphabetic(lowerCyrillicSymbols)],
    [['upper-cyrillic'], markerAlphabetic(upperCyrillicSymbols)],
    [['hiragana'], markerAlphabetic(hiraganaSymbols)],
    [['hiragana-iroha'], markerAlphabetic(hiraganaIrohaSymbols)],
    [['katakana'], markerAlphabetic(katakanaSymbols)],
    [['katakana-iroha'], markerAlphabetic(katakanaIrohaSymbols)],
  ]
  for (const [types, formatter] of alphabeticStyles) {
    registerListStyle(registry, types, ordered(formatter))
  }

  const numericStyles: Array<[string, string[]]> = [
    ['arabic-indic', arabicIndicDigits],
    ['persian', persianDigits],
    ['devanagari', devanagariDigits],
    ['bengali', bengaliDigits],
    ['gurmukhi', gurmukhiDigits],
    ['gujarati', gujaratiDigits],
    ['kannada', kannadaDigits],
    ['malayalam', malayalamDigits],
    ['tamil', tamilDigits],
    ['telugu', teluguDigits],
    ['thai', thaiDigits],
    ['lao', laoDigits],
    ['myanmar', myanmarDigits],
    ['khmer', khmerDigits],
    ['cambodian', khmerDigits],
    ['mongolian', mongolianDigits],
    ['oriya', oriyaDigits],
    ['tibetan', tibetanDigits],
  ]
  for (const [type, symbols] of numericStyles) {
    registerListStyle(registry, type, ordered(markerNumeric(symbols)))
  }

  registerListStyle(
    registry,
    'cjk-decimal',
    ordered((index) => `${toNumericBySymbols(index, cjkDecimalDigits)}、`)
  )

  registerListStyle(registry, 'upper-roman', ordered(markerRoman(true)))
  registerListStyle(registry, 'lower-roman', ordered(markerRoman(false)))

  return registry
}

const registry = createRegistry()

export const listStyleTypes = new Set(Object.keys(registry))

export const orderedListStyleTypes = new Set(
  Object.entries(registry)
    .filter(([, definition]) => definition.ordered)
    .map(([type]) => type)
)

export function getBuiltInListMarkerText(
  type: string,
  index: number
): string | null | undefined {
  const definition = registry[type]
  return definition?.format(index)
}
