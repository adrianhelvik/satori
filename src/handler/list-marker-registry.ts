import {
  markerAdditive,
  markerAlphabetic,
  markerDecimal,
  markerDecimalLeadingZero,
  markerEthiopicNumeric,
  markerHebrew,
  markerLowerHex,
  markerNumeric,
  markerRoman,
  markerText,
  markerUpperHex,
  toNumericBySymbols,
  type MarkerFormatter,
} from './list-marker-formatters.js'
import {
  additiveListStyleSymbols,
  alphabeticListStyleSymbols,
  cjkDecimalDigits,
  numericListStyleSymbols,
  unorderedListStyleSymbols,
} from './list-marker-symbols.js'

type ListStyleDefinition = {
  ordered: boolean
  format: MarkerFormatter
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

function createRegistry(): Record<string, ListStyleDefinition> {
  const registry: Record<string, ListStyleDefinition> = {}

  for (const [type, text] of unorderedListStyleSymbols) {
    registerListStyle(registry, type, unordered(text))
  }

  const simpleOrderedStyles: Array<[string, MarkerFormatter]> = [
    ['decimal', markerDecimal],
    ['decimal-leading-zero', markerDecimalLeadingZero],
    ['lower-hexadecimal', markerLowerHex],
    ['upper-hexadecimal', markerUpperHex],
    ['ethiopic-numeric', markerEthiopicNumeric],
    ['hebrew', markerHebrew],
  ]
  for (const [type, formatter] of simpleOrderedStyles) {
    registerListStyle(registry, type, ordered(formatter))
  }

  for (const [types, symbols] of additiveListStyleSymbols) {
    registerListStyle(registry, types, ordered(markerAdditive(symbols)))
  }

  for (const [types, symbols] of alphabeticListStyleSymbols) {
    registerListStyle(registry, types, ordered(markerAlphabetic(symbols)))
  }

  for (const [type, symbols] of numericListStyleSymbols) {
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
