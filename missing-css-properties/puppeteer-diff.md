# Puppeteer Diff Notes

These notes describe how to run browser-reference diffs against Chromium output and use them as acceptance gates.

## Goal

Compare Satori SVG-rendered PNG output against Chromium screenshots for the same JSX/CSS input and track pixel-level drift.

## Reference Pipeline

1. Render test input with Satori to SVG.
2. Rasterize SVG to PNG (e.g., Resvg) at fixed dimensions.
3. Render equivalent HTML/CSS in headless Chromium (Puppeteer).
4. Capture screenshot PNG with matching viewport and transparent background.
5. Diff PNGs with `pixelmatch` and report `%` changed pixels.

## Keep Inputs Symmetric

Use the same:

- viewport width/height
- font files and default font family
- image mocks/network behavior
- CSS preset normalization for element defaults
- device scale factor and background transparency settings

Without strict symmetry, diffs become noise.

## Threshold Strategy

Recommended buckets:

- `0%`: exact match
- `<5%`: near match
- `5-10%`: medium mismatch
- `>10%`: high mismatch (investigate)

Use a hard gate for comparable tests (for example: all comparable tests `<=10%`).

## Comparability Rules

Mark non-comparable cases explicitly (do not fail CI on these), such as:

- runtime-only inputs not representable in static browser HTML
- intentionally custom semantics
- tests that validate callbacks/events instead of visual parity

Keep exclusion rules versioned in code and reviewed like production logic.

## Suggested Puppeteer Capture Settings

- `page.setViewport({ width, height, deviceScaleFactor: 1 })`
- `page.setContent(html, { waitUntil: 'networkidle0' })`
- `page.screenshot({ type: 'png', clip: { x: 0, y: 0, width, height }, omitBackground: true })`

## CI Gate Recommendations

1. Run targeted diff suite for changed feature area on every PR.
2. Run full diff suite on main/release branches.
3. Store diff artifacts (`satori`, `browser`, `diff`) for failed tests.
4. Require an explicit justification when adding new exclusions.

## Practical Implementation Note

Current local tooling uses Playwright for browser capture. Puppeteer can be used with the same capture and diff contract above; the acceptance model remains identical.
