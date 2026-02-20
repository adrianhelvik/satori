# Box Model & Borders

## What Satori supports

- `width`, `height`, `min-width`, `min-height`, `max-width`, `max-height`
- `margin` (all sides + shorthand)
- `padding` (all sides + shorthand)
- `border` (all sides, width/style/color)
- `border-radius` (all corners, including `x / y` syntax)
- Border styles: `solid`, `dashed`, `dotted`, `double`
- `outline`, `outline-width`, `outline-style`, `outline-color`, `outline-offset`
- `aspect-ratio`
- Logical sizing aliases: `inline-size`, `block-size`, `min-inline-size`, `min-block-size`, `max-inline-size`, `max-block-size`

## Missing properties

### Border styles (missing values)

| Value | Feasibility | Notes |
|-------|-------------|-------|
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

### Shape

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `shape-outside` | Hard | Wrapping content around a shape — requires inline layout |
| `shape-margin` | Hard | Depends on `shape-outside` |
| `shape-image-threshold` | Hard | Depends on `shape-outside` |
