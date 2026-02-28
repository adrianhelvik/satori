import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('flex-shrink text behavior', () => {
  let fonts
  initFonts((f) => (fonts = f))

  // Satori defaults flexShrink to 0 (diverging from CSS default of 1).
  // Text layout auto-sets flexShrink=1 for text containers in row layouts
  // so text can wrap within constrained widths. In column layouts it does
  // NOT auto-set flexShrink, preventing items from collapsing to zero
  // height. This means column items overflow rather than shrink — which
  // diverges from CSS (where items shrink to min-content) but avoids the
  // worse outcome of zero-height elements.

  describe('column layout — items overflow instead of collapsing', () => {
    it('should maintain item height even when overflowing column container', async () => {
      // CSS would shrink these to ~33px each (flexShrink:1 + min-height:auto).
      // Satori keeps them at 60px and lets them overflow (flexShrink:0 default).
      // The key invariant: items never collapse to zero height.
      const svg = await satori(
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#fff',
          }}
        >
          <div style={{ height: 60, backgroundColor: '#f00' }}>First</div>
          <div style={{ height: 60, backgroundColor: '#0f0' }}>Second</div>
          <div style={{ height: 60, backgroundColor: '#00f', color: '#fff' }}>
            Third
          </div>
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should render headings at their natural height in column layout', async () => {
      const svg = await satori(
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#fff',
          }}
        >
          <h1 style={{ color: 'red' }}>Heading 1</h1>
          <h2 style={{ color: 'blue' }}>Heading 2</h2>
          <p>Paragraph</p>
        </div>,
        { width: 200, height: 100, fonts }
      )
      expect(toImage(svg, 200)).toMatchImageSnapshot()
    })

    it('should maintain item height in column-reverse layout', async () => {
      const svg = await satori(
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column-reverse',
            backgroundColor: '#fff',
          }}
        >
          <div style={{ height: 60, backgroundColor: '#f00' }}>First</div>
          <div style={{ height: 60, backgroundColor: '#0f0' }}>Second</div>
          <div style={{ height: 60, backgroundColor: '#00f', color: '#fff' }}>
            Third
          </div>
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('row layout — text auto-shrinks to fit', () => {
    it('should allow text to shrink in row layout without explicit width', async () => {
      const svg = await satori(
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'row',
            backgroundColor: '#fff',
          }}
        >
          <div style={{ backgroundColor: '#ddd' }}>
            This is a long text that should wrap and shrink
          </div>
          <div
            style={{
              width: 50,
              height: 50,
              flexShrink: 0,
              backgroundColor: '#f00',
            }}
          />
        </div>,
        { width: 200, height: 100, fonts }
      )
      expect(toImage(svg, 200)).toMatchImageSnapshot()
    })

    it('should allow text to shrink in row-reverse layout', async () => {
      const svg = await satori(
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'row-reverse',
            backgroundColor: '#fff',
          }}
        >
          <div style={{ backgroundColor: '#ddd' }}>
            This is long text that should wrap
          </div>
          <div
            style={{
              width: 50,
              height: 50,
              flexShrink: 0,
              backgroundColor: '#f00',
            }}
          />
        </div>,
        { width: 200, height: 100, fonts }
      )
      expect(toImage(svg, 200)).toMatchImageSnapshot()
    })
  })

  describe('explicit flexShrink overrides', () => {
    it('should respect explicit flexShrink: 0 in row layout', async () => {
      // Explicit flexShrink:0 prevents the text auto-shrink behavior.
      const svg = await satori(
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'row',
            backgroundColor: '#fff',
          }}
        >
          <div style={{ flexShrink: 0, backgroundColor: '#ddd' }}>
            This text has flexShrink 0 and should not shrink
          </div>
          <div
            style={{
              width: 50,
              height: 50,
              flexShrink: 0,
              backgroundColor: '#f00',
            }}
          />
        </div>,
        { width: 200, height: 100, fonts }
      )
      expect(toImage(svg, 200)).toMatchImageSnapshot()
    })

    it('should respect explicit flexShrink: 1 in column layout', async () => {
      // When user explicitly sets flexShrink:1, items should shrink even
      // in column layout. This matches CSS behavior for the opt-in case.
      const svg = await satori(
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#fff',
          }}
        >
          <div
            style={{
              flexShrink: 1,
              height: 80,
              backgroundColor: '#f00',
            }}
          >
            Shrinkable
          </div>
          <div
            style={{
              flexShrink: 1,
              height: 80,
              backgroundColor: '#0f0',
            }}
          >
            Also shrinkable
          </div>
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('explicit width disables auto-shrink', () => {
    it('should not auto-set flexShrink when width is explicit', async () => {
      // The auto-shrink logic only activates when width is auto/undefined.
      // With explicit width, flexShrink stays at satori's default (0),
      // so items overflow. CSS would shrink these (flexShrink defaults to 1).
      const svg = await satori(
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'row',
            backgroundColor: '#fff',
          }}
        >
          <div style={{ width: 150, backgroundColor: '#ddd' }}>
            Text with explicit width
          </div>
          <div
            style={{
              width: 150,
              height: 50,
              backgroundColor: '#f00',
            }}
          />
        </div>,
        { width: 200, height: 100, fonts }
      )
      expect(toImage(svg, 200)).toMatchImageSnapshot()
    })
  })
})
