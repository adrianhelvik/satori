import { describe, expect, it } from 'vitest'

import satori from '../src/index.js'
import { initFonts, toImage } from './utils.js'

describe('font-kerning', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should pass font-kerning to SVG text output', async () => {
    const svg = await satori(
      <div
        style={{
          width: 260,
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'white',
          color: 'black',
          fontFamily: 'Playfair Display',
          fontSize: 56,
          fontKerning: 'none',
        }}
      >
        AV
      </div>,
      { width: 260, height: 80, fonts, embedFont: false }
    )

    expect(svg).toContain('font-kerning="none"')
    expect(toImage(svg, 260)).toMatchImageSnapshot()
  })

  it('should apply font-kerning none when embedding glyph paths', async () => {
    const svg = await satori(
      <div
        style={{
          width: 300,
          height: 160,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-around',
          alignItems: 'center',
          backgroundColor: 'white',
          color: 'black',
          fontFamily: 'Playfair Display',
          fontSize: 56,
        }}
      >
        <div style={{ fontKerning: 'normal' }}>AVATAR</div>
        <div style={{ fontKerning: 'none' }}>AVATAR</div>
      </div>,
      { width: 300, height: 160, fonts, embedFont: true }
    )

    expect(toImage(svg, 300)).toMatchImageSnapshot()
  })
})
