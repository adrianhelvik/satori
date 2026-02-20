# Visual & Decoration

## What Satori supports

- `background-color`, `background-image` (linear/radial/repeating gradients, url), `background-position`, `background-size`, `background-repeat`, `background-clip` (border-box, text), `background-attachment`, `background-origin`
- `background-position-x`, `background-position-y`
- `box-shadow` (including inset, spread radius)
- `opacity`
- `filter`
- `mix-blend-mode`
- `isolation`
- `color`
- `mask-image`, `mask-position`, `mask-size`, `mask-repeat`
- `mask-origin`, `mask-clip`, `mask-type`, `mask-mode` (`alpha`, `luminance`, `match-source` approximations)
- `image-rendering`, `image-orientation` (passed through to SVG image nodes)
- `clip-path`

## Missing properties

### Blending & compositing

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `background-blend-mode` | Hard | Blending between background layers — would need compositing in the gradient/image builder |

### Backdrop

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `backdrop-filter` | Hard | Applies filter to content *behind* the element. SVG has `<feImage>` + `<feBlend>` but capturing "what's behind" is architecturally difficult in Satori's single-pass rendering. |

### Background (missing sub-properties)

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `background-blend-mode` | Hard | See blending section above |

### Mask (missing sub-properties)

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `mask-mode` | **Supported (approx.)** | Supports `alpha`, `luminance`, and `match-source` (mapped to alpha semantics for image/gradient masks). Per-layer mixed-mode behavior remains approximate due single SVG mask pipeline. |
| `mask-composite` | **Supported (partial)** | `intersect` is supported for layered masks. Other operators currently fall back to additive composition. |
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
