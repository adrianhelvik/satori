import { describe, expect, it } from 'vitest'

import satori from '../src/index.js'
import { initFonts, toImage } from './utils.js'

describe('Background Position Axis', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should support background-position-x and background-position-y', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          backgroundColor: 'white',
          backgroundImage: 'linear-gradient(red, red)',
          backgroundSize: '20px 20px',
          backgroundRepeat: 'no-repeat',
          backgroundPositionX: 60,
          backgroundPositionY: 10,
        }}
      />,
      { width: 100, height: 100, fonts }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should let background-position-x override shorthand x while keeping shorthand y', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          backgroundColor: 'white',
          backgroundImage: 'linear-gradient(blue, blue)',
          backgroundSize: '20px 20px',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: '10px 70px',
          backgroundPositionX: 40,
        }}
      />,
      { width: 100, height: 100, fonts }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support per-layer background-position-x and background-position-y', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          backgroundColor: 'white',
          backgroundImage:
            'linear-gradient(red, red), linear-gradient(blue, blue)',
          backgroundSize: '20px 20px, 20px 20px',
          backgroundRepeat: 'no-repeat, no-repeat',
          backgroundPositionX: '10px, 70px',
          backgroundPositionY: '10px, 70px',
        }}
      />,
      { width: 100, height: 100, fonts }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
})
