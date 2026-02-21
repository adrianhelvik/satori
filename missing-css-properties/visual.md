# Visual & Decoration

## What Satori supports

- `background-color`, `background-image` (linear/radial/repeating gradients, url), `background-position`, `background-size`, `background-repeat` (`repeat`, `no-repeat`, `repeat-x`, `repeat-y`, `round`, `space`), `background-clip` (`border-box`, `padding-box`, `content-box`, `text`), `background-attachment`, `background-origin` (`padding-box`, `border-box`, `content-box`)
- `background-position-x`, `background-position-y`
- `background-blend-mode` (partial; exact for solid-color layers)
- `box-shadow` (including inset, spread radius)
- `opacity`
- `filter`
- `mix-blend-mode` (partial; native SVG support varies by renderer, with a solid-rect fallback for common `multiply`/`screen` overlap cases)
- `isolation`
- `color`
- `mask-image`, `mask-position`, `mask-size`, `mask-repeat`
- `mask-origin`, `mask-clip`, `mask-type`, `mask-mode` (`alpha`, `luminance`, `match-source` approximations)
- `image-rendering`, `image-orientation` (`image-rendering` is normalized to SVG-compatible values, e.g. `pixelated` → `optimizeSpeed`)
- `clip-path`

## Missing properties

### Blending & compositing

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `background-blend-mode` | **Supported (partial)** | Exact compositing for solid-color layers (including flat gradients/colors) across common blend modes (`multiply`, `screen`, `overlay`, `darken`, `lighten`, `difference`, `exclusion`, `hard-light`, `soft-light`, `color-dodge`, `color-burn`, `hue`, `saturation`, `color`, `luminosity`). Non-uniform/image layers fall back to renderer-dependent SVG blending behavior. |
| `mix-blend-mode` | **Supported (partial)** | Native SVG blend support is renderer-dependent. Satori includes a geometric fallback for simple solid-rect overlaps on neutral parent backdrops for `multiply`, `screen`, `darken`, `lighten`, `difference`, `exclusion`, `plus-lighter`, `overlay`, and `hard-light` (with `overlay`/`hard-light` using a neutral gray backdrop). |

### Backdrop

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `backdrop-filter` | Hard | Applies filter to content *behind* the element. SVG has `<feImage>` + `<feBlend>` but capturing "what's behind" is architecturally difficult in Satori's single-pass rendering. |

### Background (missing sub-properties)

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `background-blend-mode` | **Supported (partial)** | See blending section above |

### Mask (missing sub-properties)

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `mask-mode` | **Supported (approx.)** | Supports `alpha`, `luminance`, and `match-source` (mapped to alpha semantics for image/gradient masks). Per-layer mixed-mode behavior remains approximate due single SVG mask pipeline. |
| `mask-composite` | **Supported (partial)** | Supports `add`, `intersect`, `subtract`, `exclude` for layered masks. Compositing remains approximate for complex multi-layer/mixed-mode pipelines. |
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
