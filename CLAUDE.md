# Satori

HTML/CSS to SVG conversion library. Renders JSX elements into SVG strings using Yoga (WASM) for Flexbox layout and opentype.js for glyph-based text rendering.

## Commands

```bash
pnpm build          # Build default + standalone
pnpm dev            # Watch mode build
pnpm test           # Run tests (Vitest)
pnpm dev:test       # Watch mode tests + update snapshots
pnpm lint           # ESLint check
pnpm prettier-check # Prettier check
pnpm ci-check       # All checks (lint + prettier + types)
```

## Code Style

- No semicolons, single quotes, 2-space indent (Prettier enforced)
- ES modules (`import`/`export`), not CommonJS
- TypeScript with `react-jsx` automatic runtime — no `import React`

## Testing

- Visual regression tests using `jest-image-snapshot` with Vitest
- Snapshots live in `test/__image_snapshots__/`
- Use `pnpm dev:test` to run and auto-update snapshots during development
- Run single test files when iterating: `pnpm vitest run test/foo.test.tsx`

## Architecture

Three-phase async generator pipeline in `layout.ts`:

1. **Preprocess** — parse JSX tree, load images, detect missing fonts
2. **Layout** — compute Flexbox positions via Yoga WASM nodes
3. **Build** — assemble SVG string from modular builders (`src/builder/`)

Key modules:
- `src/handler/` — CSS style expansion, computation, Yoga node config
- `src/text/` — text measurement, word wrapping, line breaking
- `src/font.ts` — font loading, glyph→SVG path conversion
- `src/builder/` — SVG element rendering (rect, text, shadow, gradient, etc.)

## Gotchas

- Two build targets: **default** (bundled WASM) and **standalone** (`SATORI_STANDALONE=1`, user provides WASM)
- Only Flexbox layout is supported — no block/grid/table
- No `calc()`, no WOFF2, no RTL, no 3D transforms
- Yoga WASM patches live in `patches/` (pnpm patch)
- `src/vendor/` contains forked/vendored code — edit carefully
