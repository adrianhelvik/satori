import { describe, it, expect } from 'vitest'

import satori from '../src/index.js'
import { initFonts, toImage } from './utils.js'

describe('zoom', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should scale zoomed content from the top-left corner', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 120,
          height: 120,
          backgroundColor: 'white',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            backgroundColor: 'red',
            zoom: 2,
          }}
        />
      </div>,
      { width: 120, height: 120, fonts }
    )

    expect(svg).toContain('matrix(2.00,0.00,0.00,2.00')
    expect(toImage(svg, 120)).toMatchImageSnapshot()
  })

  it('should support percentage zoom values', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 120,
          height: 120,
          backgroundColor: 'white',
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            backgroundColor: 'blue',
            zoom: '50%',
          }}
        />
      </div>,
      { width: 120, height: 120, fonts }
    )

    expect(svg).toContain('matrix(0.50,0.00,0.00,0.50')
    expect(toImage(svg, 120)).toMatchImageSnapshot()
  })
})
