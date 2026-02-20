# Layout & Display

## What Satori supports

- `display`: `flex`, `block`, `inline`, `inline-block`, `inline-flex`, `none`, `contents`, `-webkit-box`, `list-item` (approximate flex mapping)
- `position`: `relative`, `absolute`, `static`
- `top`, `right`, `bottom`, `left`, `inset`
- `z-index`
- `overflow`, `overflow-x`, `overflow-y`: `visible`, `hidden`, `clip`
- `overflow-clip-margin` (partial; non-negative length + visual-box keyword support for rectangular clip paths)
- `visibility`: `visible`, `hidden`
- `box-sizing`: `border-box`, `content-box`
- Flexbox: `flex-direction`, `flex-wrap`, `flex-grow`, `flex-shrink`, `flex-basis`, `flex`, `align-items`, `align-self`, `align-content`, `justify-content`, `gap`, `row-gap`, `column-gap`
- Alignment shorthands: `place-content`, `place-items`, `place-self`
- `order`

## Missing properties

### Display modes

| Property | Values missing | Feasibility | Notes |
|----------|---------------|-------------|-------|
| `display` | `grid`, `inline-grid`, `table` | Hard | Satori maps everything to Yoga's flex model. `inline*` values are accepted but mapped to flex without line-box semantics. Grid would need a full grid solver. |

> `inline-block` and `inline-flex` are accepted, but both map to flex layout. Browser `inline-block` shrink-to-fit and inline formatting semantics are not modeled.

### Positioning

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `position: fixed` | N/A | No viewport scrolling in static SVG |
| `position: sticky` | N/A | Requires scroll context |

### Overflow

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `overflow-clip-margin` | **Supported (partial)** | Supports non-negative length values and visual-box keywords (`content-box`, `padding-box`, `border-box`) for rectangular `overflow: clip` clipping. Rounded-path precision remains approximate. |

> `overflow: clip` is supported. Shorthand `clip` behaves like hidden clipping. Per-axis behavior follows browser semantics, including asymmetric `overflow-x`/`overflow-y` combinations.

### Visibility & ordering

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `isolation` | Hard | Would need stacking context tracking |

### Writing modes & direction

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `writing-mode` | Hard | Yoga has limited vertical writing mode support. Text rendering would need major changes. |
| `direction` | Hard | RTL layout requires bidi algorithm integration |
| `unicode-bidi` | Hard | Same — requires bidi |
| `text-orientation` | Hard | Requires vertical writing mode support first |

### Alignment (missing values)

| Property | Values missing | Feasibility | Notes |
|----------|---------------|-------------|-------|
| `vertical-align` | All | Hard | Only meaningful for inline/table-cell layout which Satori doesn't implement |
| `justify-items` | All meaningful effects | Hard | Grid-focused property. In Satori's flex-only layout it is accepted syntax but has no layout effect for browser parity. |
| `justify-self` | All meaningful effects | Hard | Same. It is ignored for flex layout. |
| `float` | All | Hard | Would require block formatting context |
| `clear` | All | Hard | Same — depends on float |

### CSS Grid (entire module)

None of the grid properties are supported:

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `grid` | Hard | Would need a full grid layout solver |
| `grid-template-rows` | Hard | |
| `grid-template-columns` | Hard | |
| `grid-template-areas` | Hard | |
| `grid-auto-rows` | Hard | |
| `grid-auto-columns` | Hard | |
| `grid-auto-flow` | Hard | |
| `grid-row` / `grid-row-start` / `grid-row-end` | Hard | |
| `grid-column` / `grid-column-start` / `grid-column-end` | Hard | |
| `grid-area` | Hard | |

> Yoga does not implement CSS Grid. Supporting grid would require either replacing Yoga with a grid-capable engine or implementing a grid solver in userland.
