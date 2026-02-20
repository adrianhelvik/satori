import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Visibility', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should hide element with visibility: hidden', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          backgroundColor: 'white',
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            backgroundColor: 'red',
            visibility: 'hidden',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    // The red box should be invisible, but still take up space.
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should preserve layout space for hidden elements', async () => {
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
            width: 50,
            height: 30,
            backgroundColor: 'red',
            visibility: 'hidden',
          }}
        />
        <div
          style={{
            width: 50,
            height: 30,
            backgroundColor: 'blue',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    // Blue box should appear at y=30, pushed down by the invisible red box.
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should allow children to override visibility', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          backgroundColor: 'white',
          visibility: 'hidden',
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            backgroundColor: 'green',
            visibility: 'visible',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    // Parent is hidden (white bg invisible), but child is visible (green box shows).
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should hide text with visibility: hidden', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          backgroundColor: 'white',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ visibility: 'hidden', fontSize: 20 }}>Hidden Text</div>
        <div style={{ fontSize: 20 }}>Visible</div>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
})
