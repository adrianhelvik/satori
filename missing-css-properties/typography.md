# Typography & Fonts

## What Satori supports

- `font-family`, `font-size`, `font-weight`, `font-style`
- `font-size-adjust` (numeric / `from-font`, approximate)
- `font-kerning` (`auto` / `normal` / `none`)
- `line-height`, `letter-spacing`, `tab-size`
- `word-spacing`, `text-indent` (length/percentage values with `each-line`/`hanging` modifiers)
- `text-align` (start, end, left, right, center, justify)
- `text-transform` (none, lowercase, uppercase, capitalize)
- `text-overflow` (clip, ellipsis)
- `text-wrap` (wrap, balance, pretty)
- `white-space` (normal, pre, pre-wrap, pre-line, nowrap)
- `word-break` (normal, break-all, break-word, keep-all)
- `overflow-wrap` / `word-wrap`
- `text-decoration-line` (`underline`, `line-through`, `overline`), `text-decoration-style` (solid, dashed, dotted, double, wavy), `text-decoration-color`, `text-decoration-skip-ink`, `text-decoration-thickness`, `text-underline-offset`, `text-underline-position` (`under`, `from-font`, partial)
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
| `font-kerning` | **Supported (approx.)** | Supports `auto`/`normal`/`none` in text output and embedded glyph layout. Coverage depends on kern data in the active font(s). |
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
| `text-indent` | **Supported (partial)** | Supports length/percentage values and keyword modifiers (`each-line`, `hanging`). Writing-mode and bidi-dependent behavior remains limited. |
| `text-justify` | **Supported (approx.)** | Supports `auto`, `none`, `inter-word`, and `inter-character` for `text-align: justify`. Language/script-specific nuances remain approximate. |
| `hyphens` | **Supported (partial)** | Supports `manual`/`auto` soft-hyphen (`U+00AD`) discretionary breaks and `none` to disable them. Dictionary-based automatic hyphenation is not implemented. |
| `hyphenate-character` | **Supported (partial)** | Supports explicit replacement characters for discretionary soft-hyphen breaks. Dictionary-based hyphenation controls are not implemented. |
| `hyphenate-limit-chars` | Hard | Depends on `hyphens` |
| `line-break` | Hard | CJK line-breaking strictness levels |
| `hanging-punctuation` | Hard | Punctuation outside line box |

### Text decoration (missing values/properties)

| Property | Feasibility | Notes |
|----------|-------------|-------|
| `text-decoration-thickness` | **Supported (partial)** | Supports numeric/length inputs, percentages, and `from-font` (using font underline metrics when available). Full browser parity remains approximate. |
| `text-underline-position` | **Supported (partial)** | Supports `under` and `from-font`; side-specific and writing-mode-dependent modes remain approximate. |

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
| `white-space-collapse` | **Supported (approx.)** | Basic compatibility mapping is supported (`preserve-breaks`, `collapse`, etc.). |
| `text-wrap-mode` | **Supported (approx.)** | Basic compatibility mapping is supported (`nowrap`/`wrap`). |
| `text-wrap-style` | **Supported (approx.)** | Compatibility mapping supports `balance`/`pretty`. |
