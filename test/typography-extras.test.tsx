import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Typography Extras', () => {
  let fonts
  initFonts((f) => (fonts = f))

  describe('word-spacing', () => {
    it('should increase space between words', async () => {
      const svg = await satori(
        <div
          style={{
            width: 200,
            height: 100,
            backgroundColor: 'white',
            fontSize: 16,
            wordSpacing: 20,
          }}
        >
          Hello World Test
        </div>,
        { width: 200, height: 100, fonts }
      )
      expect(toImage(svg, 200)).toMatchImageSnapshot()
    })

    it('should not affect single words', async () => {
      const svg = await satori(
        <div
          style={{
            width: 200,
            height: 100,
            backgroundColor: 'white',
            fontSize: 16,
            wordSpacing: 20,
          }}
        >
          Hello
        </div>,
        { width: 200, height: 100, fonts }
      )
      expect(toImage(svg, 200)).toMatchImageSnapshot()
    })
  })

  describe('text-indent', () => {
    it('should indent first line', async () => {
      const svg = await satori(
        <div
          style={{
            width: 200,
            height: 100,
            backgroundColor: 'white',
            fontFamily: 'Playfair Display',
            fontSize: 14,
            whiteSpace: 'pre-line',
            textIndent: 40,
          }}
        >
          {'This is the first line.\nThis second line should not be indented.'}
        </div>,
        { width: 200, height: 100, fonts }
      )
      expect(toImage(svg, 200)).toMatchImageSnapshot()
    })

    it('should support text-indent length values', async () => {
      const svg = await satori(
        <div
          style={{
            width: 180,
            height: 60,
            backgroundColor: 'white',
            fontFamily: 'Playfair Display',
            fontSize: 20,
            textIndent: '40px',
          }}
        >
          Indented
        </div>,
        { width: 180, height: 60, fonts }
      )
      expect(toImage(svg, 180)).toMatchImageSnapshot()
    })

    it('should support text-indent percentage values', async () => {
      const svg = await satori(
        <div
          style={{
            width: 180,
            height: 60,
            backgroundColor: 'white',
            fontFamily: 'Playfair Display',
            fontSize: 20,
            textIndent: '25%',
          }}
        >
          Indented
        </div>,
        { width: 180, height: 60, fonts }
      )
      expect(toImage(svg, 180)).toMatchImageSnapshot()
    })

    it('should support text-indent calc values', async () => {
      const svg = await satori(
        <div
          style={{
            width: 180,
            height: 60,
            backgroundColor: 'white',
            fontFamily: 'Playfair Display',
            fontSize: 20,
            textIndent: 'calc(25% - 5px)',
          }}
        >
          Indented
        </div>,
        { width: 180, height: 60, fonts }
      )
      expect(toImage(svg, 180)).toMatchImageSnapshot()
    })

    it('should support text-indent: each-line for forced line breaks', async () => {
      const svg = await satori(
        <div
          style={{
            width: 220,
            height: 100,
            backgroundColor: 'white',
            fontFamily: 'Playfair Display',
            fontSize: 16,
            whiteSpace: 'pre-line',
            textIndent: '30px each-line',
          }}
        >
          {'Alpha beta gamma.\nDelta epsilon zeta.\nEta theta iota.'}
        </div>,
        { width: 220, height: 100, fonts }
      )
      expect(toImage(svg, 220)).toMatchImageSnapshot()
    })

    it('should support text-indent: hanging', async () => {
      const svg = await satori(
        <div
          style={{
            width: 220,
            height: 100,
            backgroundColor: 'white',
            fontFamily: 'Playfair Display',
            fontSize: 16,
            whiteSpace: 'pre-line',
            textIndent: '30px hanging',
          }}
        >
          {'Alpha beta gamma.\nDelta epsilon zeta.\nEta theta iota.'}
        </div>,
        { width: 220, height: 100, fonts }
      )
      expect(toImage(svg, 220)).toMatchImageSnapshot()
    })

    it('should support text-indent with each-line and hanging', async () => {
      const svg = await satori(
        <div
          style={{
            width: 220,
            height: 100,
            backgroundColor: 'white',
            fontFamily: 'Playfair Display',
            fontSize: 16,
            whiteSpace: 'pre-line',
            textIndent: '30px each-line hanging',
          }}
        >
          {'one two three\nfour five six seven\neight nine ten eleven twelve'}
        </div>,
        { width: 220, height: 100, fonts }
      )
      expect(toImage(svg, 220)).toMatchImageSnapshot()
    })
  })

  describe('font-variant-caps', () => {
    it('should support fontVariantCaps: small-caps with synthetic fallback', async () => {
      const svg = await satori(
        <div
          style={{
            width: 240,
            height: 90,
            backgroundColor: 'white',
            fontFamily: 'Playfair Display',
            fontSize: 18,
            fontVariantCaps: 'small-caps',
          }}
        >
          Alpha beta gamma
        </div>,
        { width: 240, height: 90, fonts, embedFont: false }
      )

      expect(toImage(svg, 240)).toMatchImageSnapshot()
    })

    it('should support fontVariant: small-caps shorthand values', async () => {
      const svg = await satori(
        <div
          style={{
            width: 240,
            height: 90,
            backgroundColor: 'white',
            fontFamily: 'Playfair Display',
            fontSize: 18,
            fontVariant: 'small-caps' as any,
          }}
        >
          Alpha beta gamma
        </div>,
        { width: 240, height: 90, fonts, embedFont: false }
      )

      expect(toImage(svg, 240)).toMatchImageSnapshot()
    })
  })

  describe('font-variant-position', () => {
    it('should support fontVariantPosition: super', async () => {
      const svg = await satori(
        <div
          style={{
            width: 220,
            height: 100,
            backgroundColor: 'white',
            fontFamily: 'Playfair Display',
            fontSize: 32,
            fontVariantPosition: 'super',
          }}
        >
          Variant
        </div>,
        { width: 220, height: 100, fonts, embedFont: false }
      )
      expect(toImage(svg, 220)).toMatchImageSnapshot()
    })

    it('should support fontVariant shorthand: super', async () => {
      const svg = await satori(
        <div
          style={{
            width: 220,
            height: 100,
            backgroundColor: 'white',
            fontFamily: 'Playfair Display',
            fontSize: 32,
            fontVariant: 'super' as any,
          }}
        >
          Variant
        </div>,
        { width: 220, height: 100, fonts, embedFont: false }
      )
      expect(toImage(svg, 220)).toMatchImageSnapshot()
    })

    it('should support fontVariantPosition: sub', async () => {
      const svg = await satori(
        <div
          style={{
            width: 220,
            height: 100,
            backgroundColor: 'white',
            fontFamily: 'Playfair Display',
            fontSize: 32,
            fontVariantPosition: 'sub',
          }}
        >
          Variant
        </div>,
        { width: 220, height: 100, fonts, embedFont: false }
      )
      expect(toImage(svg, 220)).toMatchImageSnapshot()
    })

    it('should support combined fontVariant shorthand tokens', async () => {
      const svg = await satori(
        <div
          style={{
            width: 220,
            height: 100,
            backgroundColor: 'white',
            fontFamily: 'Playfair Display',
            fontSize: 32,
            fontVariant: 'small-caps super' as any,
          }}
        >
          alpha beta
        </div>,
        { width: 220, height: 100, fonts, embedFont: false }
      )
      expect(toImage(svg, 220)).toMatchImageSnapshot()
    })
  })

  describe('overflow-wrap', () => {
    it('should break long words with overflow-wrap: break-word', async () => {
      const svg = await satori(
        <div
          style={{
            width: 100,
            height: 100,
            backgroundColor: 'white',
            fontSize: 14,
            overflowWrap: 'break-word',
          }}
        >
          Supercalifragilisticexpialidocious
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should work with word-wrap alias', async () => {
      const svg = await satori(
        <div
          style={{
            width: 100,
            height: 100,
            backgroundColor: 'white',
            fontSize: 14,
            wordWrap: 'break-word',
          }}
        >
          Supercalifragilisticexpialidocious
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should break with overflow-wrap: anywhere', async () => {
      const svg = await satori(
        <div
          style={{
            width: 80,
            height: 100,
            backgroundColor: 'white',
            fontSize: 14,
            overflowWrap: 'anywhere',
          }}
        >
          ABCDEFGHIJKLMNOP
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('text-decoration extras', () => {
    it('should render overline', async () => {
      const svg = await satori(
        <div
          style={{
            width: 200,
            height: 100,
            backgroundColor: 'white',
            fontSize: 20,
            textDecorationLine: 'overline',
          }}
        >
          Overline Text
        </div>,
        { width: 200, height: 100, fonts }
      )
      expect(toImage(svg, 200)).toMatchImageSnapshot()
    })

    it('should render underline + overline', async () => {
      const svg = await satori(
        <div
          style={{
            width: 200,
            height: 100,
            backgroundColor: 'white',
            fontSize: 20,
            textDecorationLine: 'underline overline',
            textDecorationColor: 'red',
          }}
        >
          Both Lines
        </div>,
        { width: 200, height: 100, fonts }
      )
      expect(toImage(svg, 200)).toMatchImageSnapshot()
    })

    it('should render wavy underline', async () => {
      const svg = await satori(
        <div
          style={{
            width: 200,
            height: 100,
            backgroundColor: 'white',
            fontSize: 20,
            textDecorationLine: 'underline',
            textDecorationStyle: 'wavy',
            textDecorationColor: 'red',
          }}
        >
          Wavy Underline
        </div>,
        { width: 200, height: 100, fonts }
      )
      expect(toImage(svg, 200)).toMatchImageSnapshot()
    })

    it('should support text-decoration-thickness', async () => {
      const svg = await satori(
        <div
          style={{
            width: 200,
            height: 100,
            backgroundColor: 'white',
            fontSize: 20,
            textDecorationLine: 'underline',
            textDecorationThickness: 4,
            textDecorationColor: 'blue',
          }}
        >
          Thick Underline
        </div>,
        { width: 200, height: 100, fonts }
      )
      expect(toImage(svg, 200)).toMatchImageSnapshot()
    })

    it('should support text-decoration-thickness: from-font', async () => {
      const svg = await satori(
        <div
          style={{
            width: 220,
            height: 130,
            backgroundColor: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 26,
              textDecorationLine: 'underline',
              textDecorationColor: 'black',
              textDecorationThickness: 'auto',
            }}
          >
            Thickness
          </div>
          <div
            style={{
              fontSize: 26,
              textDecorationLine: 'underline',
              textDecorationColor: 'black',
              textDecorationThickness: 'from-font',
            }}
          >
            Thickness
          </div>
        </div>,
        { width: 220, height: 130, fonts, embedFont: false }
      )
      const underlineWidths = Array.from(
        svg.matchAll(/<line[^>]*stroke-width="([^"]+)"/g)
      ).map((match) => Number.parseFloat(match[1]))

      expect(underlineWidths.length).toBeGreaterThanOrEqual(2)
      expect(underlineWidths[0]).not.toBeCloseTo(underlineWidths[1], 5)
      expect(toImage(svg, 220)).toMatchImageSnapshot()
    })

    it('should support text-decoration-thickness percentage values', async () => {
      const svg = await satori(
        <div
          style={{
            width: 240,
            height: 80,
            backgroundColor: 'white',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              fontSize: 24,
              color: 'transparent',
              textDecorationLine: 'underline',
              textDecorationColor: 'red',
              textDecorationThickness: 'auto',
            }}
          >
            Thickness
          </div>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              fontSize: 24,
              color: 'transparent',
              textDecorationLine: 'underline',
              textDecorationColor: 'blue',
              textDecorationThickness: '20%',
            }}
          >
            Thickness
          </div>
        </div>,
        { width: 240, height: 80, fonts, embedFont: false }
      )

      const redMatch = svg.match(
        /<line[^>]*stroke="red"[^>]*stroke-width="([^"]+)"/
      )
      const blueMatch = svg.match(
        /<line[^>]*stroke="blue"[^>]*stroke-width="([^"]+)"/
      )
      expect(redMatch).toBeTruthy()
      expect(blueMatch).toBeTruthy()
      expect(Number.parseFloat(blueMatch![1])).toBeGreaterThan(
        Number.parseFloat(redMatch![1])
      )
      expect(toImage(svg, 240)).toMatchImageSnapshot()
    })

    it('should support text-underline-offset', async () => {
      const svg = await satori(
        <div
          style={{
            width: 200,
            height: 100,
            backgroundColor: 'white',
            fontSize: 20,
            textDecorationLine: 'underline',
            textUnderlineOffset: 6,
            textDecorationColor: 'green',
          }}
        >
          Offset Underline
        </div>,
        { width: 200, height: 100, fonts }
      )
      expect(toImage(svg, 200)).toMatchImageSnapshot()
    })

    it('should support text-underline-offset length values', async () => {
      const svg = await satori(
        <div
          style={{
            width: 240,
            height: 80,
            backgroundColor: 'white',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              fontSize: 24,
              color: 'transparent',
              textDecorationLine: 'underline',
              textDecorationColor: 'red',
              textUnderlineOffset: 'auto',
            }}
          >
            Offset
          </div>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              fontSize: 24,
              color: 'transparent',
              textDecorationLine: 'underline',
              textDecorationColor: 'blue',
              textUnderlineOffset: '0.25em',
            }}
          >
            Offset
          </div>
        </div>,
        { width: 240, height: 80, fonts, embedFont: false }
      )

      const redMatch = svg.match(/<line[^>]*y1="([^"]+)"[^>]*stroke="red"/)
      const blueMatch = svg.match(/<line[^>]*y1="([^"]+)"[^>]*stroke="blue"/)
      expect(redMatch).toBeTruthy()
      expect(blueMatch).toBeTruthy()
      expect(Number.parseFloat(blueMatch![1])).toBeGreaterThan(
        Number.parseFloat(redMatch![1])
      )
      expect(toImage(svg, 240)).toMatchImageSnapshot()
    })

    it('should support text-underline-position under', async () => {
      const svg = await satori(
        <div
          style={{
            width: 220,
            height: 120,
            backgroundColor: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 24,
              textDecorationLine: 'underline',
              textDecorationColor: 'black',
              textUnderlinePosition: 'auto',
            }}
          >
            gypjqy
          </div>
          <div
            style={{
              fontSize: 24,
              textDecorationLine: 'underline',
              textDecorationColor: 'black',
              textUnderlinePosition: 'under',
            }}
          >
            gypjqy
          </div>
        </div>,
        { width: 220, height: 120, fonts }
      )
      expect(toImage(svg, 220)).toMatchImageSnapshot()
    })

    it('should support text-underline-position from-font', async () => {
      const svg = await satori(
        <div
          style={{
            width: 220,
            height: 120,
            backgroundColor: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 24,
              textDecorationLine: 'underline',
              textDecorationColor: 'black',
              textUnderlinePosition: 'auto',
            }}
          >
            gypjqy
          </div>
          <div
            style={{
              fontSize: 24,
              textDecorationLine: 'underline',
              textDecorationColor: 'black',
              textUnderlinePosition: 'from-font',
            }}
          >
            gypjqy
          </div>
        </div>,
        { width: 220, height: 120, fonts }
      )
      expect(toImage(svg, 220)).toMatchImageSnapshot()
    })
  })
})
