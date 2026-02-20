# Typography & Fonts

## What Satori supports

- `font-family`, `font-size`, `font-weight`, `font-style`
- `line-height`, `letter-spacing`, `tab-size`
- `text-align` (start, end, left, right, center, justify)
- `text-transform` (none, lowercase, uppercase, capitalize)
- `text-overflow` (clip, ellipsis)
- `text-wrap` (wrap, balance, pretty)
- `white-space` (normal, pre, pre-wrap, pre-line, nowrap)
- `word-break` (normal, break-all, break-word, keep-all)
- `text-decoration-line`, `text-decoration-style` (solid, dashed, dotted, double), `text-decoration-color`, `text-decoration-skip-ink`
- `text-shadow`
- `-webkit-text-stroke`, `-webkit-line-clamp`

## Missing properties

### Font features & variants

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `font-variant` | Hard | opentype.js has limited OpenType feature support. Would need per-feature glyph substitution. |
| `font-variant-caps` | Hard | Requires small-caps glyph lookup |
| `font-variant-ligatures` | Hard | Requires ligature table parsing in opentype.js |
| `font-variant-numeric` | Hard | Requires numeral alternates from font tables |
| `font-variant-east-asian` | Hard | Requires CJK variant glyph tables |
| `font-variant-alternates` | Hard | Requires OpenType alternates feature |
| `font-variant-position` | Hard | Superscript/subscript glyph positioning |
| `font-variant-emoji` | Hard | Emoji presentation selection |
| `font-feature-settings` | Hard | Low-level OpenType feature control. opentype.js would need GSUB/GPOS table application. |
| `font-variation-settings` | Hard | Variable font axis control — requires variable font rendering in opentype.js |
| `font-optical-sizing` | Hard | Requires variable font `opsz` axis support |
| `font-kerning` | Hard | opentype.js can read kern tables but Satori doesn't apply them during layout |
| `font-stretch` | Hard | Requires width-variant font matching |
| `font-size-adjust` | Feasible | Could normalize x-height across fonts using opentype.js metrics |
| `font-synthesis` | N/A | Browser-level bold/italic synthesis — Satori uses actual font files |
| `font-synthesis-weight` | N/A | Same |
| `font-synthesis-style` | N/A | Same |
| `font-synthesis-small-caps` | N/A | Same |
| `font-palette` | Hard | Color font palette selection |
| `font-language-override` | Hard | Language-specific glyph selection |

### Text layout

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `word-spacing` | Feasible | Listed in SVG attribute mapping but not implemented as a CSS property. Would need space-width adjustment in text measurer. |
| `text-indent` | Feasible | First-line indentation. Could offset the first line's x position. |
| `text-align-last` | Feasible | Alignment of the last line in justified text |
| `text-justify` | Hard | Justification algorithm (auto, inter-word, inter-character) |
| `overflow-wrap` / `word-wrap` | Feasible | Satori has `word-break` but not the distinct `overflow-wrap` behavior |
| `hyphens` | Hard | Requires hyphenation dictionaries per language |
| `hyphenate-character` | Hard | Depends on `hyphens` |
| `hyphenate-limit-chars` | Hard | Depends on `hyphens` |
| `line-break` | Hard | CJK line-breaking strictness levels |
| `hanging-punctuation` | Hard | Punctuation outside line box |

### Text decoration (missing values/properties)

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `text-decoration-line: overline` | Feasible | Currently supports `underline` and `line-through` only |
| `text-decoration-style: wavy` | Feasible | Would need a sine-wave SVG path |
| `text-decoration-thickness` | Feasible | Currently uses a fixed thickness |
| `text-underline-offset` | Feasible | Offset from baseline |
| `text-underline-position` | Feasible | Under vs. from-font positioning |

### Text emphasis

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `text-emphasis` | Hard | Emphasis marks above/below glyphs (CJK feature) |
| `text-emphasis-style` | Hard | Dot, circle, sesame, etc. |
| `text-emphasis-color` | Hard | Color of emphasis marks |
| `text-emphasis-position` | Hard | Position of marks |

### Other

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `quotes` | N/A | Generated content (`::before`/`::after` not supported) |
| `ruby-position` | Hard | Ruby annotation layout |
| `ruby-align` | Hard | Ruby annotation alignment |
| `initial-letter` | Hard | Drop cap sizing and positioning |
| `text-spacing-trim` | Hard | CJK punctuation spacing |
| `white-space-collapse` | Feasible | Modern replacement for parts of `white-space` |
| `text-wrap-mode` | Feasible | Modern sub-property of `text-wrap` |
| `text-wrap-style` | Feasible | Already partially covered by `text-wrap: balance/pretty` |
