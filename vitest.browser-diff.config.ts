import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vitest/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const satoriAbsPath = path.resolve(__dirname, 'src/index.js')

function satoriCapturePlugin() {
  return {
    name: 'satori-capture',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      // Only transform test files
      if (!id.includes('/test/') || id.includes('browser-diff')) return

      // Replace the default import of satori with a capturing wrapper
      if (!code.includes("from '../src/index.js'")) return

      const transformed = code.replace(
        /import\s+(\w+)\s+from\s+['"]\.\.\/src\/index\.js['"]/,
        `import { default as __origSatori } from '${satoriAbsPath}'
const $1 = async function(element, options) {
  globalThis.__satoriCaptures ??= []
  const svg = await __origSatori(element, options)
  globalThis.__satoriCaptures.push({ element, options, svg })
  return svg
}`
      )

      if (transformed === code) return
      return { code: transformed, map: null }
    },
  }
}

export default defineConfig({
  plugins: [satoriCapturePlugin()],
  test: {
    threads: false,
    hookTimeout: 120_000,
    setupFiles: ['./test/browser-diff-setup.ts'],
  },
})
