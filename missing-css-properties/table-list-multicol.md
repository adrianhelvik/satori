# Table, List & Multi-column Layout

Satori does not support table layout, list styling, or multi-column layout. These all require layout models beyond Flexbox.

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
| `list-style` | Feasible | Could render markers as inline text/SVG before list items |
| `list-style-type` | Feasible | Disc, circle, decimal, etc. — map to SVG shapes or text |
| `list-style-position` | Feasible | Inside vs. outside positioning |
| `list-style-image` | Feasible | Custom marker image |
| `counter-reset` | Hard | Requires a counter state machine across the tree |
| `counter-increment` | Hard | Same |
| `counter-set` | Hard | Same |

> List markers are feasible since they're essentially prepended content. Counters are harder because they require stateful tree traversal.

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
