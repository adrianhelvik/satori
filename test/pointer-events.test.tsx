import { describe, expect, it } from 'vitest'

import satori from '../src/index.js'
import { initFonts } from './utils.js'

describe('pointer-events', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should pass pointer-events through for box elements', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          backgroundColor: 'red',
          pointerEvents: 'none',
        }}
      />,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )

    expect(svg).toContain('pointer-events:none')
  })

  it('should pass pointer-events through for text output', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 40,
          color: 'black',
          fontSize: 20,
          pointerEvents: 'none',
        }}
      >
        Hello
      </div>,
      {
        width: 100,
        height: 40,
        fonts,
        embedFont: false,
      }
    )

    expect(svg).toContain('pointer-events="none"')
  })
})
