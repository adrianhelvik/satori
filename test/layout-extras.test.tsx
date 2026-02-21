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
      // In flex rows with default align-items: stretch, browser stretches cross-axis size.
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
      // Browser behavior matches stretched cross-axis sizing in this setup.
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

    it('should parse place-content safe center as a single value', async () => {
      const safe = await satori(
        <div
          style={{
            width: 100,
            height: 100,
            display: 'flex',
            placeContent: 'safe center',
            backgroundColor: 'white',
          }}
        >
          <div style={{ width: 30, height: 30, backgroundColor: 'red' }} />
        </div>,
        { width: 100, height: 100, fonts }
      )

      const center = await satori(
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

      expect(toImage(safe, 100)).toEqual(toImage(center, 100))
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

    it('should ignore place-items justify-items value in flex layout', async () => {
      const base = await satori(
        <div
          style={{
            width: 100,
            height: 100,
            display: 'flex',
            alignItems: 'flex-start',
            backgroundColor: 'white',
          }}
        >
          <div style={{ width: 30, height: 30, backgroundColor: 'red' }} />
        </div>,
        { width: 100, height: 100, fonts }
      )

      const withPlaceItems = await satori(
        <div
          style={{
            width: 100,
            height: 100,
            display: 'flex',
            placeItems: 'flex-start end',
            backgroundColor: 'white',
          }}
        >
          <div style={{ width: 30, height: 30, backgroundColor: 'red' }} />
        </div>,
        { width: 100, height: 100, fonts }
      )

      expect(toImage(withPlaceItems, 100)).toEqual(toImage(base, 100))
    })

    it('should parse place-items safe end as align-items value', async () => {
      const safe = await satori(
        <div
          style={{
            width: 100,
            height: 100,
            display: 'flex',
            placeItems: 'safe end',
            backgroundColor: 'white',
          }}
        >
          <div style={{ width: 30, height: 30, backgroundColor: 'red' }} />
        </div>,
        { width: 100, height: 100, fonts }
      )

      const expected = await satori(
        <div
          style={{
            width: 100,
            height: 100,
            display: 'flex',
            alignItems: 'flex-end',
            backgroundColor: 'white',
          }}
        >
          <div style={{ width: 30, height: 30, backgroundColor: 'red' }} />
        </div>,
        { width: 100, height: 100, fonts }
      )

      expect(toImage(safe, 100)).toEqual(toImage(expected, 100))
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

    it('should ignore place-self justify-self value in flex layout', async () => {
      const base = await satori(
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
              alignSelf: 'flex-end',
              backgroundColor: 'red',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )

      const withPlaceSelf = await satori(
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
              placeSelf: 'flex-end center',
              backgroundColor: 'red',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )

      expect(toImage(withPlaceSelf, 100)).toEqual(toImage(base, 100))
    })

    it('should parse place-self safe end on child', async () => {
      const safe = await satori(
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
              placeSelf: 'safe end',
              backgroundColor: 'red',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )

      const expected = await satori(
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
              alignSelf: 'flex-end',
              backgroundColor: 'red',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )

      expect(toImage(safe, 100)).toEqual(toImage(expected, 100))
    })
  })

  describe('justify-items / justify-self', () => {
    it('should ignore justify-items for flex layout', async () => {
      const base = await satori(
        <div
          style={{
            width: 120,
            height: 120,
            display: 'flex',
            flexDirection: 'row',
            backgroundColor: 'white',
          }}
        >
          <div style={{ width: 30, height: 30, backgroundColor: 'red' }} />
        </div>,
        { width: 120, height: 120, fonts }
      )
      const withJustifyItems = await satori(
        <div
          style={{
            width: 120,
            height: 120,
            display: 'flex',
            flexDirection: 'row',
            justifyItems: 'center',
            backgroundColor: 'white',
          }}
        >
          <div style={{ width: 30, height: 30, backgroundColor: 'red' }} />
        </div>,
        { width: 120, height: 120, fonts }
      )

      expect(toImage(withJustifyItems, 120)).toEqual(toImage(base, 120))
    })

    it('should ignore justify-self for flex items', async () => {
      const base = await satori(
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
              backgroundColor: 'blue',
            }}
          />
        </div>,
        { width: 120, height: 120, fonts }
      )
      const withJustifySelf = await satori(
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

      expect(toImage(withJustifySelf, 120)).toEqual(toImage(base, 120))
    })
  })

  describe('alignment keywords', () => {
    it('should map justify-content start/end aliases', async () => {
      const render = async (justifyContent: string) =>
        satori(
          <div
            style={{
              width: 120,
              height: 60,
              display: 'flex',
              justifyContent,
              backgroundColor: 'white',
            }}
          >
            <div style={{ width: 30, height: 30, backgroundColor: 'red' }} />
          </div>,
          { width: 120, height: 60, fonts }
        )

      const start = await render('start')
      const flexStart = await render('flex-start')
      const end = await render('end')
      const flexEnd = await render('flex-end')

      expect(toImage(start, 120)).toEqual(toImage(flexStart, 120))
      expect(toImage(end, 120)).toEqual(toImage(flexEnd, 120))
    })

    it('should normalize safe/unsafe alignment prefixes', async () => {
      const safe = await satori(
        <div
          style={{
            width: 120,
            height: 80,
            display: 'flex',
            justifyContent: 'safe center',
            alignItems: 'unsafe end',
            backgroundColor: 'white',
          }}
        >
          <div style={{ width: 30, height: 30, backgroundColor: 'blue' }} />
        </div>,
        { width: 120, height: 80, fonts }
      )

      const normalized = await satori(
        <div
          style={{
            width: 120,
            height: 80,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            backgroundColor: 'white',
          }}
        >
          <div style={{ width: 30, height: 30, backgroundColor: 'blue' }} />
        </div>,
        { width: 120, height: 80, fonts }
      )

      expect(toImage(safe, 120)).toEqual(toImage(normalized, 120))
    })

    it('should support justify-content: space-evenly', async () => {
      const nodes: any[] = []

      await satori(
        <div
          style={{
            width: 100,
            height: 40,
            display: 'flex',
            justifyContent: 'space-evenly',
            backgroundColor: 'white',
          }}
        >
          <div
            key='a'
            style={{ width: 10, height: 10, backgroundColor: 'red' }}
          />
          <div
            key='b'
            style={{ width: 10, height: 10, backgroundColor: 'green' }}
          />
          <div
            key='c'
            style={{ width: 10, height: 10, backgroundColor: 'blue' }}
          />
        </div>,
        { width: 100, height: 40, fonts, onNodeDetected: (n) => nodes.push(n) }
      )

      const a = nodes.find((n) => n.key === 'a')
      const b = nodes.find((n) => n.key === 'b')
      const c = nodes.find((n) => n.key === 'c')

      expect(a).toBeTruthy()
      expect(b).toBeTruthy()
      expect(c).toBeTruthy()

      if (!a || !b || !c) return

      const itemWidth = 10
      const startGap = a.left
      const gap1 = b.left - (a.left + itemWidth)
      const gap2 = c.left - (b.left + itemWidth)
      const endGap = 100 - (c.left + itemWidth)

      expect(Math.abs(startGap - gap1)).toBeLessThanOrEqual(1)
      expect(Math.abs(gap1 - gap2)).toBeLessThanOrEqual(1)
      expect(Math.abs(gap2 - endGap)).toBeLessThanOrEqual(1)
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
