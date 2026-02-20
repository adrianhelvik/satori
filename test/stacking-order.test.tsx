import { describe, expect, it } from 'vitest'

import satori from '../src/index.js'
import { initFonts, toImage } from './utils.js'

describe('Stacking & Order', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should lay out flex items using order', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 120,
          height: 40,
          backgroundColor: 'white',
        }}
      >
        <div
          style={{ width: 40, height: 40, backgroundColor: 'red', order: 2 }}
        />
        <div
          style={{ width: 40, height: 40, backgroundColor: 'green', order: 1 }}
        />
        <div
          style={{ width: 40, height: 40, backgroundColor: 'blue', order: -1 }}
        />
      </div>,
      { width: 120, height: 40, fonts }
    )

    expect(toImage(svg, 120)).toMatchImageSnapshot()
  })

  it('should paint siblings using z-index', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          position: 'relative',
          backgroundColor: 'white',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 10,
            top: 10,
            width: 60,
            height: 60,
            backgroundColor: 'red',
            zIndex: 2,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 30,
            top: 30,
            width: 60,
            height: 60,
            backgroundColor: 'blue',
            zIndex: 1,
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
})
