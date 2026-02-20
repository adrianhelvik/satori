import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Layout Extras', () => {
  let fonts
  initFonts((f) => (fonts = f))

  describe('aspect-ratio', () => {
    it('should support numeric aspect-ratio', async () => {
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
              width: 60,
              aspectRatio: 2,
              backgroundColor: 'red',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      // width=60, aspect-ratio=2 → height=30
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support fractional aspect-ratio string', async () => {
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
              width: 80,
              aspectRatio: '16/9',
              backgroundColor: 'blue',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      // width=80, aspect-ratio=16/9 → height=45
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support aspect-ratio with height only', async () => {
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
              height: 40,
              aspectRatio: '1/1',
              backgroundColor: 'green',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      // height=40, aspect-ratio=1 → width=40 (square)
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('flex-flow', () => {
    it('should support flex-flow shorthand', async () => {
      const svg = await satori(
        <div
          style={{
            width: 100,
            height: 100,
            display: 'flex',
            flexFlow: 'column wrap',
            backgroundColor: 'white',
          }}
        >
          <div style={{ width: 30, height: 60, backgroundColor: 'red' }} />
          <div style={{ width: 30, height: 60, backgroundColor: 'blue' }} />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support flex-flow with only direction', async () => {
      const svg = await satori(
        <div
          style={{
            width: 100,
            height: 100,
            display: 'flex',
            flexFlow: 'row-reverse',
            backgroundColor: 'white',
          }}
        >
          <div style={{ width: 30, height: 30, backgroundColor: 'red' }} />
          <div style={{ width: 30, height: 30, backgroundColor: 'blue' }} />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('place-content', () => {
    it('should support place-content shorthand', async () => {
      const svg = await satori(
        <div
          style={{
            width: 100,
            height: 100,
            display: 'flex',
            placeContent: 'center',
            backgroundColor: 'white',
          }}
        >
          <div style={{ width: 30, height: 30, backgroundColor: 'red' }} />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support place-content with two values', async () => {
      const svg = await satori(
        <div
          style={{
            width: 100,
            height: 100,
            display: 'flex',
            flexWrap: 'wrap',
            placeContent: 'flex-end center',
            backgroundColor: 'white',
          }}
        >
          <div style={{ width: 30, height: 30, backgroundColor: 'red' }} />
          <div style={{ width: 30, height: 30, backgroundColor: 'blue' }} />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('place-items', () => {
    it('should support place-items center', async () => {
      const svg = await satori(
        <div
          style={{
            width: 100,
            height: 100,
            display: 'flex',
            placeItems: 'center',
            backgroundColor: 'white',
          }}
        >
          <div style={{ width: 30, height: 30, backgroundColor: 'red' }} />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('place-self', () => {
    it('should support place-self on child', async () => {
      const svg = await satori(
        <div
          style={{
            width: 100,
            height: 100,
            display: 'flex',
            backgroundColor: 'white',
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              placeSelf: 'center',
              backgroundColor: 'red',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('justify-items / justify-self', () => {
    it('should support justify-items via cross-axis approximation', async () => {
      const svg = await satori(
        <div
          style={{
            width: 120,
            height: 120,
            display: 'flex',
            flexDirection: 'column',
            justifyItems: 'center',
            backgroundColor: 'white',
          }}
        >
          <div style={{ width: 30, height: 30, backgroundColor: 'red' }} />
        </div>,
        { width: 120, height: 120, fonts }
      )
      expect(toImage(svg, 120)).toMatchImageSnapshot()
    })

    it('should support justify-self on flex items via cross-axis approximation', async () => {
      const svg = await satori(
        <div
          style={{
            width: 120,
            height: 120,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'white',
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              justifySelf: 'end',
              backgroundColor: 'blue',
            }}
          />
        </div>,
        { width: 120, height: 120, fonts }
      )
      expect(toImage(svg, 120)).toMatchImageSnapshot()
    })
  })

  describe('overflow-x / overflow-y', () => {
    it('should clip when overflow-x is hidden', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            width: 50,
            height: 50,
            overflowX: 'hidden',
            backgroundColor: 'white',
          }}
        >
          {/* Overflows both axes: X should be clipped, Y should remain visible */}
          <div style={{ width: 100, height: 100, backgroundColor: 'red' }} />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should clip when overflow-y is hidden', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            width: 50,
            height: 50,
            overflowY: 'hidden',
            backgroundColor: 'white',
          }}
        >
          {/* Overflows both axes: Y should be clipped, X should remain visible */}
          <div style={{ width: 100, height: 100, backgroundColor: 'blue' }} />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })
})
