import { it, describe, expect } from 'vitest'

import { initFonts, loadDynamicAsset, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Text Decoration', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('Should work correctly when `text-decoration-line: line-through` and `text-align: right`', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontSize: 20,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            maxWidth: '190px',
            backgroundColor: '#91a8d0',
            textDecorationLine: 'line-through',
            color: 'white',
            textAlign: 'center',
          }}
        >
          你好! It doesn’t 안녕! exist, it never has. I’m nostalgic for a place
          that never existed.
        </div>
      </div>,
      {
        width: 200,
        height: 200,
        fonts,
        loadAdditionalAsset: (languageCode: string, segment: string) => {
          return loadDynamicAsset(languageCode, segment) as any
        },
      }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should work correctly when `text-decoration-line: underline` and `text-align: right`', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontSize: 20,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            maxWidth: '190px',
            backgroundColor: '#91a8d0',
            textDecorationLine: 'underline',
            color: 'white',
            textAlign: 'right',
          }}
        >
          你好! It doesn’t 안녕! exist, it never has. I’m nostalgic for a place
          that never existed.
        </div>
      </div>,
      {
        width: 200,
        height: 200,
        fonts,
        loadAdditionalAsset: (languageCode: string, segment: string) => {
          return loadDynamicAsset(languageCode, segment) as any
        },
      }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should work correctly when `text-decoration-style: dotted`', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontSize: 20,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            maxWidth: '190px',
            backgroundColor: '#91a8d0',
            textDecorationLine: 'underline',
            textDecorationStyle: 'dotted',
            color: 'white',
          }}
        >
          It doesn’t exist, it never has. I’m nostalgic for a place that never
          existed.
        </div>
      </div>,
      { width: 200, height: 200, fonts }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should work correctly when `text-decoration-style: dashed`', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontSize: 20,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            maxWidth: '190px',
            backgroundColor: '#91a8d0',
            textDecorationLine: 'underline',
            textDecorationStyle: 'dashed',
            color: 'white',
          }}
        >
          It doesn’t exist, it never has. I’m nostalgic for a place that never
          existed.
        </div>
      </div>,
      { width: 200, height: 200, fonts }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should work correctly with `text-decoration` and `transform`', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          padding: 10,
          backgroundColor: '#fff',
          fontSize: 32,
        }}
      >
        <div
          style={{
            display: 'flex',
            transform: 'translate(5px, 5px)',
            padding: 10,
            textDecoration: 'underline',
          }}
        >
          lynn
        </div>
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
        loadAdditionalAsset: (languageCode: string, segment: string) => {
          return loadDynamicAsset(languageCode, segment) as any
        },
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('Should work correctly when `text-decoration-style: double`', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontSize: 20,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            backgroundColor: '#91a8d0',
            textDecoration: 'underline double',
            color: 'white',
          }}
        >
          It doesn’t exist, it never has. I’m nostalgic for a place that never
          existed.
        </div>
        <div
          style={{
            backgroundColor: '#000',
            textDecoration: 'line-through double',
            color: 'white',
          }}
        >
          It doesn’t exist, it never has. I’m nostalgic for a place that never
          existed.
        </div>
      </div>,
      { width: 200, height: 200, fonts }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should skip ink by default when `text-decoration-line: underline`', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontSize: 40,
          color: '#000',
          textDecorationLine: 'underline',
        }}
      >
        abgpqapa
      </div>,
      { width: 260, height: 120, fonts }
    )

    expect(toImage(svg, 260)).toMatchImageSnapshot()
  })

  it('Should skip ink on very large text without work that grows with its size', async () => {
    const underlined = (fontSize: number, skipInk: 'auto' | 'none') =>
      satori(
        <div
          style={{
            display: 'flex',
            fontSize,
            color: '#000',
            textDecorationLine: 'underline',
            textDecorationSkipInk: skipInk,
          }}
        >
          agpa
        </div>,
        { width: 200, height: 200, fonts }
      )
    const lines = (svg: string) => svg.match(/<line /g)?.length ?? 0

    const started = Date.now()
    const huge = await underlined(100000, 'auto')
    // Sampling every pixel of a 100000px underline takes about half a minute.
    expect(Date.now() - started).toBeLessThan(5000)
    // The descenders still split the line, as they do at a normal size.
    expect(lines(huge)).toBe(lines(await underlined(40, 'auto')))
    expect(lines(huge)).toBeGreaterThan(lines(await underlined(100000, 'none')))
  })

  it('Should skip ink on text placed far from the origin', async () => {
    // At 1e17 adding 1 to a pixel index no longer changes it, so sampling
    // columns by absolute index never finishes.
    const svg = await satori(
      <div style={{ display: 'flex', width: 200, height: 200 }}>
        <div
          style={{
            position: 'absolute',
            left: 1e17,
            fontSize: 40,
            textDecorationLine: 'underline',
          }}
        >
          g
        </div>
      </div>,
      { width: 200, height: 200, fonts }
    )
    expect(svg).toContain('<svg')
  })

  it('Should draw a wavy line with a bounded number of waves', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          fontSize: 1000000,
          textDecorationLine: 'underline',
          textDecorationStyle: 'wavy',
          textDecorationThickness: 1,
          textDecorationSkipInk: 'none',
        }}
      >
        g
      </div>,
      { width: 200, height: 200, fonts }
    )
    expect(svg.match(/ Q /g)?.length ?? 0).toBeLessThanOrEqual(4096)
  })

  it('Should render continuous line when `text-decoration-skip-ink: none`', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontSize: 40,
          color: '#000',
          textDecorationLine: 'underline',
          textDecorationSkipInk: 'none',
        }}
      >
        abgpqapa
      </div>,
      { width: 260, height: 120, fonts }
    )

    expect(toImage(svg, 260)).toMatchImageSnapshot()
  })

  it('Should skip ink correctly with complex descenders', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontSize: 40,
          color: '#000',
          textDecorationLine: 'underline',
        }}
      >
        agayaqapajaya;a,a|a
      </div>,
      { width: 360, height: 160, fonts }
    )

    expect(toImage(svg, 360)).toMatchImageSnapshot()
  })
})
