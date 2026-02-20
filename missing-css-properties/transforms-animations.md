# Transforms & Animations

## What Satori supports

- `transform`: `translateX`, `translateY`, `translate`, `scale`, `scaleX`, `scaleY`, `rotate`, `skewX`, `skewY`
- `transform-origin`

## Missing properties

### 3D transforms

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `transform: translateZ()` | N/A | SVG is 2D — no z-axis |
| `transform: translate3d()` | N/A | Same |
| `transform: rotateX/Y/Z()` | N/A | No 3D rotation in SVG |
| `transform: rotate3d()` | N/A | Same |
| `transform: scaleZ()` | N/A | No z-axis scaling |
| `transform: scale3d()` | N/A | Same |
| `transform: perspective()` | N/A | No perspective projection |
| `transform: matrix3d()` | N/A | No 3D matrix |
| `transform-style` | N/A | `preserve-3d` has no SVG equivalent |
| `perspective` | N/A | No perspective in SVG |
| `perspective-origin` | N/A | Same |
| `backface-visibility` | N/A | No 3D backface |

### 2D transforms (missing)

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `transform: matrix()` | Feasible | 2D affine matrix — could map to SVG `matrix()` transform |
| `rotate` (individual property) | Feasible | CSS individual transform property — could expand to `transform: rotate()` |
| `scale` (individual property) | Feasible | Same |
| `translate` (individual property) | Feasible | Same |

### Transitions

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `transition` | N/A | Satori renders a single static frame — no state changes |
| `transition-property` | N/A | |
| `transition-duration` | N/A | |
| `transition-timing-function` | N/A | |
| `transition-delay` | N/A | |
| `transition-behavior` | N/A | |

### Animations

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `animation` | N/A | Static SVG has no animation runtime. (SVG SMIL animations exist but are a different paradigm.) |
| `animation-name` | N/A | |
| `animation-duration` | N/A | |
| `animation-timing-function` | N/A | |
| `animation-delay` | N/A | |
| `animation-iteration-count` | N/A | |
| `animation-direction` | N/A | |
| `animation-fill-mode` | N/A | |
| `animation-play-state` | N/A | |
| `animation-composition` | N/A | |
| `animation-timeline` | N/A | |
| `animation-range` | N/A | |

### Performance hints

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `will-change` | N/A | Browser compositing hint — no compositor in static rendering |

### Motion path

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `offset` | N/A | Element follows a path — only meaningful with animation |
| `offset-path` | N/A | |
| `offset-distance` | N/A | |
| `offset-rotate` | N/A | |
| `offset-anchor` | N/A | |
| `offset-position` | N/A | |
