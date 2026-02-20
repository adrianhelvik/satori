import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Border Styles', () => {
  let fonts
  initFonts((f) => (fonts = f))

  describe('dotted', () => {
    it('should render dotted border', async () => {
      const svg = await satori(
        <div
          style={{
            width: 80,
            height: 80,
            border: '3px dotted red',
            backgroundColor: 'white',
          }}
        />,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should render dotted border with border-radius', async () => {
      const svg = await satori(
        <div
          style={{
            width: 80,
            height: 80,
            border: '2px dotted blue',
            borderRadius: 10,
            backgroundColor: 'white',
          }}
        />,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should render mixed dotted and solid borders', async () => {
      const svg = await satori(
        <div
          style={{
            width: 80,
            height: 80,
            borderTop: '3px dotted red',
            borderRight: '3px solid blue',
            borderBottom: '3px dotted green',
            borderLeft: '3px solid orange',
            backgroundColor: 'white',
          }}
        />,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('double', () => {
    it('should render double border', async () => {
      const svg = await satori(
        <div
          style={{
            width: 80,
            height: 80,
            border: '4px double red',
            backgroundColor: 'white',
          }}
        />,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should render double border with larger width', async () => {
      const svg = await satori(
        <div
          style={{
            width: 70,
            height: 70,
            border: '6px double blue',
            backgroundColor: 'white',
          }}
        />,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should fall back to solid for thin double borders', async () => {
      const svg = await satori(
        <div
          style={{
            width: 80,
            height: 80,
            border: '2px double green',
            backgroundColor: 'white',
          }}
        />,
        { width: 100, height: 100, fonts }
      )
      // 2px is too thin for double (< 3px), so it renders as single solid-like line
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('inset/outset', () => {
    it('should render inset border shading', async () => {
      const svg = await satori(
        <div
          style={{
            width: 80,
            height: 80,
            border: '6px inset red',
            backgroundColor: 'white',
          }}
        />,
        { width: 100, height: 100, fonts }
      )
      expect(svg).toContain('rgba(')
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should render outset border shading', async () => {
      const svg = await satori(
        <div
          style={{
            width: 80,
            height: 80,
            border: '6px outset red',
            backgroundColor: 'white',
          }}
        />,
        { width: 100, height: 100, fonts }
      )
      expect(svg).toContain('rgba(')
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })
})
