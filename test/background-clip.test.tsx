import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

const PIXEL_ART_2X2_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAGElEQVR4AQXBAQEAAAjDIG7/zhNE0k3CAz7tBf7utunjAAAAAElFTkSuQmCC'

describe('backgroundClip', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should render background-clip:text', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          fontSize: 30,
          flexDirection: 'column',
          background: '#ffffff',
        }}
      >
        <div
          style={{
            backgroundImage: 'linear-gradient(to right, red, green)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          lynn
        </div>
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )

    expect(toImage(svg)).toMatchImageSnapshot()
  })

  it('should render background-clip:text compatible with transform', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          fontSize: 30,
          flexDirection: 'column',
          background: '#ffffff',
        }}
      >
        <div
          style={{
            transform: 'translateX(25px)',
            backgroundImage: 'linear-gradient(to right, red, green)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          lynn
        </div>
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )

    expect(toImage(svg)).toMatchImageSnapshot()
  })

  it('should render background-clip:text compatible with mask', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          fontSize: 30,
          flexDirection: 'column',
          background: '#ffffff',
        }}
      >
        <div
          style={{
            transform: 'translateX(25px)',
            backgroundImage: 'linear-gradient(to right, red, green)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            maskImage: 'linear-gradient(to right, blue, transparent)',
            color: 'transparent',
          }}
        >
          lynn
        </div>
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )

    expect(toImage(svg)).toMatchImageSnapshot()
  })

  it('should preserve color', async () => {
    const svg = await satori(
      <div
        style={{
          background: 'radial-gradient(#eb10ff, #d700ff)',
          backgroundClip: 'text',
          color: 'green',
          textShadow:
            '0px 0px 5px #ffffff9c,-1px -1px 1px #ffffff9c,1px 0px 5px #c0f,0px -2px 1px #ea2eff00,1px 0px 5px #d325ff,0px -2px 1px #fff,0px 1px 1px #a600f88f,-1px 3px 1px #a600f854',
        }}
      >
        Hello
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )

    expect(toImage(svg)).toMatchImageSnapshot()
  })

  it('should support background-clip: padding-box and content-box', async () => {
    const svg = await satori(
      <div
        style={{
          width: 120,
          height: 80,
          display: 'flex',
          gap: 8,
          backgroundColor: '#eee',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            boxSizing: 'border-box',
            border: '8px solid red',
            padding: 8,
            backgroundColor: 'blue',
            backgroundClip: 'padding-box',
          }}
        />
        <div
          style={{
            width: 56,
            height: 56,
            boxSizing: 'border-box',
            border: '8px solid red',
            padding: 8,
            backgroundColor: 'blue',
            backgroundClip: 'content-box',
          }}
        />
      </div>,
      {
        width: 120,
        height: 80,
        fonts,
      }
    )

    expect(toImage(svg, 120)).toMatchImageSnapshot()
  })

  it('should position background-image using background-origin boxes', async () => {
    const svg = await satori(
      <div
        style={{
          width: 140,
          height: 84,
          display: 'flex',
          gap: 8,
          backgroundColor: '#eee',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            boxSizing: 'border-box',
            border: '8px solid red',
            padding: 8,
            backgroundColor: '#ddd',
            backgroundImage: `url(${PIXEL_ART_2X2_PNG})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: '16px 16px',
            backgroundOrigin: 'padding-box',
          }}
        />
        <div
          style={{
            width: 64,
            height: 64,
            boxSizing: 'border-box',
            border: '8px solid red',
            padding: 8,
            backgroundColor: '#ddd',
            backgroundImage: `url(${PIXEL_ART_2X2_PNG})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: '16px 16px',
            backgroundOrigin: 'content-box',
          }}
        />
      </div>,
      {
        width: 140,
        height: 84,
        fonts,
      }
    )

    expect(toImage(svg, 140)).toMatchImageSnapshot()
  })
})
