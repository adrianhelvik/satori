import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('flex-shrink text behavior', () => {
  let fonts
  initFonts((f) => (fonts = f))

  // Text layout auto-sets flexShrink=1 on parent elements without
  // explicit flex-shrink, matching CSS default. To prevent items from
  // collapsing below their content size (CSS min-height:auto behavior),
  // the text measure function sets minHeight on the parent during layout.

  describe('column layout — items shrink to content size', () => {
    it('should shrink items to content height, not to zero', async () => {
      // Three items totaling more than container height (3×60 > 100).
      // Items shrink to share the container, but never below their text
      // content height (min-height:auto behavior).
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

    it('should shrink items to content height in column-reverse layout', async () => {
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
