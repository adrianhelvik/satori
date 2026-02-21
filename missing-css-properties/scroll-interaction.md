# Scroll & Interaction

Satori renders static SVG — there is no scrolling runtime, input handling, or dynamic behavior in rasterized output. A few interaction-related properties are still forwarded to generated SVG so they can work when raw SVG is embedded interactively.

## Scroll behavior

| Property | Notes |
|----------|-------|
| `scroll-behavior` | No scrolling in static SVG |
| `scroll-snap-type` | |
| `scroll-snap-align` | |
| `scroll-snap-stop` | |
| `scroll-margin` (+ all sides/logical variants) | |
| `scroll-padding` (+ all sides/logical variants) | |
| `overflow-anchor` | |
| `overscroll-behavior` (+ x/y/block/inline) | |

## Scroll-driven animations

| Property | Notes |
|----------|-------|
| `scroll-timeline` | No scrolling or animation runtime |
| `scroll-timeline-name` | |
| `scroll-timeline-axis` | |
| `view-timeline` | |
| `view-timeline-name` | |
| `view-timeline-axis` | |
| `view-timeline-inset` | |
| `timeline-scope` | |

## Interaction

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `cursor` | **Supported (SVG pass-through)** | Forwarded to generated SVG nodes (`cursor` style/attribute). Useful when consuming raw SVG in interactive contexts; rasterized outputs are visually unchanged. |
| `pointer-events` | **Supported (SVG pass-through)** | Forwarded to generated SVG nodes (`pointer-events` style/attribute). This is meaningful when consuming raw SVG interactively; rasterized outputs are visually unchanged. |
| `user-select` | **Supported (SVG pass-through)** | Forwarded as `user-select` CSS on generated SVG text/shape nodes. Useful for interactive raw SVG embedding; rasterized outputs are visually unchanged. |
| `resize` | N/A | No resize handles |
| `touch-action` | **Supported (SVG pass-through)** | Forwarded as `touch-action` CSS on generated SVG nodes. Useful when embedding raw SVG in interactive touch contexts; rasterized outputs are visually unchanged. |
| `caret-color` | N/A | No text input |
| `caret-shape` | N/A | No text input |
| `field-sizing` | N/A | No form fields |
