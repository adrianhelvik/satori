import { describe, expect, it } from 'vitest'

import satori from '../src/index.js'
import { initFonts, toImage } from './utils.js'

describe('Grid Layout', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should render explicit 2x2 grid tracks', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          backgroundColor: '#ddd',
        }}
      >
        <div style={{ backgroundColor: 'red' }} />
        <div style={{ backgroundColor: 'lime' }} />
        <div style={{ backgroundColor: 'blue' }} />
        <div style={{ backgroundColor: 'yellow' }} />
      </div>,
      { width: 100, height: 100, fonts }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should auto-place items into implicit rows without invalid dimensions', async () => {
    const nodes = []
    const svg = await satori(
      <div
        style={{
          width: 120,
          display: 'grid',
          gridAutoRows: 30,
          backgroundColor: '#ddd',
        }}
      >
        <div data-cell='a' style={{ backgroundColor: 'red' }} />
        <div data-cell='b' style={{ backgroundColor: 'green' }} />
        <div data-cell='c' style={{ backgroundColor: 'blue' }} />
      </div>,
      {
        width: 120,
        height: 120,
        fonts,
        onNodeDetected: (node) => nodes.push(node),
      }
    )

    const cellNodes = nodes.filter((node) => node.props?.['data-cell'])
    const byCell = new Map(
      cellNodes.map((node) => [node.props['data-cell'], node])
    )

    const cellA = byCell.get('a')
    const cellB = byCell.get('b')
    const cellC = byCell.get('c')

    expect(cellA.top).toBeCloseTo(0, 4)
    expect(cellB.top).toBeCloseTo(30, 4)
    expect(cellC.top).toBeCloseTo(60, 4)
    expect(cellB.top).toBeGreaterThan(cellA.top)
    expect(cellC.top).toBeGreaterThan(cellB.top)

    expect(toImage(svg, 120)).toMatchImageSnapshot()
  })

  it('should support grid-auto-flow: column auto-placement', async () => {
    const nodes = []
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          display: 'grid',
          gridTemplateRows: '1fr 1fr',
          gridAutoFlow: 'column',
          backgroundColor: '#ddd',
        }}
      >
        <div data-cell='a' style={{ backgroundColor: 'red' }} />
        <div data-cell='b' style={{ backgroundColor: 'green' }} />
        <div data-cell='c' style={{ backgroundColor: 'blue' }} />
        <div data-cell='d' style={{ backgroundColor: 'yellow' }} />
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
        onNodeDetected: (node) => nodes.push(node),
      }
    )

    const cellNodes = nodes.filter((node) => node.props?.['data-cell'])
    const byCell = new Map(
      cellNodes.map((node) => [node.props['data-cell'], node])
    )

    const cellA = byCell.get('a')
    const cellB = byCell.get('b')
    const cellC = byCell.get('c')
    const cellD = byCell.get('d')

    expect(cellA.left).toBeCloseTo(0, 4)
    expect(cellA.top).toBeCloseTo(0, 4)
    expect(cellB.left).toBeCloseTo(0, 4)
    expect(cellB.top).toBeCloseTo(50, 4)
    expect(cellC.left).toBeCloseTo(50, 4)
    expect(cellC.top).toBeCloseTo(0, 4)
    expect(cellD.left).toBeCloseTo(50, 4)
    expect(cellD.top).toBeCloseTo(50, 4)

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support grid-auto-flow: row dense backfilling', async () => {
    const nodes = []
    const svg = await satori(
      <div
        style={{
          width: 120,
          height: 80,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gridAutoFlow: 'row dense',
          backgroundColor: '#ddd',
        }}
      >
        <div
          data-cell='a'
          style={{ gridColumn: 'span 2', backgroundColor: 'red' }}
        />
        <div
          data-cell='b'
          style={{ gridColumn: 'span 2', backgroundColor: 'green' }}
        />
        <div data-cell='c' style={{ backgroundColor: 'blue' }} />
      </div>,
      {
        width: 120,
        height: 80,
        fonts,
        onNodeDetected: (node) => nodes.push(node),
      }
    )

    const cellNodes = nodes.filter((node) => node.props?.['data-cell'])
    const byCell = new Map(
      cellNodes.map((node) => [node.props['data-cell'], node])
    )

    const cellA = byCell.get('a')
    const cellB = byCell.get('b')
    const cellC = byCell.get('c')

    expect(cellA.left).toBeCloseTo(0, 4)
    expect(cellA.top).toBeCloseTo(0, 4)
    expect(cellA.width).toBeCloseTo(80, 4)

    expect(cellB.left).toBeCloseTo(0, 4)
    expect(cellB.top).toBeCloseTo(40, 4)
    expect(cellB.width).toBeCloseTo(80, 4)

    // Dense packing should backfill the first-row gap at column 3.
    expect(cellC.left).toBeCloseTo(80, 4)
    expect(cellC.top).toBeCloseTo(0, 4)

    expect(toImage(svg, 120)).toMatchImageSnapshot()
  })

  it('should support negative grid line indexes for explicit placement', async () => {
    const nodes = []
    const svg = await satori(
      <div
        style={{
          width: 120,
          height: 40,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gridTemplateRows: '1fr',
          backgroundColor: '#ddd',
        }}
      >
        <div data-cell='a' style={{ backgroundColor: 'red' }} />
        <div
          data-cell='b'
          style={{ gridColumn: '-2 / -1', backgroundColor: 'blue' }}
        />
      </div>,
      {
        width: 120,
        height: 40,
        fonts,
        onNodeDetected: (node) => nodes.push(node),
      }
    )

    const cellNodes = nodes.filter((node) => node.props?.['data-cell'])
    const byCell = new Map(
      cellNodes.map((node) => [node.props['data-cell'], node])
    )

    const cellA = byCell.get('a')
    const cellB = byCell.get('b')

    expect(cellA.left).toBeCloseTo(0, 4)
    expect(cellA.width).toBeCloseTo(40, 4)

    // `-2 / -1` on a 3-column grid resolves to the third track.
    expect(cellB.left).toBeCloseTo(80, 4)
    expect(cellB.width).toBeCloseTo(40, 4)

    expect(toImage(svg, 120)).toMatchImageSnapshot()
  })

  it('should resolve grid spans into stable geometry', async () => {
    const nodes = []

    await satori(
      <div
        style={{
          width: 120,
          height: 90,
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr',
          gridTemplateRows: '1fr 1fr 1fr',
          backgroundColor: '#eee',
        }}
      >
        <div
          data-cell='a'
          style={{
            gridColumn: '1 / span 2',
            gridRow: '1 / span 2',
            backgroundColor: '#f66',
          }}
        />
        <div
          data-cell='b'
          style={{
            gridColumn: '3',
            gridRow: '1',
            backgroundColor: '#66f',
          }}
        />
        <div
          data-cell='c'
          style={{
            gridColumn: '2 / 4',
            gridRow: '3',
            backgroundColor: '#6f6',
          }}
        />
      </div>,
      {
        width: 120,
        height: 90,
        fonts,
        onNodeDetected: (node) => nodes.push(node),
      }
    )

    const cellNodes = nodes.filter((node) => node.props?.['data-cell'])
    const byCell = new Map(
      cellNodes.map((node) => [node.props['data-cell'], node])
    )

    const cellA = byCell.get('a')
    const cellB = byCell.get('b')
    const cellC = byCell.get('c')

    expect(cellA.left).toBeCloseTo(0, 4)
    expect(cellA.top).toBeCloseTo(0, 4)
    expect(cellA.width).toBeCloseTo(90, 4)
    expect(cellA.height).toBeCloseTo(60, 4)

    expect(cellB.left).toBeCloseTo(90, 4)
    expect(cellB.top).toBeCloseTo(0, 4)
    expect(cellB.width).toBeCloseTo(30, 4)
    expect(cellB.height).toBeCloseTo(30, 4)

    expect(cellC.left).toBeCloseTo(60, 4)
    expect(cellC.top).toBeCloseTo(60, 4)
    expect(cellC.width).toBeCloseTo(60, 4)
    expect(cellC.height).toBeCloseTo(30, 4)
  })

  it('should support grid gaps and repeat() tracks', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gridTemplateRows: 'repeat(2, 1fr)',
          gap: 10,
          backgroundColor: '#ddd',
        }}
      >
        <div style={{ backgroundColor: 'red' }} />
        <div style={{ backgroundColor: 'green' }} />
        <div style={{ backgroundColor: 'blue' }} />
        <div style={{ backgroundColor: 'purple' }} />
      </div>,
      { width: 100, height: 100, fonts }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should place children via grid-template-areas names', async () => {
    const nodes = []
    const svg = await satori(
      <div
        style={{
          width: 120,
          height: 80,
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gridTemplateRows: '1fr 1fr',
          gridTemplateAreas: '"hero hero" "side body"',
          backgroundColor: '#ddd',
        }}
      >
        <div
          data-cell='hero'
          style={{ gridArea: 'hero', backgroundColor: 'red' }}
        />
        <div
          data-cell='side'
          style={{ gridArea: 'side', backgroundColor: 'lime' }}
        />
        <div
          data-cell='body'
          style={{ gridArea: 'body', backgroundColor: 'blue' }}
        />
      </div>,
      {
        width: 120,
        height: 80,
        fonts,
        onNodeDetected: (node) => nodes.push(node),
      }
    )

    const cellNodes = nodes.filter((node) => node.props?.['data-cell'])
    const byCell = new Map(
      cellNodes.map((node) => [node.props['data-cell'], node])
    )

    const hero = byCell.get('hero')
    const side = byCell.get('side')
    const body = byCell.get('body')

    expect(hero.left).toBeCloseTo(0, 4)
    expect(hero.top).toBeCloseTo(0, 4)
    expect(hero.width).toBeCloseTo(120, 4)
    expect(hero.height).toBeCloseTo(40, 4)

    expect(side.left).toBeCloseTo(0, 4)
    expect(side.top).toBeCloseTo(40, 4)
    expect(side.width).toBeCloseTo(40, 4)
    expect(side.height).toBeCloseTo(40, 4)

    expect(body.left).toBeCloseTo(40, 4)
    expect(body.top).toBeCloseTo(40, 4)
    expect(body.width).toBeCloseTo(80, 4)
    expect(body.height).toBeCloseTo(40, 4)

    expect(toImage(svg, 120)).toMatchImageSnapshot()
  })

  it('should support grid-area shorthand line placement', async () => {
    const nodes = []
    const svg = await satori(
      <div
        style={{
          width: 90,
          height: 90,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gridTemplateRows: '1fr 1fr 1fr',
          backgroundColor: '#ddd',
        }}
      >
        <div
          data-cell='a'
          style={{ gridArea: '1 / 1 / 3 / 3', backgroundColor: 'red' }}
        />
        <div
          data-cell='b'
          style={{ gridArea: '2 / 3 / 4 / 4', backgroundColor: 'blue' }}
        />
      </div>,
      {
        width: 90,
        height: 90,
        fonts,
        onNodeDetected: (node) => nodes.push(node),
      }
    )

    const cellNodes = nodes.filter((node) => node.props?.['data-cell'])
    const byCell = new Map(
      cellNodes.map((node) => [node.props['data-cell'], node])
    )

    const cellA = byCell.get('a')
    const cellB = byCell.get('b')

    expect(cellA.left).toBeCloseTo(0, 4)
    expect(cellA.top).toBeCloseTo(0, 4)
    expect(cellA.width).toBeCloseTo(60, 4)
    expect(cellA.height).toBeCloseTo(60, 4)

    expect(cellB.left).toBeCloseTo(60, 4)
    expect(cellB.top).toBeCloseTo(30, 4)
    expect(cellB.width).toBeCloseTo(30, 4)
    expect(cellB.height).toBeCloseTo(60, 4)

    expect(toImage(svg, 90)).toMatchImageSnapshot()
  })

  it('should support place-items and place-self alignment', async () => {
    const svg = await satori(
      <div
        style={{
          width: 120,
          height: 80,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr',
          placeItems: 'center',
          backgroundColor: '#ddd',
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            backgroundColor: 'red',
          }}
        />
        <div
          style={{
            width: 16,
            height: 16,
            placeSelf: 'end center',
            backgroundColor: 'blue',
          }}
        />
      </div>,
      { width: 120, height: 80, fonts }
    )

    expect(toImage(svg, 120)).toMatchImageSnapshot()
  })
})
