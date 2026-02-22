import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Position', () => {
  let fonts
  initFonts((f) => (fonts = f))

  describe('absolute', () => {
    it('should support absolute position', async () => {
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
          }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 10,
              height: 10,
              background: 'black',
            }}
          ></div>
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    // https://www.yogalayout.dev/blog/announcing-yoga-3.0#better-support-for-absolute-positioning
    it('should have correct size calculation of absolutely positioned elements', async () => {
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            padding: 10,
            background: 'red',
          }}
        >
          <div
            style={{
              position: 'absolute',
              height: '25%',
              width: '25%',
              background: 'black',
            }}
          ></div>
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('static', () => {
    it('should support static position', async () => {
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
          }}
        >
          <div
            style={{
              position: 'static',
              left: 10,
              top: 10,
              bottom: 0,
              right: 0,
              width: 10,
              height: 10,
              background: 'black',
            }}
          ></div>
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('relative', () => {
    it('should support relative position', async () => {
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
          }}
        >
          <div
            style={{
              position: 'relative',
              left: 10,
              top: 10,
              bottom: 0,
              right: 0,
              width: 10,
              height: 10,
              background: 'black',
            }}
          ></div>
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('fixed', () => {
    it('should support fixed positioning on the root element', async () => {
      const svg = await satori(
        <div
          style={{
            position: 'fixed',
            top: 7,
            left: 9,
            width: 18,
            height: 18,
            background: 'blue',
          }}
        />,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should anchor fixed descendants to transformed containing blocks', async () => {
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'black',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 60,
              height: 60,
              background: 'red',
              overflow: 'hidden',
              transform: 'translate(12px, 8px)',
            }}
          >
            <div
              style={{
                position: 'fixed',
                top: 6,
                left: 4,
                width: 18,
                height: 18,
                background: 'blue',
              }}
            />
          </div>
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should anchor fixed descendants to filter containing blocks', async () => {
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'black',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 60,
              height: 60,
              background: 'red',
              overflow: 'hidden',
              filter: 'blur(0px)',
            }}
          >
            <div
              style={{
                position: 'fixed',
                top: 6,
                left: 4,
                width: 18,
                height: 18,
                background: 'blue',
              }}
            />
          </div>
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should anchor fixed descendants to perspective containing blocks', async () => {
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'black',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 60,
              height: 60,
              background: 'red',
              overflow: 'hidden',
              perspective: '120px',
            }}
          >
            <div
              style={{
                position: 'fixed',
                top: 6,
                left: 4,
                width: 18,
                height: 18,
                background: 'blue',
              }}
            />
          </div>
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should anchor fixed descendants to contain:paint containing blocks', async () => {
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'black',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 60,
              height: 60,
              background: 'red',
              overflow: 'hidden',
              contain: 'paint',
            }}
          >
            <div
              style={{
                position: 'fixed',
                top: 6,
                left: 4,
                width: 18,
                height: 18,
                background: 'blue',
              }}
            />
          </div>
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should anchor fixed descendants to will-change containing blocks', async () => {
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'black',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 60,
              height: 60,
              background: 'red',
              overflow: 'hidden',
              willChange: 'transform',
            }}
          >
            <div
              style={{
                position: 'fixed',
                top: 6,
                left: 4,
                width: 18,
                height: 18,
                background: 'blue',
              }}
            />
          </div>
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should anchor nested fixed elements to the viewport without transformed ancestors', async () => {
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'black',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 60,
              height: 60,
              background: 'red',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'fixed',
                top: 6,
                left: 4,
                width: 18,
                height: 18,
                background: 'blue',
              }}
            />
          </div>
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support viewport insets for fixed positioning', async () => {
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            background: 'black',
          }}
        >
          <div
            style={{
              position: 'fixed',
              top: 4,
              left: 3,
              width: 14,
              height: 14,
              background: 'red',
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: 4,
              right: 3,
              width: 14,
              height: 14,
              background: 'green',
            }}
          />
          <div
            style={{
              position: 'fixed',
              bottom: 4,
              left: 3,
              width: 14,
              height: 14,
              background: 'blue',
            }}
          />
          <div
            style={{
              position: 'fixed',
              bottom: 4,
              right: 3,
              width: 14,
              height: 14,
              background: 'yellow',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support inset shorthand for fixed positioning', async () => {
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            background: 'black',
          }}
        >
          <div
            style={{
              position: 'fixed',
              inset: '10px 56px 58px 12px',
              width: 16,
              height: 16,
              background: '#f0f',
            }}
          />
          <div
            style={{
              position: 'fixed',
              inset: '52px 11px 9px 67px',
              width: 16,
              height: 16,
              background: '#0ff',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('sticky', () => {
    it('should approximate sticky position as static in non-scrolling layouts', async () => {
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
          }}
        >
          <div
            style={{
              position: 'sticky',
              left: 10,
              top: 10,
              bottom: 0,
              right: 0,
              width: 10,
              height: 10,
              background: 'black',
            }}
          ></div>
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })
})
