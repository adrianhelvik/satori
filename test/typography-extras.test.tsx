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
  })
})
