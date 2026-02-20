# Containment, Performance & Miscellaneous

## Containment & container queries

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `contain` | N/A | Browser rendering optimization — no meaning in static SVG |
| `container` | Hard | Container queries require tracking container dimensions during layout |
| `container-name` | Hard | Same |
| `container-type` | Hard | Same |
| `content-visibility` | N/A | Rendering optimization for off-screen content |
| `contain-intrinsic-size` | N/A | Placeholder size for `content-visibility: auto` |
| `contain-intrinsic-width` | N/A | Same |
| `contain-intrinsic-height` | N/A | Same |
| `contain-intrinsic-block-size` | N/A | Same |
| `contain-intrinsic-inline-size` | N/A | Same |

## Generated content

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `content` | Hard | `::before` / `::after` pseudo-elements are not supported in Satori's JSX model. Users must create explicit child elements instead. |

## Miscellaneous

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `all` | **Supported (approx.)** | Supports `initial`, `unset`, `inherit` (plus `revert` aliases) via reset/rehydration of Satori-managed style properties. Does not fully emulate full-browser cascade/layer semantics. |
| `appearance` | N/A | Platform-native form control styling |
| `zoom` | **Supported (approx.)** | Maps to `transform: scale(...)` with top-left anchoring for zoom-only cases. Does not fully emulate browser layout reflow semantics. |
| `aspect-ratio` | **Supported** | Number and fraction syntax (e.g. `1.5`, `16/9`) |
| `object-fit` | **Supported** | `contain`, `cover`, `none` |
| `object-position` | **Supported** | Various keyword combinations |

## SVG presentation properties

These are CSS properties that apply to SVG elements. Satori's `preprocess.ts` maps React camelCase attribute names to SVG kebab-case (e.g., `fillOpacity` → `fill-opacity`), but these are **SVG attributes on `<svg>` children**, not CSS properties applied to the layout:

| Property | Status | Notes |
|----------|--------|-------|
| `fill` | Attribute only | Works on SVG child elements, not as a CSS style |
| `fill-opacity` | Attribute only | Same |
| `fill-rule` | Attribute only | Same |
| `stroke` | Attribute only | Same |
| `stroke-width` | Attribute only | Same |
| `stroke-opacity` | Attribute only | Same |
| `stroke-linecap` | Attribute only | Same |
| `stroke-linejoin` | Attribute only | Same |
| `stroke-miterlimit` | Attribute only | Same |
| `stroke-dasharray` | Attribute only | Same |
| `stroke-dashoffset` | Attribute only | Same |

These work when you embed `<svg>` elements in your JSX — the attributes are passed through to the SVG output. They just aren't part of Satori's CSS style processing pipeline.
