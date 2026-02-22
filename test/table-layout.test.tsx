import { describe, expect, it } from 'vitest'

import satori from '../src/index.js'
import { initFonts, toImage } from './utils.js'

describe('Table Layout', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should resolve rowSpan and colSpan into stable cell geometry', async () => {
    const nodes = []

    await satori(
      <table
        style={{
          display: 'table',
          width: 120,
          height: 90,
          borderSpacing: 0,
          borderCollapse: 'collapse',
        }}
      >
        <tr>
          <td data-cell='a' rowSpan={2} colSpan={2} />
          <td data-cell='b' />
        </tr>
        <tr>
          <td data-cell='c' />
        </tr>
        <tr>
          <td data-cell='d' colSpan={3} />
        </tr>
      </table>,
      {
        width: 120,
        height: 90,
        fonts,
        onNodeDetected: (node) => nodes.push(node),
      }
    )

    const cellNodes = nodes.filter((node) => node.props?.['data-cell'])
    const byId = new Map(
      cellNodes.map((node) => [node.props['data-cell'], node])
    )

    const cellA = byId.get('a')
    const cellB = byId.get('b')
    const cellC = byId.get('c')
    const cellD = byId.get('d')

    expect(cellA.left).toBeCloseTo(0, 4)
    expect(cellA.top).toBeCloseTo(0, 4)
    expect(cellA.width).toBeCloseTo(80, 4)
    expect(cellA.height).toBeCloseTo(60, 4)

    expect(cellB.left).toBeCloseTo(80, 4)
    expect(cellB.top).toBeCloseTo(0, 4)
    expect(cellB.width).toBeCloseTo(40, 4)
    expect(cellB.height).toBeCloseTo(30, 4)

    expect(cellC.left).toBeCloseTo(80, 4)
    expect(cellC.top).toBeCloseTo(30, 4)
    expect(cellC.width).toBeCloseTo(40, 4)
    expect(cellC.height).toBeCloseTo(30, 4)

    expect(cellD.left).toBeCloseTo(0, 4)
    expect(cellD.top).toBeCloseTo(60, 4)
    expect(cellD.width).toBeCloseTo(120, 4)
    expect(cellD.height).toBeCloseTo(30, 4)
  })

  it('should render mixed rowSpan and colSpan cells', async () => {
    const svg = await satori(
      <table
        style={{
          display: 'table',
          width: 150,
          height: 90,
          border: '2px solid black',
          background: '#eee',
          borderSpacing: 0,
          borderCollapse: 'collapse',
        }}
      >
        <tbody>
          <tr>
            <td
              colSpan={2}
              style={{
                background: '#ff8080',
                border: '2px solid #c00',
                padding: 0,
              }}
            />
            <td
              rowSpan={2}
              style={{
                background: '#80ff80',
                border: '2px solid #0a0',
                padding: 0,
              }}
            />
          </tr>
          <tr>
            <td
              style={{
                background: '#8080ff',
                border: '2px solid #00c',
                padding: 0,
              }}
            />
            <td
              style={{
                background: '#ffff80',
                border: '2px solid #cc0',
                padding: 0,
              }}
            />
          </tr>
          <tr>
            <td
              colSpan={3}
              style={{
                background: '#ff80ff',
                border: '2px solid #c0c',
                padding: 0,
              }}
            />
          </tr>
        </tbody>
      </table>,
      { width: 170, height: 110, fonts }
    )

    expect(toImage(svg, 170)).toMatchImageSnapshot()
  })

  it('should render text, background, and borders per spanned cell', async () => {
    const svg = await satori(
      <table
        style={{
          display: 'table',
          width: 180,
          height: 120,
          background: '#f3f3f3',
          color: '#111',
          fontSize: 16,
          borderSpacing: 0,
          borderCollapse: 'collapse',
        }}
      >
        <thead>
          <tr>
            <th
              colSpan={3}
              style={{
                background: '#222',
                color: '#fff',
                border: '2px solid #111',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              HEADER
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td
              rowSpan={2}
              style={{
                background: '#ffd8d8',
                border: '2px solid #d33',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              A
            </td>
            <td
              style={{
                background: '#d8ffd8',
                border: '2px solid #3a3',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              B
            </td>
            <td
              style={{
                background: '#d8d8ff',
                border: '2px solid #33a',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              C
            </td>
          </tr>
          <tr>
            <td
              colSpan={2}
              style={{
                background: '#fff2c8',
                border: '2px solid #aa7',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              D span
            </td>
          </tr>
        </tbody>
      </table>,
      { width: 200, height: 130, fonts }
    )

    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })
})
