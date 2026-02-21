import { describe, expect, it } from 'vitest'

import satori from '../src/index.js'
import { initFonts } from './utils.js'

describe('interaction pass-through', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should pass cursor and user-select through for box elements', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          backgroundColor: 'red',
          cursor: 'crosshair',
          touchAction: 'none',
          userSelect: 'none',
        }}
      />,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )

    expect(svg).toContain('cursor:crosshair')
    expect(svg).toContain('touch-action:none')
    expect(svg).toContain('user-select:none')
  })

  it('should pass cursor and user-select through for text output', async () => {
    const svg = await satori(
      <div
        style={{
          width: 120,
          height: 40,
          color: 'black',
          fontSize: 20,
          cursor: 'pointer',
          touchAction: 'pan-x',
          userSelect: 'none',
        }}
      >
        Hello
      </div>,
      {
        width: 120,
        height: 40,
        fonts,
        embedFont: false,
      }
    )

    expect(svg).toContain('cursor="pointer"')
    expect(svg).toContain('touch-action:pan-x')
    expect(svg).toContain('user-select:none')
  })

  it('should preserve cursor and user-select on embedded-font path text', async () => {
    const svg = await satori(
      <div
        style={{
          width: 120,
          height: 40,
          color: 'black',
          fontSize: 20,
          cursor: 'move',
          touchAction: 'manipulation',
          userSelect: 'none',
        }}
      >
        Hello
      </div>,
      {
        width: 120,
        height: 40,
        fonts,
      }
    )

    expect(svg).toMatch(/<path[^>]*cursor="move"/)
    expect(svg).toContain('touch-action:manipulation')
    expect(svg).toContain('user-select:none')
  })
})
