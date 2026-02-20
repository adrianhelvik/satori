# Visual & Decoration

## What Satori supports

- `background-color`, `background-image` (linear/radial/repeating gradients, url), `background-position`, `background-size`, `background-repeat`, `background-clip` (border-box, text), `background-attachment`, `background-origin`
- `box-shadow` (including inset, spread radius)
- `opacity`
- `filter`
- `color`
- `mask-image`, `mask-position`, `mask-size`, `mask-repeat`
- `clip-path`

## Missing properties

### Blending & compositing

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `mix-blend-mode` | Feasible | SVG supports blend modes via `<feBlend>` filter primitives. Would need a filter definition per blend mode. |
| `background-blend-mode` | Hard | Blending between background layers — would need compositing in the gradient/image builder |
| `isolation` | Hard | Creates a new stacking context for blend mode containment |

### Backdrop

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `backdrop-filter` | Hard | Applies filter to content *behind* the element. SVG has `<feImage>` + `<feBlend>` but capturing "what's behind" is architecturally difficult in Satori's single-pass rendering. |

### Background (missing sub-properties)

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `background-position-x` | Feasible | Satori supports `background-position` but not the individual axis shorthands |
| `background-position-y` | Feasible | Same |
| `background-blend-mode` | Hard | See blending section above |

### Images

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `image-rendering` | Feasible | Maps directly to SVG `image-rendering` attribute |
| `image-orientation` | Feasible | EXIF orientation correction |

### Mask (missing sub-properties)

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `mask-mode` | Feasible | Luminance vs. alpha mask — SVG supports both |
| `mask-origin` | Feasible | Mask positioning area |
| `mask-clip` | Feasible | Mask painting area |
| `mask-composite` | Feasible | SVG compositing operators |
| `mask-type` | Feasible | SVG mask luminance/alpha type |
| `mask-border` | Hard | Border-image-style masking |
| `mask-border-source` | Hard | |
| `mask-border-slice` | Hard | |
| `mask-border-width` | Hard | |
| `mask-border-outset` | Hard | |
| `mask-border-repeat` | Hard | |
| `mask-border-mode` | Hard | |

### Color

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `color-scheme` | N/A | OS-level light/dark preference — not applicable to static rendering |
| `accent-color` | N/A | Form control accent — no form controls in Satori |
| `forced-color-adjust` | N/A | High-contrast mode — not applicable |
| `print-color-adjust` | N/A | Print hint — not applicable |
