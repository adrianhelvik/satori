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
  const wrappedOptions = {
    ...(options || {}),
  }
  const additionalAssets = []
  const originalLoadAdditionalAsset = wrappedOptions.loadAdditionalAsset
  if (typeof originalLoadAdditionalAsset === 'function') {
    wrappedOptions.loadAdditionalAsset = async (languageCode, segment) => {
      const assets = await originalLoadAdditionalAsset(languageCode, segment)
      if (!assets) return assets
      if (typeof assets === 'string') return assets
      if (Array.isArray(assets)) {
        additionalAssets.push(...assets)
      } else {
        additionalAssets.push(assets)
      }
      return assets
    }
  }

  const svg = await __origSatori(element, wrappedOptions)
  globalThis.__satoriCaptures.push({
    element,
    options: wrappedOptions,
    svg,
    additionalAssets,
  })
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
