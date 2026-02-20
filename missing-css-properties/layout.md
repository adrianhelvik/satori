# Layout & Display

## What Satori supports

- `display`: `flex`, `block`, `none`, `contents`, `-webkit-box`
- `position`: `relative`, `absolute`, `static`
- `top`, `right`, `bottom`, `left`
- `overflow`: `visible`, `hidden`
- `box-sizing`: `border-box`, `content-box`
- Flexbox: `flex-direction`, `flex-wrap`, `flex-grow`, `flex-shrink`, `flex-basis`, `flex`, `align-items`, `align-self`, `align-content`, `justify-content`, `gap`, `row-gap`, `column-gap`

## Missing properties

### Display modes

| Property | Values missing | Feasibility | Notes |
|----------|---------------|-------------|-------|
| `display` | `inline`, `inline-block`, `inline-flex`, `grid`, `inline-grid`, `table`, `list-item` | Hard | Satori maps everything to Yoga's flex model. Inline layout would require a line-box model. Grid would need a full grid solver. |

### Positioning

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `position: fixed` | N/A | No viewport scrolling in static SVG |
| `position: sticky` | N/A | Requires scroll context |
| `z-index` | Feasible | Currently warns "not supported" (`expand.ts:62`). Yoga doesn't handle stacking, but SVG paint order could be reordered post-layout. |
| `inset` | Feasible | Shorthand for `top`/`right`/`bottom`/`left` — straightforward to expand |

### Overflow

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `overflow-x` | Feasible | Currently only combined `overflow` is supported |
| `overflow-y` | Feasible | Same as above |
| `overflow-clip-margin` | Hard | Would need clip-path offset calculations |

### Visibility & ordering

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `visibility` | Feasible | Could map to SVG `visibility` attribute |
| `isolation` | Hard | Would need stacking context tracking |
| `order` | Feasible | Yoga supports `order` — just not wired up |

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
| `justify-items` | All | Feasible | Yoga may support this |
| `justify-self` | All | Feasible | Same |
| `place-content` | All | Feasible | Shorthand for `align-content` + `justify-content` |
| `place-items` | All | Feasible | Shorthand for `align-items` + `justify-items` |
| `place-self` | All | Feasible | Shorthand for `align-self` + `justify-self` |
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
