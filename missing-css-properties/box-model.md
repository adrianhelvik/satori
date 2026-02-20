# Box Model & Borders

## What Satori supports

- `width`, `height`, `min-width`, `min-height`, `max-width`, `max-height`
- `margin` (all sides + shorthand)
- `padding` (all sides + shorthand)
- `border` (all sides, width/style/color)
- `border-radius` (all corners, including `x / y` syntax)
- Border styles: `solid`, `dashed`, `dotted`, `double`, `inset` (approx), `outset` (approx), `groove` (approx), `ridge` (approx)
- `outline`, `outline-width`, `outline-style`, `outline-color`, `outline-offset`
- `aspect-ratio`
- Logical sizing aliases: `inline-size`, `block-size`, `min-inline-size`, `min-block-size`, `max-inline-size`, `max-block-size`

## Missing properties

### Border styles (remaining caveats)

| Value | Feasibility | Notes |
|-------|-------------|-------|
| `groove` | **Supported (approx.)** | Accepted syntax, currently rendered using solid-border semantics (no true bevel). |
| `ridge` | **Supported (approx.)** | Accepted syntax, currently rendered using solid-border semantics (no true bevel). |

> `inset`/`outset` use SVG-friendly side shading (top/left vs bottom/right tinting). `groove`/`ridge` are accepted but flattened to solid-border rendering.

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
