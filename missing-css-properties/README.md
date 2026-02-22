# Missing CSS Properties in Satori

This directory documents CSS properties that are **not supported** by Satori, organized by category. Each file covers a specific area of the CSS spec.

Satori supports ~80 CSS properties (mostly Flexbox layout, basic typography, backgrounds, borders, transforms, and masks). The full CSS spec defines ~370+ properties. This gap analysis covers what's missing and, where applicable, notes why a property is difficult or impossible to implement in an SVG-rendering context.

## Files

| File | Category | Key gaps |
|------|----------|----------|
| [layout.md](layout.md) | Layout & Display | Grid, float, `position: fixed/sticky`, writing-mode/RTL |
| [typography.md](typography.md) | Typography & Fonts | OpenType features, font-variant, hyphenation, advanced decoration emphasis |
| [box-model.md](box-model.md) | Box Model & Borders | `border-image`, advanced border styles (`groove/ridge/...`), shape-outside |
| [visual.md](visual.md) | Visual & Decoration | backdrop-filter, non-uniform blend parity, mask-border/full mask parity |
| [transforms-animations.md](transforms-animations.md) | Transforms & Animations | 3D transforms, transitions, animations, will-change |
| [table-list-multicol.md](table-list-multicol.md) | Table, List & Multi-column | Table layout, CSS counters, multi-column |
| [scroll-interaction.md](scroll-interaction.md) | Scroll & Interaction | Scroll-snap/runtime interaction features (with SVG pass-through for `cursor`/`pointer-events`/`user-select`/`touch-action`) |
| [logical-properties.md](logical-properties.md) | Logical Properties | Writing-mode-aware remapping (RTL/vertical), flow-relative behavior beyond ltr/horizontal |
| [containment-misc.md](containment-misc.md) | Containment, Performance & Misc | Container queries, content-visibility, generated content |
| [priority-roadmap.md](priority-roadmap.md) | Priority Roadmap | Highest-priority blockers, implementation plan, and acceptance criteria |
| [puppeteer-diff.md](puppeteer-diff.md) | Browser Diff Notes | How to compare Satori output against Chromium snapshots |

## Most Important Blockers (P0)

These are the highest-priority browser-compat gaps to work on next:

1. True `position: fixed` viewport anchoring semantics (currently approximated).
2. Table layout support for `rowSpan` / `colSpan` (current table display tokens map to flex).
3. CSS filter rendering parity for `blur()`, `brightness()`, `contrast()`, `saturate()`, `drop-shadow()`.
4. `conic-gradient()` / `repeating-conic-gradient()` background support.
5. `color-mix()` color parsing and evaluation in supported color spaces.

See [priority-roadmap.md](priority-roadmap.md) for detailed acceptance criteria and implementation sequencing.

## After P0 Is Done

After all P0 acceptance criteria are met, prioritize browser-compat polish:

1. SVG marker parity (`marker-start`, `marker-mid`, `marker-end`) and dedicated tests.
2. Better text-decoration parity (right alignment, double/line-through precision).
3. Heading preset/browser-default alignment pass.
4. Additional filter function parity and consistent renderer behavior notes.

## Context

Satori renders to static SVG. Many missing properties fall into categories that are inherently dynamic (animations, scroll, interaction) or depend on browser layout models Satori doesn't implement (Grid, table, multi-column). These are noted with a **feasibility** assessment:

- **Feasible** — could be implemented with reasonable effort
- **Hard** — would require significant new infrastructure
- **N/A** — not applicable to static SVG rendering
