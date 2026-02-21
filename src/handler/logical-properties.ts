export type SpecialCaseResult =
  | Record<string, string | number | object | undefined>
  | undefined

export type SpecialCaseResolver = (
  name: string,
  value: string | number,
  currentColor: string
) => SpecialCaseResult

type Purify = (
  name: string,
  value?: string | number
) => string | number | undefined

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

function splitSpaceValues(value: string | number): string[] {
  return value.toString().trim().split(/\s+/)
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

export function resolveLogicalProperty(
  name: string,
  value: string | number,
  currentColor: string,
  purify: Purify,
  resolveSpecialCase: SpecialCaseResolver
): SpecialCaseResult {
  // Satori currently assumes horizontal-tb/LTR flow, so logical mappings
  // intentionally resolve inline-start/end to left/right and block to top/bottom.
  // Logical sizing
  if (name === 'inlineSize')
    return (
      resolveSpecialCase('width', value, currentColor) || {
        width: purify('width', value),
      }
    )
  if (name === 'blockSize')
    return (
      resolveSpecialCase('height', value, currentColor) || {
        height: purify('height', value),
      }
    )

  const purifiedAlias = resolvePurifiedLogicalAlias(name, value, purify)
  if (purifiedAlias) return purifiedAlias

  const rawAlias = resolveRawLogicalAlias(name, value)
  if (rawAlias) return rawAlias

  // Logical margin
  if (name === 'marginInline') {
    const vals = splitSpaceValues(value)
    return {
      marginLeft: purify('marginLeft', vals[0]),
      marginRight: purify('marginRight', vals[1] || vals[0]),
    }
  }
  if (name === 'marginBlock') {
    const vals = splitSpaceValues(value)
    return {
      marginTop: purify('marginTop', vals[0]),
      marginBottom: purify('marginBottom', vals[1] || vals[0]),
    }
  }

  // Logical padding
  if (name === 'paddingInline') {
    const vals = splitSpaceValues(value)
    return {
      paddingLeft: purify('paddingLeft', vals[0]),
      paddingRight: purify('paddingRight', vals[1] || vals[0]),
    }
  }
  if (name === 'paddingBlock') {
    const vals = splitSpaceValues(value)
    return {
      paddingTop: purify('paddingTop', vals[0]),
      paddingBottom: purify('paddingBottom', vals[1] || vals[0]),
    }
  }

  // Logical inset
  if (name === 'insetInline') {
    const vals = splitSpaceValues(value)
    return {
      left: purify('left', vals[0]),
      right: purify('right', vals[1] || vals[0]),
    }
  }
  if (name === 'insetBlock') {
    const vals = splitSpaceValues(value)
    return {
      top: purify('top', vals[0]),
      bottom: purify('bottom', vals[1] || vals[0]),
    }
  }
  if (name === 'inset') {
    const vals = splitSpaceValues(value)
    const [t, r = t, b = t, l = r] = vals
    return {
      top: purify('top', t),
      right: purify('right', r),
      bottom: purify('bottom', b),
      left: purify('left', l),
    }
  }

  // Logical border shorthand
  if (name === 'borderInline') {
    const resolved = resolveSpecialCase('border', value, currentColor)
    if (!resolved) return
    const result: Record<string, string | number | object | undefined> = {}
    for (const k of ['Left', 'Right']) {
      for (const p of ['Width', 'Style', 'Color']) {
        result['border' + k + p] = resolved['borderTop' + p]
      }
    }
    return result
  }
  if (name === 'borderBlock') {
    const resolved = resolveSpecialCase('border', value, currentColor)
    if (!resolved) return
    const result: Record<string, string | number | object | undefined> = {}
    for (const k of ['Top', 'Bottom']) {
      for (const p of ['Width', 'Style', 'Color']) {
        result['border' + k + p] = resolved['borderTop' + p]
      }
    }
    return result
  }
  if (name === 'borderInlineStart')
    return resolveSpecialCase('borderLeft', value, currentColor)
  if (name === 'borderInlineEnd')
    return resolveSpecialCase('borderRight', value, currentColor)
  if (name === 'borderBlockStart')
    return resolveSpecialCase('borderTop', value, currentColor)
  if (name === 'borderBlockEnd')
    return resolveSpecialCase('borderBottom', value, currentColor)

  // Logical border sub-properties (width)
  if (name === 'borderInlineWidth') {
    const vals = splitSpaceValues(value)
    return {
      borderLeftWidth: purify('borderLeftWidth', vals[0]),
      borderRightWidth: purify('borderRightWidth', vals[1] || vals[0]),
    }
  }
  if (name === 'borderBlockWidth') {
    const vals = splitSpaceValues(value)
    return {
      borderTopWidth: purify('borderTopWidth', vals[0]),
      borderBottomWidth: purify('borderBottomWidth', vals[1] || vals[0]),
    }
  }

  // Logical border sub-properties (style)
  if (name === 'borderInlineStyle') {
    const vals = splitSpaceValues(value)
    return {
      borderLeftStyle: vals[0],
      borderRightStyle: vals[1] || vals[0],
    }
  }
  if (name === 'borderBlockStyle') {
    const vals = splitSpaceValues(value)
    return {
      borderTopStyle: vals[0],
      borderBottomStyle: vals[1] || vals[0],
    }
  }

  // Logical border sub-properties (color)
  if (name === 'borderInlineColor') {
    const vals = splitSpaceValues(value)
    return {
      borderLeftColor: vals[0],
      borderRightColor: vals[1] || vals[0],
    }
  }
  if (name === 'borderBlockColor') {
    const vals = splitSpaceValues(value)
    return {
      borderTopColor: vals[0],
      borderBottomColor: vals[1] || vals[0],
    }
  }
}
