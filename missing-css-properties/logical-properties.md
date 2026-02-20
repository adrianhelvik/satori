# Logical Properties

Satori does not support any CSS logical properties. Logical properties are flow-relative alternatives to physical properties (e.g., `margin-inline-start` instead of `margin-left`), designed for internationalization and writing-mode support.

Since Satori doesn't support `writing-mode` or `direction: rtl`, logical properties would currently just be aliases for their physical counterparts. However, they're still useful for code portability.

## Feasibility

All logical properties below are **Feasible** — they would expand to their physical equivalents in `handler/expand.ts`, assuming horizontal-tb / ltr (Satori's only layout mode).

## Missing properties

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
