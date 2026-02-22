# Priority Roadmap

This document defines the highest-priority compatibility blockers and the acceptance criteria for closing them.

## P0 (Most Important)

### 1) `position: fixed` viewport anchoring (currently approximate)

Current state:

- `fixed` is normalized to `absolute`.
- True viewport anchoring semantics are not modeled.

Implementation plan:

1. Keep `position: fixed` as a distinct runtime value (do not alias to `absolute`).
2. Add a fixed-position layout path anchored to the SVG viewport/root box.
3. Ensure fixed nodes are removed from normal flow like absolutely positioned nodes.
4. Define clipping/stacking behavior explicitly for static rendering (documented approximation where needed).

Acceptance criteria:

- Nested fixed element stays anchored to viewport, not parent offsets.
- Fixed element behavior is validated with transformed/overflow ancestors.
- Dedicated visual tests for top/right/bottom/left/inset combinations pass.
- Browser diff shows fixed-position cases under threshold for comparable tests.

### 2) Table layout with `rowSpan` / `colSpan`

Current state:

- Table display tokens are accepted but mapped to flex semantics.
- Table algorithm, spanning, and intrinsic sizing are not implemented.

Implementation plan:

1. Add a table-specific layout pass (separate from Yoga flex layout).
2. Build a cell matrix model with span resolution (`rowSpan`, `colSpan`).
3. Implement column width and row height solving for common static cases.
4. Integrate solved box geometry into existing border/background/text rendering paths.

Acceptance criteria:

- Correct geometry for mixed `rowSpan`/`colSpan` tables in static snapshots.
- Cells with spans do not overlap incorrectly or collapse unexpectedly.
- Text/background/border rendering works per cell after span resolution.
- Browser diff suite for table fixtures is under threshold for comparable cases.

### 3) CSS filter rendering parity

Current state:

- `filter` syntax is accepted and passed through.
- Renderer parity is incomplete for common filter stacks.

Implementation plan:

1. Parse filter function lists into a normalized internal representation.
2. Implement explicit SVG filter generation for supported functions:
   `blur()`, `brightness()`, `contrast()`, `saturate()`, `opacity()`, `drop-shadow()`.
3. Apply filters consistently across box/image/text paths.
4. Keep unsupported functions deterministic (no-op + documented fallback).

Acceptance criteria:

- Golden visual tests for each supported function and mixed stacks pass.
- Filters render on text, block backgrounds, and images.
- Browser diff parity for supported filter cases stays within threshold.
- Unsupported functions are deterministic and documented.

### 4) `conic-gradient()` / `repeating-conic-gradient()`

Current state:

- Linear and radial gradients are supported.
- Conic gradients are not parsed/generated.

Implementation plan:

1. Add conic-gradient parsing (angle/origin/stops).
2. Implement SVG generation strategy for conic gradients (including repeating mode).
3. Integrate with `background-size`, `background-position`, and `background-repeat`.

Acceptance criteria:

- Conic and repeating-conic snapshots render deterministically.
- Multi-stop and offset-angle cases are covered by tests.
- Browser diff for comparable conic fixtures stays within threshold.

### 5) `color-mix()`

Current state:

- `color-mix()` is not parsed by current color handling.

Implementation plan:

1. Parse `color-mix()` in style color/background/border/text color inputs.
2. Implement initial mixing in `srgb` and percentage normalization.
3. Resolve to concrete RGBA output before render-stage color usage.

Acceptance criteria:

- `color-mix()` works in `color`, `background-color`, `border-color`, and decoration colors.
- Nested/invalid inputs fail predictably with clear errors or documented fallback.
- Unit tests verify numeric channel outcomes and alpha compositing behavior.

## P1 (After All P0 Acceptance Criteria Are Met)

1. SVG marker parity (`marker-start`, `marker-mid`, `marker-end`) with dedicated fixtures.
2. `backdrop-filter` approximation strategy for static scenes (documented limits).
3. Text-decoration parity improvements (especially right-aligned and double-style precision).
4. Heading/default style parity tuning against browser reference captures.
5. Expanded filter function coverage and renderer-specific stability notes.

## Diff Workflow

Use the reference process documented in [puppeteer-diff.md](puppeteer-diff.md) for every P0 milestone.
