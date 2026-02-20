import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Visual Extras', () => {
  let fonts
  initFonts((f) => (fonts = f))

  describe('mix-blend-mode', () => {
    it('should apply mix-blend-mode multiply', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            width: 100,
            height: 100,
            backgroundColor: 'white',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              backgroundColor: 'red',
              position: 'absolute',
              top: 10,
              left: 10,
            }}
          />
          <div
            style={{
              width: 60,
              height: 60,
              backgroundColor: 'blue',
              position: 'absolute',
              top: 30,
              left: 30,
              mixBlendMode: 'multiply',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should apply mix-blend-mode screen', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            width: 100,
            height: 100,
            backgroundColor: 'black',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              backgroundColor: 'red',
              position: 'absolute',
              top: 10,
              left: 10,
            }}
          />
          <div
            style={{
              width: 60,
              height: 60,
              backgroundColor: 'green',
              position: 'absolute',
              top: 30,
              left: 30,
              mixBlendMode: 'screen',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('transform: matrix()', () => {
    it('should support CSS matrix() transform', async () => {
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
              width: 30,
              height: 30,
              backgroundColor: 'red',
              transform: 'matrix(1, 0, 0, 1, 20, 20)',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      // matrix(1,0,0,1,20,20) is a pure translation by (20,20)
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support matrix() with rotation', async () => {
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
              width: 40,
              height: 40,
              backgroundColor: 'blue',
              transform: 'matrix(0.707, 0.707, -0.707, 0.707, 0, 0)',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      // 45-degree rotation
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('individual transform properties', () => {
    it('should support the rotate individual property', async () => {
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
              width: 30,
              height: 30,
              backgroundColor: 'red',
              rotate: '45deg',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support the scale individual property', async () => {
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
              width: 20,
              height: 20,
              backgroundColor: 'green',
              scale: '2',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      // 20x20 scaled by 2 → appears as 40x40
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support the translate individual property', async () => {
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
              width: 20,
              height: 20,
              backgroundColor: 'purple',
              translate: '30px 40px',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('image-rendering', () => {
    it('should accept image-rendering property without error', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            width: 100,
            height: 100,
            backgroundColor: 'white',
            imageRendering: 'pixelated',
          }}
        >
          <div style={{ width: 50, height: 50, backgroundColor: 'red' }} />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(svg).toBeTruthy()
    })
  })
})
