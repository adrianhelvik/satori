# Box Model & Borders

## What Satori supports

- `width`, `height`, `min-width`, `min-height`, `max-width`, `max-height`
- `margin` (all sides + shorthand)
- `padding` (all sides + shorthand)
- `border` (all sides, width/style/color)
- `border-radius` (all corners, including `x / y` syntax)
- Border styles: `solid`, `dashed`, `dotted`, `double`, `inset` (approx), `outset` (approx), `groove` (approx), `ridge` (approx)
- `outline`, `outline-width`, `outline-style`, `outline-color`, `outline-offset` (`solid`, `dashed`, `dotted`, `double`, `groove`*, `ridge`*, `inset`*, `outset`*)
- `aspect-ratio`
- Logical sizing aliases: `inline-size`, `block-size`, `min-inline-size`, `min-block-size`, `max-inline-size`, `max-block-size`

## Missing properties

### Border styles (remaining caveats)

| Value | Feasibility | Notes |
|-------|-------------|-------|
| `groove` | **Supported (approx.)** | Accepted syntax with dual-band bevel approximation on straight edges; rounded corners still use simplified shading. |
| `ridge` | **Supported (approx.)** | Accepted syntax with dual-band bevel approximation on straight edges; rounded corners still use simplified shading. |

> `inset`/`outset` use SVG-friendly side shading (top/left vs bottom/right tinting). `groove`/`ridge` use a dual-band bevel approximation for straight-edged borders/outlines; rounded corners still fall back to simpler shading.

> `*` Outline `groove`/`ridge`/`inset`/`outset` values are accepted. `inset`/`outset` use side shading, while `groove`/`ridge` now use a dual-band bevel approximation for straight-edged outlines (rounded corners still fall back to single-stroke approximation).

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
