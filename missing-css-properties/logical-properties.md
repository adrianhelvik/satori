# Logical Properties

Satori supports logical properties as aliases to physical properties in the current layout mode (`horizontal-tb` + LTR assumptions). In practice this means inline-start/end are mapped as left/right and block-start/end as top/bottom. This is useful for code portability, but it is not a full writing-mode-aware implementation.

## Supported logical aliases (horizontal-tb / ltr)

### Margin

| Logical property | Physical equivalent |
|-----------------|-------------------|
| `margin-block` | `margin-top` + `margin-bottom` |
| `margin-block-start` | `margin-top` |
| `margin-block-end` | `margin-bottom` |
| `margin-inline` | `margin-left` + `margin-right` |
| `margin-inline-start` | `margin-left` |
| `margin-inline-end` | `margin-right` |

### Padding

| Logical property | Physical equivalent |
|-----------------|-------------------|
| `padding-block` | `padding-top` + `padding-bottom` |
| `padding-block-start` | `padding-top` |
| `padding-block-end` | `padding-bottom` |
| `padding-inline` | `padding-left` + `padding-right` |
| `padding-inline-start` | `padding-left` |
| `padding-inline-end` | `padding-right` |

### Inset (positioning)

| Logical property | Physical equivalent |
|-----------------|-------------------|
| `inset` | `top` + `right` + `bottom` + `left` |
| `inset-block` | `top` + `bottom` |
| `inset-block-start` | `top` |
| `inset-block-end` | `bottom` |
| `inset-inline` | `left` + `right` |
| `inset-inline-start` | `left` |
| `inset-inline-end` | `right` |

### Border

| Logical property | Physical equivalent |
|-----------------|-------------------|
| `border-block` | `border-top` + `border-bottom` |
| `border-block-start` | `border-top` |
| `border-block-start-width` | `border-top-width` |
| `border-block-start-style` | `border-top-style` |
| `border-block-start-color` | `border-top-color` |
| `border-block-end` | `border-bottom` |
| `border-block-end-width` | `border-bottom-width` |
| `border-block-end-style` | `border-bottom-style` |
| `border-block-end-color` | `border-bottom-color` |
| `border-block-width` | `border-top-width` + `border-bottom-width` |
| `border-block-style` | `border-top-style` + `border-bottom-style` |
| `border-block-color` | `border-top-color` + `border-bottom-color` |
| `border-inline` | `border-left` + `border-right` |
| `border-inline-start` | `border-left` |
| `border-inline-start-width` | `border-left-width` |
| `border-inline-start-style` | `border-left-style` |
| `border-inline-start-color` | `border-left-color` |
| `border-inline-end` | `border-right` |
| `border-inline-end-width` | `border-right-width` |
| `border-inline-end-style` | `border-right-style` |
| `border-inline-end-color` | `border-right-color` |
| `border-inline-width` | `border-left-width` + `border-right-width` |
| `border-inline-style` | `border-left-style` + `border-right-style` |
| `border-inline-color` | `border-left-color` + `border-right-color` |

### Border radius

| Logical property | Physical equivalent |
|-----------------|-------------------|
| `border-start-start-radius` | `border-top-left-radius` |
| `border-start-end-radius` | `border-top-right-radius` |
| `border-end-start-radius` | `border-bottom-left-radius` |
| `border-end-end-radius` | `border-bottom-right-radius` |

### Size

| Logical property | Physical equivalent |
|-----------------|-------------------|
| `inline-size` | `width` |
| `block-size` | `height` |
| `min-inline-size` | `min-width` |
| `min-block-size` | `min-height` |
| `max-inline-size` | `max-width` |
| `max-block-size` | `max-height` |

## Remaining relevant gaps

- Writing-mode-aware remapping (`vertical-rl`, `vertical-lr`, etc.).
- Direction-aware remapping for RTL (`direction: rtl` / bidi behavior).
- Full logical behavior for features tied to writing modes beyond simple side aliasing.
