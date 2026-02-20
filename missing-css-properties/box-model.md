# Box Model & Borders

## What Satori supports

- `width`, `height`, `min-width`, `min-height`, `max-width`, `max-height`
- `margin` (all sides + shorthand)
- `padding` (all sides + shorthand)
- `border` (all sides, width/style/color)
- `border-radius` (all corners, including `x / y` syntax)
- Border styles: `solid`, `dashed`

## Missing properties

### Border styles (missing values)

| Value | Feasibility | Notes |
|-------|-------------|-------|
| `dotted` | Feasible | Could use SVG `stroke-dasharray` with round caps. Currently only `solid` and `dashed` are rendered for borders (though `dotted` works for text-decoration). |
| `double` | Feasible | Two parallel lines — straightforward SVG path generation |
| `groove` | Hard | Requires simulated 3D shading |
| `ridge` | Hard | Same |
| `inset` | Hard | Same |
| `outset` | Hard | Same |

### Border image

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `border-image` | Hard | Shorthand for all border-image properties |
| `border-image-source` | Hard | Would need image slicing and rendering along borders |
| `border-image-slice` | Hard | Nine-slice algorithm |
| `border-image-width` | Hard | Border image width override |
| `border-image-outset` | Hard | Extends border image beyond border box |
| `border-image-repeat` | Hard | Stretch/repeat/round/space for border image |

### Outline

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `outline` | Feasible | A non-layout-affecting border. Could render as an additional SVG rect outside the border. |
| `outline-width` | Feasible | |
| `outline-style` | Feasible | |
| `outline-color` | Feasible | |
| `outline-offset` | Feasible | Gap between outline and border edge |

### Box model sizing

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `aspect-ratio` | Feasible | `compute.ts:246` has a `@TODO` for this. Yoga 3.x supports `setAspectRatio`. Currently only used internally for images. |
| `inline-size` | Feasible | Logical equivalent of `width` (in horizontal writing mode) |
| `block-size` | Feasible | Logical equivalent of `height` |
| `min-inline-size` | Feasible | |
| `min-block-size` | Feasible | |
| `max-inline-size` | Feasible | |
| `max-block-size` | Feasible | |

### Shape

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `shape-outside` | Hard | Wrapping content around a shape — requires inline layout |
| `shape-margin` | Hard | Depends on `shape-outside` |
| `shape-image-threshold` | Hard | Depends on `shape-outside` |
