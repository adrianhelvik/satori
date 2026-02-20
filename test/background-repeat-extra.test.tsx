import { describe, expect, it } from 'vitest'

import satori from '../src/index.js'
import { toImage } from './utils.js'

const RED_SQUARE_SVG =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSJyZWQiLz48L3N2Zz4='

describe('background-repeat extras', () => {
  it('should support background-repeat: round', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 60,
          backgroundColor: 'white',
          backgroundImage: `url(${RED_SQUARE_SVG})`,
          backgroundSize: '32px 24px',
          backgroundRepeat: 'round',
        }}
      />,
      { width: 100, height: 60, fonts: [] }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support background-repeat: space', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 60,
          backgroundColor: 'white',
          backgroundImage: `url(${RED_SQUARE_SVG})`,
          backgroundSize: '20px 20px',
          backgroundRepeat: 'space',
        }}
      />,
      { width: 100, height: 60, fonts: [] }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support mixed background-repeat values', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 70,
          backgroundColor: 'white',
          backgroundImage: `url(${RED_SQUARE_SVG})`,
          backgroundSize: '30px 20px',
          backgroundRepeat: 'round space',
        }}
      />,
      { width: 100, height: 70, fonts: [] }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
})
