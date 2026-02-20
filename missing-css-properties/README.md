# Missing CSS Properties in Satori

This directory documents CSS properties that are **not supported** by Satori, organized by category. Each file covers a specific area of the CSS spec.

Satori supports ~80 CSS properties (mostly Flexbox layout, basic typography, backgrounds, borders, transforms, and masks). The full CSS spec defines ~370+ properties. This gap analysis covers what's missing and, where applicable, notes why a property is difficult or impossible to implement in an SVG-rendering context.

## Files

| File | Category | Key gaps |
|------|----------|----------|
| [layout.md](layout.md) | Layout & Display | Grid, float, `position: fixed/sticky`, writing-mode/RTL |
| [typography.md](typography.md) | Typography & Fonts | OpenType features, font-variant, hyphenation, text emphasis |
| [box-model.md](box-model.md) | Box Model & Borders | `border-image`, advanced border styles (`groove/ridge/...`), shape-outside |
| [visual.md](visual.md) | Visual & Decoration | backdrop-filter, background-blend-mode, mask composition/origin/mode |
| [transforms-animations.md](transforms-animations.md) | Transforms & Animations | 3D transforms, transitions, animations, will-change |
| [table-list-multicol.md](table-list-multicol.md) | Table, List & Multi-column | All table/list/column properties |
| [scroll-interaction.md](scroll-interaction.md) | Scroll & Interaction | All scroll-snap, cursor, pointer-events, user-select |
| [logical-properties.md](logical-properties.md) | Logical Properties | Writing-mode-aware remapping (RTL/vertical), flow-relative behavior beyond ltr/horizontal |
| [containment-misc.md](containment-misc.md) | Containment, Performance & Misc | Container queries, content-visibility, generated content |

## Context

Satori renders to static SVG. Many missing properties fall into categories that are inherently dynamic (animations, scroll, interaction) or depend on browser layout models Satori doesn't implement (Grid, table, multi-column). These are noted with a **feasibility** assessment:

- **Feasible** — could be implemented with reasonable effort
- **Hard** — would require significant new infrastructure
- **N/A** — not applicable to static SVG rendering
