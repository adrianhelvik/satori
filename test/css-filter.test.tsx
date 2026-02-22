import { describe, expect, it } from 'vitest'

import satori from '../src/index.js'
import { initFonts, toImage } from './utils.js'

const PIXEL_ART_2X2_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAGElEQVR4AQXBAQEAAAjDIG7/zhNE0k3CAz7tBf7utunjAAAAAElFTkSuQmCC'

describe('CSS Filters', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should render blur() on block content', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          background: '#ddd',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            background: 'red',
            filter: 'blur(3px)',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render grayscale() on block content', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          background: '#ddd',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            background: 'red',
            filter: 'grayscale(100%)',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render brightness(), contrast(), saturate(), opacity() stacks', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          background: '#222',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            background: 'rgb(255, 120, 80)',
            filter:
              'brightness(130%) contrast(85%) saturate(160%) opacity(75%)',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render drop-shadow() on block content', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          background: '#ddd',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            background: 'red',
            filter: 'drop-shadow(6px 6px 4px rgba(0, 0, 0, 0.6))',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render filters on image elements', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          background: '#ddd',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={PIXEL_ART_2X2_PNG}
          width={48}
          height={48}
          style={{
            filter:
              'drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.45)) saturate(180%)',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render filters on text nodes', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 150,
          height: 70,
          background: 'black',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 36,
          fontWeight: 700,
          filter: 'saturate(140%) opacity(85%) blur(0.5px)',
        }}
      >
        Hello
      </div>,
      { width: 150, height: 70, fonts }
    )

    expect(toImage(svg, 150)).toMatchImageSnapshot()
  })
})
