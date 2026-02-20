import { describe, expect, it } from 'vitest'

import satori from '../src/index.js'
import { initFonts, toImage } from './utils.js'

describe('font-size-adjust', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should apply numeric font-size-adjust using the primary font x-height', async () => {
    const svg = await satori(
      <div
        style={{
          width: 260,
          height: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'white',
          color: 'black',
          fontFamily: 'Playfair Display',
          fontSize: 32,
          fontSizeAdjust: 0.8,
        }}
      >
        Satori
      </div>,
      { width: 260, height: 100, fonts, embedFont: false }
    )

    const match = svg.match(/font-size="([\d.]+)"/)
    expect(match).toBeTruthy()
    expect(Number(match![1])).toBeGreaterThan(40)
    expect(toImage(svg, 260)).toMatchImageSnapshot()
  })

  it('should support font-size-adjust: from-font', async () => {
    const svg = await satori(
      <div
        style={{
          width: 260,
          height: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'white',
          color: 'black',
          fontFamily: 'Playfair Display',
          fontSize: 32,
          fontSizeAdjust: 'from-font',
        }}
      >
        Satori
      </div>,
      { width: 260, height: 100, fonts, embedFont: false }
    )

    const match = svg.match(/font-size="([\d.]+)"/)
    expect(match).toBeTruthy()
    expect(Number(match![1])).toBeCloseTo(32, 2)
    expect(toImage(svg, 260)).toMatchImageSnapshot()
  })
})
