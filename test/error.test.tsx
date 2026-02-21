import { it, describe, expect } from 'vitest'

import { initFonts } from './utils.js'
import satori from '../src/index.js'

describe('Error', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should not throw if flex missing on div that has children', async () => {
    const svg = await satori(
      <div>
        Test <span>satori</span> with space
      </div>,
      {
        width: 10,
        height: 10,
        fonts,
      }
    )
    expect(typeof svg).toBe('string')
  })

  it('should not throw if display inline-block on div that has children', async () => {
    const svg = await satori(
      <div style={{ display: 'inline-block' }}>
        Test <span>satori</span> with space
      </div>,
      {
        width: 10,
        height: 10,
        fonts,
      }
    )
    expect(typeof svg).toBe('string')
  })

  it('should not throw if display grid on div that has children', async () => {
    const svg = await satori(
      <div style={{ display: 'grid' }}>
        Test <span>satori</span> with space
      </div>,
      {
        width: 10,
        height: 10,
        fonts,
      }
    )
    expect(typeof svg).toBe('string')
  })

  it('should not throw if display table on div that has children', async () => {
    const svg = await satori(
      <div style={{ display: 'table' }}>
        Test <span>satori</span> with space
      </div>,
      {
        width: 10,
        height: 10,
        fonts,
      }
    )
    expect(typeof svg).toBe('string')
  })

  it('should not throw if display table-row on div that has children', async () => {
    const svg = await satori(
      <div style={{ display: 'table-row' }}>
        Test <span>satori</span> with space
      </div>,
      {
        width: 10,
        height: 10,
        fonts,
      }
    )
    expect(typeof svg).toBe('string')
  })

  it('should not throw if position fixed is used', async () => {
    const svg = await satori(
      <div style={{ position: 'fixed', top: 1, left: 1 }}>Test</div>,
      {
        width: 10,
        height: 10,
        fonts,
      }
    )
    expect(typeof svg).toBe('string')
  })

  it('should not throw if position sticky is used', async () => {
    const svg = await satori(
      <div style={{ position: 'sticky', top: 1 }}>Test</div>,
      {
        width: 10,
        height: 10,
        fonts,
      }
    )
    expect(typeof svg).toBe('string')
  })

  it('should throw if using invalid values', async () => {
    const result = satori(
      // @ts-expect-error
      <div style={{ position: 'bogus-position' }}>Test</div>,
      {
        width: 10,
        height: 10,
        fonts,
      }
    )
    expect(result).rejects.toThrowError(
      `Invalid value for CSS property "position". Allowed values: "absolute" | "relative" | "static". Received: "bogus-position".`
    )
  })

  it('should not throw if display none on div that has children', async () => {
    const svg = await satori(
      <div style={{ display: 'none' }}>
        Test <span>satori</span> with space
      </div>,
      {
        width: 10,
        height: 10,
        fonts,
      }
    )
    expect(typeof svg).toBe('string')
  })

  it('should not throw if flex missing on span that has children', async () => {
    const svg = await satori(
      <span>
        Test <span>satori</span> with space
      </span>,
      {
        width: 10,
        height: 10,
        fonts,
      }
    )
    expect(typeof svg).toBe('string')
  })

  it('should not throw if flex missing on div without children', async () => {
    const svg = await satori(<div></div>, {
      width: 10,
      height: 10,
      fonts,
    })
    expect(typeof svg).toBe('string')
  })

  it('should not allowed to set negative value to rg-size', async () => {
    const result = satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundImage:
            'radial-gradient(-20% 20% at top left, yellow, blue)',
          fontSize: 32,
          fontWeight: 600,
        }}
      ></div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )

    expect(result).rejects.toThrowError(
      'disallow setting negative values to the size of the shape. Check https://w3c.github.io/csswg-drafts/css-images/#valdef-rg-size-length-0'
    )
  })
})
