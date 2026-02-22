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
| `all` | **Supported (approx.)** | Supports `initial`, `unset`, `inherit`; `revert` / `revert-layer` are approximated as `initial` because origin/layer cascade history is not modeled. `direction` and `unicode-bidi` are excluded from reset per spec. Display fallback follows Satori element presets (Yoga/flex-oriented), not full browser UA stylesheet behavior. |
| `appearance` | N/A | Platform-native form control styling |
| `zoom` | **Supported (approx.)** | Maps to `transform: scale(...)` and does not perform browser-like layout reflow. Combining `zoom` with explicit transforms is only approximate compared with browser coordinate-space behavior. |
| `aspect-ratio` | **Supported** | Number and fraction syntax (e.g. `1.5`, `16/9`) |
| `object-fit` | **Supported (partial)** | Supports `fill`, `contain`, `cover`, `none`, and `scale-down` for `<img>`. Behavior is based on intrinsic image dimensions and clipped to the rendered image box. |
| `object-position` | **Supported (partial)** | Supports keyword alignment plus `%` and length coordinates for one/two-value syntax and side-offset forms (`left/right/top/bottom/center`, `25% 75%`, `10px 20px`, `right 10px`, `top 20px right`, `right 10px bottom 20px`) and simple `calc(...)` length/percentage coordinates. Coverage is still approximate for full CSS parsing edge-cases. |

## Functional integration gap (non-CSS)

| Capability | Priority | Notes |
|------------|----------|-------|
| Static rich-text serialization pipeline | P1 | Runtime editor/component trees are not executable during static SVG generation. Input should be pre-serialized to deterministic static JSX/HTML before passing into Satori. Add parser/serializer tests for nested marks, links, lists, tables, and code blocks. |

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
