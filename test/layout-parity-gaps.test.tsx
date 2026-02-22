import { describe, expect, it } from 'vitest'

import satori from '../src/index.js'
import { initFonts, toImage } from './utils.js'

describe('Layout Parity Gaps', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should track block margin-collapsing behavior between sibling blocks', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          backgroundColor: '#ddd',
        }}
      >
        <div
          style={{
            display: 'block',
            width: 60,
            height: 20,
            marginBottom: 20,
            backgroundColor: 'red',
          }}
        />
        <div
          style={{
            display: 'block',
            width: 60,
            height: 20,
            marginTop: 20,
            backgroundColor: 'blue',
          }}
        />
      </div>,
      { width: 120, height: 120, fonts }
    )

    expect(toImage(svg, 120)).toMatchImageSnapshot()
  })

  it('should track inline formatting where width and height are ignored', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          backgroundColor: '#ddd',
          color: '#fff',
          fontSize: 24,
          lineHeight: 1.2,
        }}
      >
        <span
          style={{
            display: 'inline',
            width: 90,
            height: 50,
            backgroundColor: 'red',
          }}
        >
          Hi
        </span>
        <span
          style={{
            display: 'inline',
            backgroundColor: 'blue',
          }}
        >
          !
        </span>
      </div>,
      { width: 120, height: 120, fonts }
    )

    expect(toImage(svg, 120)).toMatchImageSnapshot()
  })

  it('should track inline-block line-box wrapping semantics', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          display: 'block',
          backgroundColor: '#ddd',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            width: 35,
            height: 24,
            backgroundColor: 'red',
          }}
        />
        <div
          style={{
            display: 'inline-block',
            width: 35,
            height: 24,
            backgroundColor: 'blue',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should track inline-block shrink-to-fit sizing for auto-width content', async () => {
    const svg = await satori(
      <div
        style={{
          width: 120,
          height: 100,
          display: 'block',
          backgroundColor: '#ddd',
          fontSize: 20,
          lineHeight: 1.1,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            paddingLeft: 6,
            paddingRight: 6,
            backgroundColor: 'red',
            color: 'white',
          }}
        >
          Hello
        </div>
        <div
          style={{
            display: 'inline-block',
            paddingLeft: 6,
            paddingRight: 6,
            backgroundColor: 'blue',
            color: 'white',
          }}
        >
          W
        </div>
      </div>,
      { width: 120, height: 100, fonts }
    )

    expect(toImage(svg, 120)).toMatchImageSnapshot()
  })

  it('should track margin collapsing between parent blocks and first children', async () => {
    const svg = await satori(
      <div
        style={{
          width: 120,
          height: 120,
          display: 'block',
          backgroundColor: '#ddd',
        }}
      >
        <div
          style={{
            display: 'block',
            width: 90,
            backgroundColor: '#bbb',
          }}
        >
          <div
            style={{
              display: 'block',
              width: 44,
              height: 18,
              marginTop: 20,
              backgroundColor: 'red',
            }}
          />
          <div
            style={{
              display: 'block',
              width: 44,
              height: 18,
              backgroundColor: 'blue',
            }}
          />
        </div>
      </div>,
      { width: 120, height: 120, fonts }
    )

    expect(toImage(svg, 120)).toMatchImageSnapshot()
  })

  it('should track fixed elements establishing containing blocks for absolute descendants', async () => {
    const svg = await satori(
      <div
        style={{
          width: 120,
          height: 120,
          display: 'block',
          backgroundColor: 'black',
        }}
      >
        <div
          style={{
            position: 'fixed',
            top: 24,
            left: 24,
            width: 64,
            height: 64,
            backgroundColor: 'red',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 10,
              width: 16,
              height: 16,
              backgroundColor: 'blue',
            }}
          />
        </div>
      </div>,
      { width: 120, height: 120, fonts }
    )

    expect(toImage(svg, 120)).toMatchImageSnapshot()
  })

  it('should track named grid line placement', async () => {
    const svg = await satori(
      <div
        style={{
          width: 120,
          height: 60,
          display: 'grid',
          gridTemplateColumns: '[left] 1fr [center] 1fr [right]',
          gridTemplateRows: '1fr',
          backgroundColor: '#ddd',
        }}
      >
        <div style={{ gridColumn: 'center / right', backgroundColor: 'red' }} />
      </div>,
      { width: 120, height: 60, fonts }
    )

    expect(toImage(svg, 120)).toMatchImageSnapshot()
  })

  it('should track grid spans that reference named lines', async () => {
    const svg = await satori(
      <div
        style={{
          width: 120,
          height: 60,
          display: 'grid',
          gridTemplateColumns: '[c1] 1fr [c2] 1fr [c3] 1fr [c4]',
          gridTemplateRows: '1fr',
          backgroundColor: '#ddd',
        }}
      >
        <div style={{ gridColumn: 'c2 / span 2', backgroundColor: 'blue' }} />
      </div>,
      { width: 120, height: 60, fonts }
    )

    expect(toImage(svg, 120)).toMatchImageSnapshot()
  })
})
