import { beforeAll, afterEach, afterAll } from 'vitest'
import { chromium, type Browser, type Page } from 'playwright'
import { renderToStaticMarkup } from 'react-dom/server'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { createHash } from 'crypto'
import { join, relative } from 'path'
import { mkdirSync, writeFileSync, readFileSync } from 'fs'
import { Resvg } from '@resvg/resvg-js'
import { resolveBrowserCaptureSize } from './browser-diff-utils.js'
import { classifyComparability } from './browser-diff-comparability.js'

const DIFF_DIR = join(process.cwd(), 'test', '__browser_diffs__')

interface DiffResult {
  name: string
  diffPercent: number
  diffPath: string
  satoriPath: string
  browserPath: string
  comparable: boolean
  comparabilityNote?: string
}

declare global {
  // eslint-disable-next-line no-var
  var __satoriCaptures: Array<{ element: any; options: any; svg: string }>
  // eslint-disable-next-line no-var
  var __browserDiffResults: DiffResult[]
}

let browser: Browser
let page: Page

globalThis.__browserDiffResults = []

const MOCK_PLACEHOLDER_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg=='
const MOCK_PLACEHOLDER_PNG_BUFFER = Buffer.from(
  MOCK_PLACEHOLDER_PNG_BASE64,
  'base64'
)
const MOCK_PLACEHOLDER_SVG =
  '<svg width="116.15" height="100" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M57.5 0L115 100H0L57.5 0z"/></svg>'

// Keep browser snapshots aligned with Satori's built-in element presets.
const BROWSER_PRESET_CSS = `
div, p, blockquote, center, hr, h1, h2, h3, h4, h5, h6, pre, ul, ol, li {
  display: flex;
}
p {
  margin-top: 1em;
  margin-bottom: 1em;
}
blockquote {
  margin-top: 1em;
  margin-bottom: 1em;
  margin-left: 40px;
  margin-right: 40px;
}
center {
  text-align: center;
}
hr {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
  margin-left: auto;
  margin-right: auto;
  border-width: 1px;
  border-style: solid;
}
h1 {
  font-size: 2em;
  margin-top: 0.67em;
  margin-bottom: 0.67em;
  margin-left: 0;
  margin-right: 0;
  font-weight: bold;
}
h2 {
  font-size: 1.5em;
  margin-top: 0.83em;
  margin-bottom: 0.83em;
  margin-left: 0;
  margin-right: 0;
  font-weight: bold;
}
h3 {
  font-size: 1.17em;
  margin-top: 1em;
  margin-bottom: 1em;
  margin-left: 0;
  margin-right: 0;
  font-weight: bold;
}
h4 {
  margin-top: 1.33em;
  margin-bottom: 1.33em;
  margin-left: 0;
  margin-right: 0;
  font-weight: bold;
}
h5 {
  font-size: 0.83em;
  margin-top: 1.67em;
  margin-bottom: 1.67em;
  margin-left: 0;
  margin-right: 0;
  font-weight: bold;
}
h6 {
  font-size: 0.67em;
  margin-top: 2.33em;
  margin-bottom: 2.33em;
  margin-left: 0;
  margin-right: 0;
  font-weight: bold;
}
pre {
  font-family: monospace;
  white-space: pre;
  margin-top: 1em;
  margin-bottom: 1em;
}
ul,
ol {
  flex-direction: column;
  margin-top: 1em;
  margin-bottom: 1em;
  padding-left: 40px;
}
ul {
  list-style-type: disc;
  list-style-position: outside;
}
ol {
  list-style-type: decimal;
  list-style-position: outside;
}
u {
  text-decoration: underline;
}
strong,
b {
  font-weight: bold;
}
i,
em {
  font-style: italic;
}
code,
kbd {
  font-family: monospace;
}
mark {
  background-color: yellow;
  color: black;
}
big {
  font-size: larger;
}
small {
  font-size: smaller;
}
s {
  text-decoration: line-through;
}
`

function slugify(name: string): string {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  const hash = createHash('sha1').update(name).digest('hex').slice(0, 10)
  return `${normalized.slice(0, 64)}-${hash}`
}

function fontsToFontFaceRules(fonts: any[]): string {
  return fonts
    .map((f: any) => {
      const buf = Buffer.isBuffer(f.data)
        ? f.data
        : Buffer.from(
            f.data instanceof ArrayBuffer ? new Uint8Array(f.data) : f.data
          )
      const b64 = buf.toString('base64')
      return `@font-face {
  font-family: '${f.name}';
  src: url(data:font/ttf;base64,${b64});
  font-weight: ${f.weight || 400};
  font-style: ${f.style || 'normal'};
}`
    })
    .join('\n')
}

function buildHtmlDocument(
  html: string,
  width: number,
  height: number,
  fontFaceRules: string,
  defaultFontFamily?: string
): string {
  const escapedDefaultFontFamily = defaultFontFamily
    ? `'${defaultFontFamily.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
    : ''

  return `<!DOCTYPE html>
<html><head><style>
${fontFaceRules}
* { margin: 0; padding: 0; box-sizing: border-box; }
html { background: transparent; }
body {
  width: ${width}px;
  height: ${height}px;
  overflow: hidden;
  background: transparent;
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
  ${escapedDefaultFontFamily ? `font-family: ${escapedDefaultFontFamily};` : ''}
}
${BROWSER_PRESET_CSS}
</style></head>
<body>${html}</body></html>`
}

async function applyBrowserCaptureNormalizations(
  capturePage: Page
): Promise<void> {
  await capturePage.evaluate(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('*'))

    for (const el of elements) {
      const inlineDisplay = el.style.getPropertyValue('display').trim()
      if (inlineDisplay !== 'block') continue

      const rawLineClamp = el.style.getPropertyValue('line-clamp').trim()
      if (!rawLineClamp) continue

      const lineClampMatch = rawLineClamp.match(/^([1-9]\d*)/)
      if (!lineClampMatch) continue

      el.style.setProperty('display', '-webkit-box')
      el.style.setProperty('-webkit-box-orient', 'vertical')
      el.style.setProperty('-webkit-line-clamp', lineClampMatch[1])

      if (!el.style.getPropertyValue('overflow')) {
        el.style.setProperty('overflow', 'hidden')
      }
    }
  })
}

function satoriPngFromSvg(
  svg: string,
  width: number,
  fonts: any[] = []
): Buffer {
  const fontFiles = fonts.map((font) => {
    if (!font?.data) return null

    if (Buffer.isBuffer(font.data)) return font.data

    if (font.data instanceof Uint8Array) return Buffer.from(font.data)
    if (font.data instanceof ArrayBuffer) return Buffer.from(font.data)

    if (ArrayBuffer.isView(font.data)) return Buffer.from(font.data.buffer)

    return null
  })

  const defaultFontFamily =
    fonts[0]?.name?.toString().trim() || 'Playfair Display'

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: {
      fontFiles: fontFiles.filter((font) => font !== null) as
        | Buffer[]
        | undefined,
      loadSystemFonts: false,
      defaultFontFamily,
    },
  })
  return Buffer.from(resvg.render().asPng())
}

beforeAll(async () => {
  mkdirSync(DIFF_DIR, { recursive: true })
  browser = await chromium.launch()
  page = await browser.newPage()

  // Mirror image.test.tsx fetch mocks so browser-side captures don't depend on
  // external network availability.
  await page.route('**://*.placeholder.com/**', async (route) => {
    const url = route.request().url()

    if (url.includes('wrong-url.placeholder.com')) {
      await route.abort('failed')
      return
    }

    if (url.includes('via.placeholder.com')) {
      if (/\.svg(?:$|\?)/i.test(url)) {
        await route.fulfill({
          status: 200,
          contentType: 'image/svg+xml',
          body: MOCK_PLACEHOLDER_SVG,
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: MOCK_PLACEHOLDER_PNG_BUFFER,
      })
      return
    }

    await route.continue()
  })
})

afterEach(async (ctx) => {
  const captures = globalThis.__satoriCaptures
  if (!captures || captures.length === 0) return

  const testName = ctx.task.suite?.name
    ? `${ctx.task.suite.name} > ${ctx.task.name}`
    : ctx.task.name
  const testFilePath =
    ctx.task.file?.filepath || ctx.task.suite?.file?.filepath || ''
  const displayName = testFilePath
    ? `${relative(process.cwd(), testFilePath)} :: ${testName}`
    : testName
  const slug = slugify(displayName)
  const comparability = classifyComparability(displayName)

  for (let i = 0; i < captures.length; i++) {
    const { element, options, svg } = captures[i]
    const { width: w, height: h } = resolveBrowserCaptureSize(options, svg)
    const suffix = captures.length > 1 ? `-${i}` : ''
    const baseName = `${slug}${suffix}`

    try {
      // Render element to HTML
      const html = renderToStaticMarkup(element)
      const fontFaceRules = fontsToFontFaceRules(options.fonts || [])
      const defaultFontFamily =
        Array.isArray(options.fonts) && options.fonts[0]?.name
          ? String(options.fonts[0].name)
          : undefined
      const doc = buildHtmlDocument(
        html,
        w,
        h,
        fontFaceRules,
        defaultFontFamily
      )

      // Browser screenshot
      await page.setViewportSize({ width: w, height: h })
      await page.setContent(doc, { waitUntil: 'networkidle' })
      await applyBrowserCaptureNormalizations(page)
      const browserPng = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width: w, height: h },
        omitBackground: true,
      })

      // Satori PNG
      const satoriPng = satoriPngFromSvg(svg, w, options.fonts || [])

      // Decode both PNGs
      const browserImg = PNG.sync.read(Buffer.from(browserPng))
      const satoriImg = PNG.sync.read(satoriPng)

      // Ensure same dimensions for comparison
      const cmpW = Math.min(browserImg.width, satoriImg.width)
      const cmpH = Math.min(browserImg.height, satoriImg.height)
      const diffImg = new PNG({ width: cmpW, height: cmpH })

      // Resize if needed by creating fresh same-size PNGs
      const normBrowser = ensureSize(browserImg, cmpW, cmpH)
      const normSatori = ensureSize(satoriImg, cmpW, cmpH)

      const numDiff = pixelmatch(
        normBrowser.data,
        normSatori.data,
        diffImg.data,
        cmpW,
        cmpH,
        { threshold: 0.1 }
      )

      const totalPixels = cmpW * cmpH
      const diffPercent = (numDiff / totalPixels) * 100

      const diffPath = join(DIFF_DIR, `${baseName}-diff.png`)
      const browserPath = join(DIFF_DIR, `${baseName}-browser.png`)
      const satoriPath = join(DIFF_DIR, `${baseName}-satori.png`)

      writeFileSync(diffPath, PNG.sync.write(diffImg))
      writeFileSync(browserPath, browserPng)
      writeFileSync(satoriPath, satoriPng)

      globalThis.__browserDiffResults.push({
        name: displayName,
        diffPercent: Math.round(diffPercent * 100) / 100,
        diffPath,
        satoriPath,
        browserPath,
        comparable: comparability.comparable,
        comparabilityNote: comparability.note,
      })
    } catch (err) {
      console.error(`[browser-diff] Error processing "${testName}":`, err)
    }
  }

  globalThis.__satoriCaptures = []
})

function ensureSize(img: PNG, w: number, h: number): PNG {
  if (img.width === w && img.height === h) return img
  const resized = new PNG({ width: w, height: h })
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcIdx = (y * img.width + x) * 4
      const dstIdx = (y * w + x) * 4
      if (x < img.width && y < img.height) {
        resized.data[dstIdx] = img.data[srcIdx]
        resized.data[dstIdx + 1] = img.data[srcIdx + 1]
        resized.data[dstIdx + 2] = img.data[srcIdx + 2]
        resized.data[dstIdx + 3] = img.data[srcIdx + 3]
      }
    }
  }
  return resized
}

afterAll(async () => {
  await browser?.close()

  const results = globalThis.__browserDiffResults
  if (!results || results.length === 0) {
    console.log('\n[browser-diff] No results captured.\n')
    return
  }

  const threshold =
    parseFloat(process.env.BROWSER_DIFF_THRESHOLD || '0.1') * 100

  // Terminal table
  const ESC = '\x1b'
  const GREEN = `${ESC}[32m`
  const YELLOW = `${ESC}[33m`
  const RED = `${ESC}[31m`
  const CYAN = `${ESC}[36m`
  const RESET = `${ESC}[0m`
  const BOLD = `${ESC}[1m`

  const sorted = [...results].sort((a, b) => b.diffPercent - a.diffPercent)
  const comparableResults = sorted.filter((r) => r.comparable)
  const excludedResults = sorted.filter((r) => !r.comparable)
  const nameW = Math.max(40, ...sorted.map((r) => r.name.length + 2))
  const diffW = 10
  const scopeW = 13
  const pathW = 50

  console.log(`\n${BOLD}Browser Diff Results${RESET}\n`)
  console.log(
    '┌' +
      '─'.repeat(nameW) +
      '┬' +
      '─'.repeat(diffW) +
      '┬' +
      '─'.repeat(scopeW) +
      '┬' +
      '─'.repeat(pathW) +
      '┐'
  )
  console.log(
    '│' +
      ' Test'.padEnd(nameW) +
      '│' +
      '  Diff %'.padEnd(diffW) +
      '│' +
      ' Scope'.padEnd(scopeW) +
      '│' +
      ' Diff Image'.padEnd(pathW) +
      '│'
  )
  console.log(
    '├' +
      '─'.repeat(nameW) +
      '┼' +
      '─'.repeat(diffW) +
      '┼' +
      '─'.repeat(scopeW) +
      '┼' +
      '─'.repeat(pathW) +
      '┤'
  )

  for (const r of sorted) {
    const color = !r.comparable
      ? CYAN
      : r.diffPercent < 5
      ? GREEN
      : r.diffPercent < 15
      ? YELLOW
      : RED
    const relDiff = r.diffPath.replace(process.cwd() + '/', '')
    const scope = r.comparable ? 'comparable' : 'excluded'
    console.log(
      '│' +
        ` ${r.name}`.padEnd(nameW) +
        '│' +
        color +
        ` ${r.diffPercent.toFixed(2)}%`.padStart(diffW - 1).padEnd(diffW) +
        RESET +
        '│' +
        ` ${scope}`.padEnd(scopeW) +
        '│' +
        ` ${relDiff}`.padEnd(pathW) +
        '│'
    )
  }

  console.log(
    '└' +
      '─'.repeat(nameW) +
      '┴' +
      '─'.repeat(diffW) +
      '┴' +
      '─'.repeat(scopeW) +
      '┴' +
      '─'.repeat(pathW) +
      '┘'
  )

  const withinThreshold = comparableResults.filter(
    (r) => r.diffPercent <= threshold
  ).length
  const exceeded = comparableResults.length - withinThreshold
  console.log(
    `\n${withinThreshold}/${
      comparableResults.length
    } comparable tests within threshold (${(threshold / 100).toFixed(
      2
    )}), ${exceeded} exceeded\n`
  )

  if (excludedResults.length > 0) {
    console.log(
      `${BOLD}Excluded from threshold stats (${excludedResults.length}):${RESET}`
    )
    for (const result of excludedResults) {
      const note = result.comparabilityNote
        ? ` - ${result.comparabilityNote}`
        : ''
      console.log(`  • ${result.name}${note}`)
    }
    console.log()
  }

  // Generate HTML report
  generateHtmlReport(sorted, threshold)
})

function generateHtmlReport(results: DiffResult[], threshold: number) {
  const comparableResults = results.filter((r) => r.comparable)
  const excludedCount = results.length - comparableResults.length
  const passCount = comparableResults.filter((r) => r.diffPercent < 5).length
  const warnCount = comparableResults.filter(
    (r) => r.diffPercent >= 5 && r.diffPercent < 15
  ).length
  const failCount = comparableResults.filter((r) => r.diffPercent >= 15).length
  const avgDiff =
    comparableResults.length > 0
      ? comparableResults.reduce((s, r) => s + r.diffPercent, 0) /
        comparableResults.length
      : 0

  const rows = results
    .map((r, i) => {
      const satoriB64 = safeReadBase64(r.satoriPath)
      const browserB64 = safeReadBase64(r.browserPath)
      const diffB64 = safeReadBase64(r.diffPath)
      const statusClass = !r.comparable
        ? 'skip'
        : r.diffPercent < 5
        ? 'pass'
        : r.diffPercent < 15
        ? 'warn'
        : 'fail'
      const exclusionNote =
        !r.comparable && r.comparabilityNote
          ? `<div class="test-note">${escapeHtml(r.comparabilityNote)}</div>`
          : ''
      return `
      <tr class="result-row ${statusClass}" data-diff="${
        r.diffPercent
      }" style="--delay: ${i * 30}ms">
        <td class="cell-status"><span class="status-dot"></span></td>
        <td class="cell-name">
          <span class="test-name">${escapeHtml(r.name)}</span>
          ${exclusionNote}
        </td>
        <td class="cell-diff">
          <span class="diff-value">${r.diffPercent.toFixed(
            2
          )}</span><span class="diff-unit">%</span>
          <div class="diff-bar"><div class="diff-bar-fill" style="width: ${Math.min(
            r.diffPercent,
            100
          )}%"></div></div>
        </td>
        <td class="cell-images">
          <div class="triple">
            <div class="img-frame">
              <div class="img-label">SVG</div>
              <img src="data:image/png;base64,${satoriB64}" alt="Satori output" loading="lazy" />
            </div>
            <div class="img-frame">
              <div class="img-label">DOM</div>
              <img src="data:image/png;base64,${browserB64}" alt="Browser output" loading="lazy" />
            </div>
            <div class="img-frame diff-frame">
              <div class="img-label">&Delta;</div>
              <img src="data:image/png;base64,${diffB64}" alt="Pixel diff" loading="lazy" />
            </div>
          </div>
        </td>
      </tr>`
    })
    .join('\n')

  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Satori Diff Report</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap');

:root {
  --bg: #08080c;
  --bg-grid: rgba(255,255,255,0.02);
  --surface: #0f0f15;
  --surface-hover: #14141e;
  --border: rgba(255,255,255,0.06);
  --border-active: rgba(255,255,255,0.12);
  --text: #d4d4e0;
  --text-bright: #f0f0fa;
  --text-dim: #5c5c72;
  --mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  --sans: 'DM Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --pass: #34d399;
  --pass-dim: rgba(52,211,153,0.12);
  --warn: #fbbf24;
  --warn-dim: rgba(251,191,36,0.12);
  --fail: #f87171;
  --fail-dim: rgba(248,113,113,0.12);
  --skip: #22d3ee;
  --skip-dim: rgba(34,211,238,0.12);
  --radius: 6px;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: var(--sans);
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  background-image:
    linear-gradient(var(--bg-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--bg-grid) 1px, transparent 1px);
  background-size: 48px 48px;
  -webkit-font-smoothing: antialiased;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 3rem 2rem 4rem;
}

/* ── Header ── */
.header {
  margin-bottom: 2.5rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--border);
}

.header-top {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.logo {
  font-family: var(--mono);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-dim);
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 0.25rem 0.625rem;
  border-radius: 3px;
}

h1 {
  font-family: var(--sans);
  font-size: 1.375rem;
  font-weight: 600;
  color: var(--text-bright);
  letter-spacing: -0.025em;
}

.stats {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
}

.stat-value {
  font-family: var(--mono);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-bright);
  letter-spacing: -0.03em;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-dim);
  letter-spacing: 0.02em;
}

.stat.pass .stat-value { color: var(--pass); }
.stat.warn .stat-value { color: var(--warn); }
.stat.fail .stat-value { color: var(--fail); }
.stat.skip .stat-value { color: var(--skip); }

/* ── Controls ── */
.toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.filter-group {
  display: flex;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.filter-btn {
  font-family: var(--mono);
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.4375rem 0.875rem;
  background: transparent;
  color: var(--text-dim);
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  letter-spacing: 0.02em;
  position: relative;
}

.filter-btn:not(:last-child)::after {
  content: '';
  position: absolute;
  right: 0;
  top: 25%;
  height: 50%;
  width: 1px;
  background: var(--border);
}

.filter-btn:hover { color: var(--text); background: var(--surface); }
.filter-btn.active { color: var(--text-bright); background: var(--surface-hover); }

.search-box {
  margin-left: auto;
  position: relative;
}

.search-box input {
  font-family: var(--mono);
  font-size: 0.75rem;
  padding: 0.4375rem 0.75rem 0.4375rem 1.75rem;
  width: 220px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  outline: none;
  transition: border-color 0.15s;
}

.search-box input:focus { border-color: var(--border-active); }
.search-box input::placeholder { color: var(--text-dim); }

.search-box::before {
  content: '/';
  position: absolute;
  left: 0.625rem;
  top: 50%;
  transform: translateY(-50%);
  font-family: var(--mono);
  font-size: 0.75rem;
  color: var(--text-dim);
}

/* ── Table ── */
.results-table {
  width: 100%;
  border-collapse: collapse;
}

.results-table thead th {
  font-family: var(--mono);
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-dim);
  text-align: left;
  padding: 0 1rem 0.75rem;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: color 0.15s;
}

.results-table thead th:hover { color: var(--text); }
.results-table thead th.sorted { color: var(--text-bright); }
.results-table thead th .sort-arrow { opacity: 0; transition: opacity 0.15s; margin-left: 0.25rem; }
.results-table thead th.sorted .sort-arrow { opacity: 1; }

.result-row {
  animation: fadeIn 0.3s ease both;
  animation-delay: var(--delay);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.result-row td {
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
  transition: background 0.1s;
}

.result-row:hover td { background: var(--surface); }

/* Status dot */
.cell-status { width: 2rem; padding-right: 0; }

.status-dot {
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin: 0 auto;
}

.pass .status-dot { background: var(--pass); box-shadow: 0 0 8px var(--pass-dim); }
.warn .status-dot { background: var(--warn); box-shadow: 0 0 8px var(--warn-dim); }
.fail .status-dot { background: var(--fail); box-shadow: 0 0 8px var(--fail-dim); }
.skip .status-dot { background: var(--skip); box-shadow: 0 0 8px var(--skip-dim); }

/* Name */
.cell-name { min-width: 180px; }

.test-name {
  font-family: var(--mono);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text);
  line-height: 1.5;
}

.test-note {
  margin-top: 0.25rem;
  font-family: var(--mono);
  font-size: 0.625rem;
  color: var(--text-dim);
  line-height: 1.4;
}

/* Diff percentage */
.cell-diff { width: 140px; }

.diff-value {
  font-family: var(--mono);
  font-size: 0.9375rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.diff-unit {
  font-family: var(--mono);
  font-size: 0.6875rem;
  color: var(--text-dim);
  margin-left: 1px;
}

.pass .diff-value { color: var(--pass); }
.warn .diff-value { color: var(--warn); }
.fail .diff-value { color: var(--fail); }
.skip .diff-value { color: var(--skip); }

.diff-bar {
  margin-top: 0.375rem;
  height: 2px;
  background: var(--border);
  border-radius: 1px;
  overflow: hidden;
  width: 80px;
}

.diff-bar-fill {
  height: 100%;
  border-radius: 1px;
  transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.pass .diff-bar-fill { background: var(--pass); }
.warn .diff-bar-fill { background: var(--warn); }
.fail .diff-bar-fill { background: var(--fail); }
.skip .diff-bar-fill { background: var(--skip); }

/* Images */
.cell-images { padding-left: 1.5rem; }

.triple {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.img-frame {
  position: relative;
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
  background:
    repeating-conic-gradient(rgba(255,255,255,0.03) 0% 25%, transparent 0% 50%)
    50% / 12px 12px;
  transition: border-color 0.15s;
}

.img-frame:hover { border-color: var(--border-active); }

.diff-frame { border-color: rgba(248,113,113,0.2); }

.img-label {
  position: absolute;
  top: 0;
  left: 0;
  font-family: var(--mono);
  font-size: 0.5625rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-dim);
  background: var(--bg);
  padding: 0.125rem 0.375rem;
  border-bottom-right-radius: 3px;
  z-index: 1;
}

.img-frame img {
  display: block;
  max-width: 180px;
  max-height: 180px;
  image-rendering: pixelated;
  cursor: zoom-in;
  transition: transform 0.2s;
}

/* ── Lightbox ── */
.lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(8px);
  display: none;
  place-items: center;
  z-index: 100;
  cursor: zoom-out;
}

.lightbox.open { display: grid; }

.lightbox img {
  max-width: 90vw;
  max-height: 90vh;
  image-rendering: pixelated;
  border: 1px solid var(--border);
  border-radius: 4px;
}

/* ── Empty state ── */
.empty {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-dim);
  font-family: var(--mono);
  font-size: 0.8125rem;
}
</style>
</head><body>
<div class="container">
  <header class="header">
    <div class="header-top">
      <span class="logo">satori</span>
      <h1>Visual Diff Report</h1>
    </div>
    <div class="stats">
      <div class="stat"><span class="stat-value">${
        results.length
      }</span><span class="stat-label">tests</span></div>
      <div class="stat"><span class="stat-value">${
        comparableResults.length
      }</span><span class="stat-label">comparable</span></div>
      <div class="stat skip"><span class="stat-value">${excludedCount}</span><span class="stat-label">excluded</span></div>
      <div class="stat pass"><span class="stat-value">${passCount}</span><span class="stat-label">pass</span></div>
      <div class="stat warn"><span class="stat-value">${warnCount}</span><span class="stat-label">warn</span></div>
      <div class="stat fail"><span class="stat-value">${failCount}</span><span class="stat-label">fail</span></div>
      <div class="stat"><span class="stat-value">${avgDiff.toFixed(
        1
      )}%</span><span class="stat-label">avg diff</span></div>
      <div class="stat"><span class="stat-value">${(threshold / 100).toFixed(
        2
      )}</span><span class="stat-label">threshold</span></div>
    </div>
  </header>

  <div class="toolbar">
    <div class="filter-group">
      <button class="filter-btn active" onclick="filter(this,'all')">All</button>
      <button class="filter-btn" onclick="filter(this,'pass')">Pass</button>
      <button class="filter-btn" onclick="filter(this,'warn')">Warn</button>
      <button class="filter-btn" onclick="filter(this,'fail')">Fail</button>
      <button class="filter-btn" onclick="filter(this,'skip')">Excluded</button>
    </div>
    <div class="search-box">
      <input type="text" placeholder="filter tests..." oninput="search(this.value)" />
    </div>
  </div>

  <table class="results-table">
    <thead><tr>
      <th></th>
      <th onclick="sort(0)">Test <span class="sort-arrow">&#9650;</span></th>
      <th onclick="sort(1)" class="sorted">Diff <span class="sort-arrow">&#9660;</span></th>
      <th>Comparison</th>
    </tr></thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</div>

<div class="lightbox" onclick="this.classList.remove('open')">
  <img id="lb-img" src="" alt="Zoomed view" />
</div>

<script>
// Filter by status
function filter(btn, cls) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.result-row').forEach(tr => {
    tr.style.display = cls === 'all' || tr.classList.contains(cls) ? '' : 'none';
  });
}

// Search by name
function search(q) {
  const lower = q.toLowerCase();
  document.querySelectorAll('.result-row').forEach(tr => {
    const name = tr.querySelector('.test-name').textContent.toLowerCase();
    tr.style.display = name.includes(lower) ? '' : 'none';
  });
}

// Sort
let sortCol = 1, sortDir = -1;
function sort(col) {
  if (sortCol === col) sortDir *= -1;
  else { sortCol = col; sortDir = col === 1 ? -1 : 1; }

  document.querySelectorAll('thead th').forEach(th => th.classList.remove('sorted'));
  document.querySelectorAll('thead th')[col + 1].classList.add('sorted');

  const tbody = document.querySelector('tbody');
  const rows = [...tbody.querySelectorAll('.result-row')];
  rows.sort((a, b) => {
    if (col === 0) return a.querySelector('.test-name').textContent.localeCompare(b.querySelector('.test-name').textContent) * sortDir;
    return (parseFloat(a.dataset.diff) - parseFloat(b.dataset.diff)) * sortDir;
  });
  rows.forEach(r => tbody.appendChild(r));
}

// Lightbox
document.querySelectorAll('.img-frame img').forEach(img => {
  img.addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('lb-img').src = img.src;
    document.querySelector('.lightbox').classList.add('open');
  });
});

// Keyboard shortcut: Escape to close lightbox, / to focus search
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelector('.lightbox').classList.remove('open');
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
    e.preventDefault();
    document.querySelector('.search-box input').focus();
  }
});
</script>
</body></html>`

  const reportPath = join(DIFF_DIR, 'report.html')
  writeFileSync(reportPath, html)
  console.log(`HTML report: ${reportPath}\n`)
}

function safeReadBase64(filePath: string): string {
  try {
    return readFileSync(filePath).toString('base64')
  } catch {
    return ''
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
