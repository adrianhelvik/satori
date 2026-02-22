# Layout & Display

## What Satori supports

- `display`: `flex`, `block`, `inline`, `flow-root`, `inline-block`, `inline-flex`, `grid`, `inline-grid`, `table`, `inline-table`, common `table-*` tokens (`table-row`, `table-cell`, `table-caption`, etc.), `none`, `contents`, `-webkit-box`, `list-item` (approximate flex mapping)
- `position`: `relative`, `absolute`, `static`
- `top`, `right`, `bottom`, `left`, `inset`
- `z-index`
- `overflow`, `overflow-x`, `overflow-y`: `visible`, `hidden`, `clip`, `auto`, `scroll` (`auto`/`scroll` clip content, scrollbar painting not modeled)
- `overflow-clip-margin` (partial; non-negative length + visual-box keyword support for rectangular clip paths)
- `visibility`: `visible`, `hidden`
- `box-sizing`: `border-box`, `content-box`
- Flexbox: `flex-direction`, `flex-wrap`, `flex-grow`, `flex-shrink`, `flex-basis`, `flex`, `align-items`, `align-self`, `align-content`, `justify-content`, `gap`, `row-gap`, `column-gap`
  - Alignment values include `start`/`end` aliases, `left`/`right`/`normal` compatibility values for `justify-content` (LTR approximation), `space-evenly` (for `justify-content` / `align-content`), and `safe`/`unsafe` prefixes (normalized to Yoga-compatible values).
- Alignment shorthands: `place-content`, `place-items`, `place-self`
- `order`

## Missing properties

### Display modes

| Property | Values missing | Feasibility | Notes |
|----------|---------------|-------------|-------|
| `display` | Full table semantics | Hard | `table`, `inline-table`, and common `table-*` tokens are accepted as syntax, but full table layout behavior is still incomplete. |

> `inline-block` and `inline-flex` are accepted, but both map to flex layout. Browser `inline-block` shrink-to-fit and inline formatting semantics are not modeled.

### Positioning

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `position: fixed` | **MOST IMPORTANT (P0)** | Accepted and mapped to `absolute`. True viewport anchoring semantics are not modeled yet. |
| `position: sticky` | **Supported (approx.)** | Accepted and mapped to `relative` in static SVG output (no scroll-stickiness behavior). |

#### P0 acceptance criteria for `position: fixed`

1. Fixed-position nodes remain anchored to viewport coordinates in nested layouts.
2. Fixed nodes are removed from normal flow like absolutely positioned nodes.
3. Overflow/transform interactions are explicitly defined and tested.
4. Comparable browser-diff fixtures stay within threshold.

### Overflow

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `overflow-clip-margin` | **Supported (partial)** | Supports non-negative length values and visual-box keywords (`content-box`, `padding-box`, `border-box`) for rectangular `overflow: clip` clipping. Rounded-path precision remains approximate. |

> `overflow: clip` is supported. In static rendering, `overflow: auto` and `overflow: scroll` are approximated as clipping behavior (like `hidden`) without scrollbar rendering. Per-axis behavior follows browser semantics, including asymmetric `overflow-x`/`overflow-y` combinations.

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
| `justify-items` | Flex-context behavior | Hard | Works in the grid rewrite path. Outside grid containers it does not affect layout (matching browser behavior for flex containers). |
| `justify-self` | Flex-context behavior | Hard | Works in the grid rewrite path. Outside grid containers it does not affect layout (matching browser behavior for flex containers). |
| `float` | All | Hard | Would require block formatting context |
| `clear` | All | Hard | Same — depends on float |

### CSS Grid (partial module support)

Supported grid subset:

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `display: grid` / `inline-grid` | Supported (approx.) | Rewritten to absolute-positioned children inside a relative container for static rendering. |
| `grid-template-rows` / `grid-template-columns` | Supported (partial) | Supports fixed lengths, `%`, `fr`, `auto`, and `repeat(n, ...)`. If container axis size is unspecified, fallback static track sizing is used. |
| `grid-auto-rows` / `grid-auto-columns` | Supported (partial) | Used for implicit tracks created by auto placement. |
| `grid-auto-flow` | Supported (partial) | Supports `row` (default) and `column` auto-flow directions. `dense` packing is not implemented. |
| `grid-row*` / `grid-column*` | Supported (partial) | Supports explicit line placement and simple `span`. |
| `gap` / `row-gap` / `column-gap` | Supported | Applied in both explicit and implicit track geometry. |
| `place-items` / `place-self` / `justify-items` / `justify-self` | Supported (grid only) | Mapped to per-cell flex alignment in the rewrite path. |

Still missing grid features:

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `grid-template-areas` | Hard | Named area parsing/placement is not implemented. |
| `grid-auto-flow: dense` | Hard | Dense backfilling is not implemented; sparse auto-placement only. |
| Negative line indexes, named lines, advanced `span` forms | Hard | Only common positive line and basic `span` syntax are supported. |
| Intrinsic min/max track sizing (`minmax()`, `fit-content()`, content-based sizing) | Hard | Track solver uses deterministic static approximations. |
| Baseline/subgrid/masonry behaviors | Very hard | Not modeled in current static solver. |

> Yoga does not implement CSS Grid. Current support is implemented via a userland rewrite/placement pass and intentionally targets static SVG rendering use cases.
