# Table, List & Multi-column Layout

Satori does not support table layout or multi-column layout. List markers are supported with SVG-friendly approximations.

## Table properties

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `table-layout` | Hard | Would need a table layout algorithm |
| `border-collapse` | Hard | Requires table context |
| `border-spacing` | Hard | Requires table context |
| `caption-side` | Hard | Requires table context |
| `empty-cells` | Hard | Requires table context |

> Satori uses Yoga for layout, which only implements Flexbox. Table layout would require a separate layout solver or integration with a table-capable engine.

## List properties

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `list-style` | **Supported (approx.)** | Parses shorthand into marker type/position/image for list items. |
| `list-style-type` | **Supported (approx.)** | Supports common marker styles (`disc`, `circle`, `square`, `decimal`, alpha, roman), disclosure markers (`disclosure-open` / `disclosure-closed`), and quoted string markers (`"→"`). |
| `list-style-position` | **Supported (approx.)** | Supports `inside` and `outside` marker placement. |
| `list-style-image` | **Supported (approx.)** | Supports `url(...)` marker images. |
| `counter-reset` | Hard | Requires a counter state machine across the tree |
| `counter-increment` | Hard | Same |
| `counter-set` | Hard | Same |

> Marker rendering is implemented as prepended list-item content. Text marker width uses font metric measurement, while marker gap/icon sizing remain SVG-friendly approximations. CSS counters (`counter-*`) remain unsupported.

## Multi-column layout

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `columns` | Hard | Would need a column layout algorithm |
| `column-count` | Hard | Split content across N columns |
| `column-width` | Hard | Ideal column width |
| `column-gap` | Hard | (Flex/Grid `column-gap` IS supported, but not in multi-column context) |
| `column-rule` | Hard | Rule between columns |
| `column-rule-width` | Hard | |
| `column-rule-style` | Hard | |
| `column-rule-color` | Hard | |
| `column-span` | Hard | Element spanning all columns |
| `column-fill` | Hard | Balancing content across columns |

## Fragmentation / page breaks

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `break-before` | N/A | Paged media / multi-column fragmentation |
| `break-after` | N/A | Same |
| `break-inside` | N/A | Same |
| `orphans` | N/A | Paged media |
| `widows` | N/A | Paged media |
| `page-break-before` | N/A | Legacy paged media |
| `page-break-after` | N/A | Same |
| `page-break-inside` | N/A | Same |
