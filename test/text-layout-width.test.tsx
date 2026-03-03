import { describe, expect, it } from 'vitest'

import satori from '../src/index.js'
import { initFonts } from './utils.js'

describe('text layout width behavior', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should shrink explicit-width items per CSS flexShrink default', async () => {
    let detectedWidth: number | undefined

    // CSS flex items default to flexShrink: 1, so a 200px-wide child
    // inside a 100px container shrinks to fit.
    await satori(
      <div style={{ width: 200, height: 20, backgroundColor: 'red' }}>
        Hello, World
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
        onNodeDetected(node) {
          if (node.type === 'div') {
            detectedWidth = node.width
          }
        },
      }
    )

    expect(detectedWidth).toBe(100)
  })

  it('should preserve explicit width when flexShrink is 0', async () => {
    let detectedWidth: number | undefined

    // With flexShrink: 0, the item overflows instead of shrinking.
    await satori(
      <div
        style={{
          width: 200,
          height: 20,
          flexShrink: 0,
          backgroundColor: 'red',
        }}
      >
        Hello, World
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
        onNodeDetected(node) {
          if (node.type === 'div') {
            detectedWidth = node.width
          }
        },
      }
    )

    expect(detectedWidth).toBe(200)
  })

  it('should still shrink auto-width text containers to available space', async () => {
    let detectedWidth: number | undefined

    await satori(<div>Hello, World Hello, World</div>, {
      width: 100,
      height: 100,
      fonts,
      onNodeDetected(node) {
        if (node.type === 'div') {
          detectedWidth = node.width
        }
      },
    })

    expect(detectedWidth).toBe(100)
  })
})
