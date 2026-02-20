import { describe, expect, it } from 'vitest'

import satori from '../src/index.js'
import { initFonts, toImage } from './utils.js'

describe('all property', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should reset earlier declarations with all: initial', async () => {
    const svg = await satori(
      <div
        style={{
          width: 120,
          height: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'white',
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            border: '8px solid #00ff00',
            backgroundColor: 'red',
            all: 'initial',
            display: 'block',
            width: 60,
            height: 60,
            backgroundColor: 'blue',
          }}
        />
      </div>,
      { width: 120, height: 120, fonts }
    )

    expect(svg).not.toContain('#00ff00')
    expect(toImage(svg, 120)).toMatchImageSnapshot()
  })

  it('should treat all: unset as inherit for inherited text properties', async () => {
    const svg = await satori(
      <div
        style={{
          width: 240,
          height: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#cc0000',
          fontFamily: 'Playfair Display',
          fontSize: 30,
          backgroundColor: 'white',
        }}
      >
        <div style={{ all: 'unset', display: 'block' }}>Unset</div>
      </div>,
      { width: 240, height: 100, fonts, embedFont: false }
    )

    expect(svg).toContain('fill="#cc0000"')
    expect(svg).toContain('font-size="30"')
    expect(toImage(svg, 240)).toMatchImageSnapshot()
  })
})
