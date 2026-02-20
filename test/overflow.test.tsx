import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Overflow', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should not show overflowed text', async () => {
    const svg = await satori(
      <div
        style={{
          width: 15,
          height: 15,
          backgroundColor: 'white',
          overflow: 'hidden',
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
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should clip overflow when overflow is clip', async () => {
    const svg = await satori(
      <div
        style={{
          width: 60,
          height: 60,
          backgroundColor: 'white',
          overflow: 'clip',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 100,
            height: 100,
            backgroundColor: 'red',
            top: 0,
            left: 0,
          }}
        />
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )

    expect(svg).toContain('clipPath')
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should extend clipping edge with overflow-clip-margin', async () => {
    const baseNodeStyle = {
      width: 60,
      height: 60,
      backgroundColor: 'white',
      overflow: 'clip' as const,
      position: 'relative' as const,
    }
    const child = (
      <div
        style={{
          position: 'absolute',
          width: 80,
          height: 20,
          backgroundColor: 'red',
          left: -10,
          top: 20,
        }}
      />
    )

    const withoutMargin = await satori(
      <div style={baseNodeStyle}>{child}</div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )

    const withMargin = await satori(
      <div style={{ ...baseNodeStyle, overflowClipMargin: 10 }}>{child}</div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )

    expect(toImage(withMargin, 100)).not.toEqual(toImage(withoutMargin, 100))
    expect(toImage(withMargin, 100)).toMatchImageSnapshot()
  })

  it('should ignore overflow-clip-margin when overflow is hidden', async () => {
    const baseNodeStyle = {
      width: 60,
      height: 60,
      backgroundColor: 'white',
      overflow: 'hidden' as const,
      position: 'relative' as const,
    }
    const child = (
      <div
        style={{
          position: 'absolute',
          width: 80,
          height: 20,
          backgroundColor: 'blue',
          left: -10,
          top: 20,
        }}
      />
    )

    const withoutMargin = await satori(
      <div style={baseNodeStyle}>{child}</div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )

    const withMargin = await satori(
      <div style={{ ...baseNodeStyle, overflowClipMargin: 10 }}>{child}</div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )

    expect(toImage(withMargin, 100)).toEqual(toImage(withoutMargin, 100))
  })

  it('should work with nested border, border-radius, padding', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          border: '10px solid rgba(0,0,0,0.5)',
          borderRadius: '100px 20%',
          display: 'flex',
          overflow: 'hidden',
          background: 'green',
          padding: 5,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'red',
            borderRadius: '0% 60%',
            display: 'flex',
            padding: 5,
            overflow: 'hidden',
          }}
        >
          <div style={{ width: '100%', height: '100%', background: 'blue' }}>
            Satori
          </div>
        </div>
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should work with ellipsis, nowrap', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          backgroundColor: 'white',
          fontSize: 60,
          fontWeight: 400,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 450,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          <div
            style={{
              width: 450,
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}
          >
            {'LuciNyan 1 2 345'}
          </div>
          <div
            style={{
              width: 450,
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}
          >
            {'LuciNyan 1 2 345 6'}
          </div>
        </div>
      </div>,
      { width: 450, height: 450, fonts, embedFont: true }
    )
    expect(toImage(svg, 450)).toMatchImageSnapshot()
  })

  it('should support ellipsis when overflow is clip', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 220,
          backgroundColor: 'white',
          fontSize: 28,
          whiteSpace: 'nowrap',
          overflow: 'clip',
          textOverflow: 'ellipsis',
        }}
      >
        {'LuciNyan 1 2 345 6'}
      </div>,
      { width: 220, height: 80, fonts, embedFont: true }
    )
    expect(toImage(svg, 220)).toMatchImageSnapshot()
  })

  it("should not work when overflow is not 'hidden' and overflow property should not be inherited", async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          backgroundColor: 'white',
          fontSize: 60,
          fontWeight: 400,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 450,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          <div
            style={{
              width: 450,
              textOverflow: 'ellipsis',
            }}
          >
            {'LuciNyan 1 2 345'}
          </div>
          <div
            style={{
              width: 450,
              textOverflow: 'ellipsis',
            }}
          >
            {'LuciNyan 1 2 345 6'}
          </div>
        </div>
      </div>,
      { width: 450, height: 450, fonts, embedFont: true }
    )
    expect(toImage(svg, 450)).toMatchImageSnapshot()
  })
})
