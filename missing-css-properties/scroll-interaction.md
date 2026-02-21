# Scroll & Interaction

Satori renders static SVG — there is no scrolling, user interaction, or dynamic behavior. All properties in this category are **N/A**.

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
| `cursor` | N/A | No pointer in static rendering |
| `pointer-events` | **Supported (SVG pass-through)** | Forwarded to generated SVG nodes (`pointer-events` style/attribute). This is meaningful when consuming raw SVG interactively; rasterized outputs are visually unchanged. |
| `user-select` | N/A | No text selection |
| `resize` | N/A | No resize handles |
| `touch-action` | N/A | No touch input |
| `caret-color` | N/A | No text input |
| `caret-shape` | N/A | No text input |
| `field-sizing` | N/A | No form fields |
