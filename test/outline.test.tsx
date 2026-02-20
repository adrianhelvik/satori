import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Outline', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should render solid outline', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          backgroundColor: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            backgroundColor: 'lightblue',
            outline: '2px solid red',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render outline with offset', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          backgroundColor: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            backgroundColor: 'lightblue',
            outlineWidth: 2,
            outlineStyle: 'solid',
            outlineColor: 'blue',
            outlineOffset: 4,
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render dashed outline', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          backgroundColor: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            backgroundColor: 'lightyellow',
            outline: '2px dashed green',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render dotted outline', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          backgroundColor: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            backgroundColor: 'lightyellow',
            outline: '2px dotted orange',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render double outline', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          backgroundColor: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            backgroundColor: 'lightyellow',
            outline: '6px double red',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support double outline with outline-offset', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          backgroundColor: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            backgroundColor: 'lightblue',
            outline: '6px double blue',
            outlineOffset: 4,
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should not affect layout', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'white',
        }}
      >
        <div
          style={{
            width: 40,
            height: 30,
            backgroundColor: 'lightblue',
            outline: '3px solid red',
          }}
        />
        <div
          style={{
            width: 40,
            height: 30,
            backgroundColor: 'lightgreen',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    // The green box should be at y=30, not pushed by the outline.
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
})
