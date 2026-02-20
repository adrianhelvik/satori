# Typography & Fonts

## What Satori supports

- `font-family`, `font-size`, `font-weight`, `font-style`
- `font-size-adjust` (numeric / `from-font`, approximate)
- `line-height`, `letter-spacing`, `tab-size`
- `word-spacing`, `text-indent`
- `text-align` (start, end, left, right, center, justify)
- `text-transform` (none, lowercase, uppercase, capitalize)
- `text-overflow` (clip, ellipsis)
- `text-wrap` (wrap, balance, pretty)
- `white-space` (normal, pre, pre-wrap, pre-line, nowrap)
- `word-break` (normal, break-all, break-word, keep-all)
- `overflow-wrap` / `word-wrap`
- `text-decoration-line` (`underline`, `line-through`, `overline`), `text-decoration-style` (solid, dashed, dotted, double, wavy), `text-decoration-color`, `text-decoration-skip-ink`, `text-decoration-thickness`, `text-underline-offset`
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
| `font-size-adjust` | **Supported (approx.)** | Numeric and `from-font` values are applied using primary font x-height metrics. Per-glyph fallback-font adjustment is not fully modeled. |
| `font-synthesis` | N/A | Browser-level bold/italic synthesis — Satori uses actual font files |
| `font-synthesis-weight` | N/A | Same |
| `font-synthesis-style` | N/A | Same |
| `font-synthesis-small-caps` | N/A | Same |
| `font-palette` | Hard | Color font palette selection |
| `font-language-override` | Hard | Language-specific glyph selection |

### Text layout

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `text-justify` | Hard | Justification algorithm (auto, inter-word, inter-character) |
| `hyphens` | Hard | Requires hyphenation dictionaries per language |
| `hyphenate-character` | Hard | Depends on `hyphens` |
| `hyphenate-limit-chars` | Hard | Depends on `hyphens` |
| `line-break` | Hard | CJK line-breaking strictness levels |
| `hanging-punctuation` | Hard | Punctuation outside line box |

### Text decoration (missing values/properties)

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `text-underline-position` | Feasible | `under` is supported. Other detailed modes remain approximate. |

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
| `white-space-collapse` | Feasible | Basic compatibility mapping is supported (`preserve-breaks`, `collapse`, etc.). |
| `text-wrap-mode` | Feasible | Basic compatibility mapping is supported (`nowrap`/`wrap`). |
| `text-wrap-style` | Feasible | Compatibility mapping supports `balance`/`pretty`. |
