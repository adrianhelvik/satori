type ResolvedStyleMap = Record<string, string | number | object | undefined>

export type SpecialCaseResult = ResolvedStyleMap | undefined

export type SpecialCaseResolver = (
  name: string,
  value: string | number,
  currentColor: string
) => SpecialCaseResult

type Purify = (
  name: string,
  value?: string | number
) => string | number | undefined

type PairAliasMap = Record<string, readonly [string, string]>

const BORDER_VALUE_PARTS = ['Width', 'Style', 'Color'] as const

const LOGICAL_DIMENSION_ALIASES: Record<string, 'width' | 'height'> = {
  inlineSize: 'width',
  blockSize: 'height',
}

const LOGICAL_PURIFIED_ALIASES: Record<string, string> = {
  minInlineSize: 'minWidth',
  minBlockSize: 'minHeight',
  maxInlineSize: 'maxWidth',
  maxBlockSize: 'maxHeight',

  marginInlineStart: 'marginLeft',
  marginInlineEnd: 'marginRight',
  marginBlockStart: 'marginTop',
  marginBlockEnd: 'marginBottom',

  paddingInlineStart: 'paddingLeft',
  paddingInlineEnd: 'paddingRight',
  paddingBlockStart: 'paddingTop',
  paddingBlockEnd: 'paddingBottom',

  insetInlineStart: 'left',
  insetInlineEnd: 'right',
  insetBlockStart: 'top',
  insetBlockEnd: 'bottom',

  borderInlineStartWidth: 'borderLeftWidth',
  borderInlineEndWidth: 'borderRightWidth',
  borderBlockStartWidth: 'borderTopWidth',
  borderBlockEndWidth: 'borderBottomWidth',

  borderStartStartRadius: 'borderTopLeftRadius',
  borderStartEndRadius: 'borderTopRightRadius',
  borderEndStartRadius: 'borderBottomLeftRadius',
  borderEndEndRadius: 'borderBottomRightRadius',
}

const LOGICAL_PAIR_PURIFIED_ALIASES: PairAliasMap = {
  marginInline: ['marginLeft', 'marginRight'],
  marginBlock: ['marginTop', 'marginBottom'],

  paddingInline: ['paddingLeft', 'paddingRight'],
  paddingBlock: ['paddingTop', 'paddingBottom'],

  insetInline: ['left', 'right'],
  insetBlock: ['top', 'bottom'],

  borderInlineWidth: ['borderLeftWidth', 'borderRightWidth'],
  borderBlockWidth: ['borderTopWidth', 'borderBottomWidth'],
}

const LOGICAL_RAW_ALIASES: Record<string, string> = {
  overflowInline: 'overflowX',
  overflowBlock: 'overflowY',

  borderInlineStartStyle: 'borderLeftStyle',
  borderInlineEndStyle: 'borderRightStyle',
  borderBlockStartStyle: 'borderTopStyle',
  borderBlockEndStyle: 'borderBottomStyle',

  borderInlineStartColor: 'borderLeftColor',
  borderInlineEndColor: 'borderRightColor',
  borderBlockStartColor: 'borderTopColor',
  borderBlockEndColor: 'borderBottomColor',
}

const LOGICAL_PAIR_RAW_ALIASES: PairAliasMap = {
  borderInlineStyle: ['borderLeftStyle', 'borderRightStyle'],
  borderBlockStyle: ['borderTopStyle', 'borderBottomStyle'],

  borderInlineColor: ['borderLeftColor', 'borderRightColor'],
  borderBlockColor: ['borderTopColor', 'borderBottomColor'],
}

const LOGICAL_BORDER_AXIS_SHORTHANDS: Record<
  string,
  readonly ['Left', 'Right'] | readonly ['Top', 'Bottom']
> = {
  borderInline: ['Left', 'Right'],
  borderBlock: ['Top', 'Bottom'],
}

const LOGICAL_BORDER_SIDE_SHORTHANDS: Record<string, string> = {
  borderInlineStart: 'borderLeft',
  borderInlineEnd: 'borderRight',
  borderBlockStart: 'borderTop',
  borderBlockEnd: 'borderBottom',
}

function splitSpaceValues(value: string | number): string[] {
  return value.toString().trim().split(/\s+/)
}

function resolveLogicalDimensionAlias(
  name: string,
  value: string | number,
  currentColor: string,
  purify: Purify,
  resolveSpecialCase: SpecialCaseResolver
) {
  const target = LOGICAL_DIMENSION_ALIASES[name]
  if (!target) return

  return (
    resolveSpecialCase(target, value, currentColor) || {
      [target]: purify(target, value),
    }
  )
}

function resolvePurifiedLogicalAlias(
  name: string,
  value: string | number,
  purify: Purify
) {
  const target = LOGICAL_PURIFIED_ALIASES[name]
  if (!target) return

  const purifiedName =
    name === 'borderStartStartRadius' ||
    name === 'borderStartEndRadius' ||
    name === 'borderEndStartRadius' ||
    name === 'borderEndEndRadius'
      ? 'borderRadius'
      : target

  return { [target]: purify(purifiedName, value) }
}

function resolveRawLogicalAlias(name: string, value: string | number) {
  const target = LOGICAL_RAW_ALIASES[name]
  if (!target) return
  return { [target]: value }
}

function resolvePairAliasWithPurify(
  name: string,
  value: string | number,
  aliases: PairAliasMap,
  purify: Purify
) {
  const targets = aliases[name]
  if (!targets) return

  const values = splitSpaceValues(value)
  const [firstTarget, secondTarget] = targets
  const firstValue = values[0]
  const secondValue = values[1] || firstValue
  return {
    [firstTarget]: purify(firstTarget, firstValue),
    [secondTarget]: purify(secondTarget, secondValue),
  }
}

function resolvePairAliasWithoutPurify(
  name: string,
  value: string | number,
  aliases: PairAliasMap
) {
  const targets = aliases[name]
  if (!targets) return

  const values = splitSpaceValues(value)
  const [firstTarget, secondTarget] = targets
  const firstValue = values[0]
  const secondValue = values[1] || firstValue
  return {
    [firstTarget]: firstValue,
    [secondTarget]: secondValue,
  }
}

function resolveInsetShorthand(value: string | number, purify: Purify) {
  const values = splitSpaceValues(value)
  const [top, right = top, bottom = top, left = right] = values
  return {
    top: purify('top', top),
    right: purify('right', right),
    bottom: purify('bottom', bottom),
    left: purify('left', left),
  }
}

function resolveLogicalBorderAxisShorthand(
  name: string,
  value: string | number,
  currentColor: string,
  resolveSpecialCase: SpecialCaseResolver
): SpecialCaseResult {
  const sides = LOGICAL_BORDER_AXIS_SHORTHANDS[name]
  if (!sides) return

  const resolvedBorder = resolveSpecialCase('border', value, currentColor)
  if (!resolvedBorder) return

  const result: ResolvedStyleMap = {}
  for (const side of sides) {
    for (const part of BORDER_VALUE_PARTS) {
      result['border' + side + part] = resolvedBorder['borderTop' + part]
    }
  }
  return result
}

function resolveLogicalBorderSideShorthand(
  name: string,
  value: string | number,
  currentColor: string,
  resolveSpecialCase: SpecialCaseResolver
) {
  const target = LOGICAL_BORDER_SIDE_SHORTHANDS[name]
  if (!target) return
  return resolveSpecialCase(target, value, currentColor)
}

export function resolveLogicalProperty(
  name: string,
  value: string | number,
  currentColor: string,
  purify: Purify,
  resolveSpecialCase: SpecialCaseResolver
): SpecialCaseResult {
  // Satori currently assumes horizontal-tb/LTR flow, so logical mappings
  // intentionally resolve inline-start/end to left/right and block to top/bottom.
  const logicalDimension = resolveLogicalDimensionAlias(
    name,
    value,
    currentColor,
    purify,
    resolveSpecialCase
  )
  if (logicalDimension) return logicalDimension

  const purifiedAlias = resolvePurifiedLogicalAlias(name, value, purify)
  if (purifiedAlias) return purifiedAlias

  const rawAlias = resolveRawLogicalAlias(name, value)
  if (rawAlias) return rawAlias

  const purifiedPairAlias = resolvePairAliasWithPurify(
    name,
    value,
    LOGICAL_PAIR_PURIFIED_ALIASES,
    purify
  )
  if (purifiedPairAlias) return purifiedPairAlias

  if (name === 'inset') return resolveInsetShorthand(value, purify)

  const logicalBorderAxis = resolveLogicalBorderAxisShorthand(
    name,
    value,
    currentColor,
    resolveSpecialCase
  )
  if (logicalBorderAxis) return logicalBorderAxis

  const logicalBorderSide = resolveLogicalBorderSideShorthand(
    name,
    value,
    currentColor,
    resolveSpecialCase
  )
  if (logicalBorderSide) return logicalBorderSide

  const rawPairAlias = resolvePairAliasWithoutPurify(
    name,
    value,
    LOGICAL_PAIR_RAW_ALIASES
  )
  if (rawPairAlias) return rawPairAlias
}
