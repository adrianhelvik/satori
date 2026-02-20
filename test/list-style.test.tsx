import { describe, expect, it } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

const PIXEL_ART_2X2_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAGElEQVR4AQXBAQEAAAjDIG7/zhNE0k3CAz7tBf7utunjAAAAAElFTkSuQmCC'

describe('list-style', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should render default unordered list markers', async () => {
    const svg = await satori(
      <ul
        style={{
          width: 240,
          height: 140,
          backgroundColor: 'white',
          fontSize: 20,
          margin: 0,
        }}
      >
        <li>Alpha</li>
        <li>Beta</li>
        <li>Gamma</li>
      </ul>,
      { width: 240, height: 140, fonts }
    )

    expect(toImage(svg, 240)).toMatchImageSnapshot()
  })

  it('should support ordered list listStyleType values', async () => {
    const svg = await satori(
      <ol
        style={{
          width: 260,
          height: 160,
          backgroundColor: 'white',
          fontSize: 18,
          listStyleType: 'lower-alpha',
          margin: 0,
        }}
      >
        <li>First item</li>
        <li>Second item</li>
        <li>Third item</li>
      </ol>,
      { width: 260, height: 160, fonts }
    )

    expect(toImage(svg, 260)).toMatchImageSnapshot()
  })

  it('should support list-style shorthand', async () => {
    const svg = await satori(
      <ul
        style={{
          width: 260,
          height: 160,
          backgroundColor: 'white',
          fontSize: 18,
          listStyle: 'square inside',
          margin: 0,
        }}
      >
        <li>One</li>
        <li>Two</li>
        <li>Three</li>
      </ul>,
      { width: 260, height: 160, fonts }
    )

    expect(toImage(svg, 260)).toMatchImageSnapshot()
  })

  it('should support list-style none', async () => {
    const svg = await satori(
      <ul
        style={{
          width: 220,
          height: 120,
          backgroundColor: 'white',
          fontSize: 18,
          listStyle: 'none',
          margin: 0,
        }}
      >
        <li>Alpha</li>
        <li>Beta</li>
      </ul>,
      { width: 220, height: 120, fonts, embedFont: false }
    )

    expect(svg).not.toContain('•')
    expect(svg).not.toContain('◦')
    expect(svg).not.toContain('▪')
    expect(toImage(svg, 220)).toMatchImageSnapshot()
  })

  it('should support list-style-image url markers', async () => {
    const svg = await satori(
      <ul
        style={{
          width: 240,
          height: 140,
          backgroundColor: 'white',
          fontSize: 18,
          listStyleImage: `url(${PIXEL_ART_2X2_PNG})`,
          margin: 0,
        }}
      >
        <li>Image marker one</li>
        <li>Image marker two</li>
      </ul>,
      { width: 240, height: 140, fonts }
    )

    expect(svg).toContain('data:image/png;base64')
    expect(toImage(svg, 240)).toMatchImageSnapshot()
  })
})
