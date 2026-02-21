import { describe, expect, it } from 'vitest'

import satori from '../src/index.js'
import expand from '../src/handler/expand.js'
import { initFonts, toImage } from './utils.js'

describe('all property', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should reset earlier declarations with all: initial', async () => {
    const svg = await satori(
      <div
        style={{
          width: 120,
          height: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'white',
        }}
      >
        <div
          style={Object.assign(
            {
              width: 80,
              height: 80,
              border: '8px solid #00ff00',
              backgroundColor: 'red',
              all: 'initial',
            } as any,
            {
              display: 'block',
              width: 60,
              height: 60,
              backgroundColor: 'blue',
            }
          )}
        />
      </div>,
      { width: 120, height: 120, fonts }
    )

    expect(svg).not.toContain('#00ff00')
    expect(toImage(svg, 120)).toMatchImageSnapshot()
  })

  it('should treat all: unset as inherit for inherited text properties', async () => {
    const svg = await satori(
      <div
        style={{
          width: 240,
          height: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#cc0000',
          fontFamily: 'Playfair Display',
          fontSize: 30,
          backgroundColor: 'white',
        }}
      >
        <div style={{ all: 'unset', display: 'block' }}>Unset</div>
      </div>,
      { width: 240, height: 100, fonts, embedFont: false }
    )

    expect(svg).toContain('fill="#cc0000"')
    expect(svg).toContain('font-size="30"')
    expect(toImage(svg, 240)).toMatchImageSnapshot()
  })

  it('should not reset direction or unicode-bidi when all is applied', () => {
    const expanded = expand(
      {
        direction: 'rtl',
        unicodeBidi: 'bidi-override',
        all: 'initial',
      },
      {
        color: 'black',
        fontSize: 16,
        opacity: 1,
        _viewportWidth: 240,
        _viewportHeight: 100,
      }
    )

    expect(expanded.direction).toBe('rtl')
    expect(expanded.unicodeBidi).toBe('bidi-override')
  })

  it('should treat hyphenateLimitChars as inherited when all is unset', () => {
    const expanded = expand(
      { all: 'unset' },
      {
        color: 'black',
        fontSize: 16,
        opacity: 1,
        hyphenateLimitChars: '8 3 3',
        _viewportWidth: 240,
        _viewportHeight: 100,
      }
    )

    expect(expanded.hyphenateLimitChars).toBe('8 3 3')
  })

  it('should treat fontVariantCaps as inherited when all is unset', () => {
    const expanded = expand(
      { all: 'unset' },
      {
        color: 'black',
        fontSize: 16,
        opacity: 1,
        fontVariantCaps: 'small-caps',
        _viewportWidth: 240,
        _viewportHeight: 100,
      }
    )

    expect(expanded.fontVariantCaps).toBe('small-caps')
  })

  it('should treat fontVariantPosition as inherited when all is unset', () => {
    const expanded = expand(
      { all: 'unset' },
      {
        color: 'black',
        fontSize: 16,
        opacity: 1,
        fontVariantPosition: 'super',
        _viewportWidth: 240,
        _viewportHeight: 100,
      }
    )

    expect(expanded.fontVariantPosition).toBe('super')
  })

  it('should treat fontVariant shorthand as inherited when all is unset', () => {
    const expanded = expand(
      { all: 'unset' },
      {
        color: 'black',
        fontSize: 16,
        opacity: 1,
        fontVariant: ['small-caps', 'super'],
        _viewportWidth: 240,
        _viewportHeight: 100,
      }
    )

    expect(expanded.fontVariant).toEqual(['small-caps', 'super'])
  })
})
