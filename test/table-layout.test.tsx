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

  it('should treat rowSpan="0" as spanning the remaining table rows', async () => {
    const nodes = []

    await satori(
      <table
        style={{
          display: 'table',
          width: 120,
          height: 80,
          borderSpacing: 0,
          borderCollapse: 'collapse',
        }}
      >
        <tr>
          <td data-cell='a' rowSpan={0} />
          <td data-cell='b' />
        </tr>
        <tr>
          <td data-cell='c' />
        </tr>
      </table>,
      {
        width: 120,
        height: 80,
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

    expect(cellA.left).toBeCloseTo(0, 4)
    expect(cellA.top).toBeCloseTo(0, 4)
    expect(cellA.width).toBeCloseTo(60, 4)
    expect(cellA.height).toBeCloseTo(80, 4)

    expect(cellB.left).toBeCloseTo(60, 4)
    expect(cellB.top).toBeCloseTo(0, 4)
    expect(cellB.width).toBeCloseTo(60, 4)
    expect(cellB.height).toBeCloseTo(40, 4)

    expect(cellC.left).toBeCloseTo(60, 4)
    expect(cellC.top).toBeCloseTo(40, 4)
    expect(cellC.width).toBeCloseTo(60, 4)
    expect(cellC.height).toBeCloseTo(40, 4)
  })

  it('should treat colSpan="0" as spanning to the end of the row', async () => {
    const nodes = []

    await satori(
      <table
        style={{
          display: 'table',
          width: 120,
          height: 80,
          borderSpacing: 0,
          borderCollapse: 'collapse',
        }}
      >
        <tr>
          <td data-cell='a' colSpan={0} />
        </tr>
        <tr>
          <td data-cell='b' />
          <td data-cell='c' />
        </tr>
      </table>,
      {
        width: 120,
        height: 80,
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

    expect(cellA.left).toBeCloseTo(0, 4)
    expect(cellA.top).toBeCloseTo(0, 4)
    expect(cellA.width).toBeCloseTo(120, 4)
    expect(cellA.height).toBeCloseTo(40, 4)

    expect(cellB.left).toBeCloseTo(0, 4)
    expect(cellB.top).toBeCloseTo(40, 4)
    expect(cellB.width).toBeCloseTo(60, 4)
    expect(cellB.height).toBeCloseTo(40, 4)

    expect(cellC.left).toBeCloseTo(60, 4)
    expect(cellC.top).toBeCloseTo(40, 4)
    expect(cellC.width).toBeCloseTo(60, 4)
    expect(cellC.height).toBeCloseTo(40, 4)
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

  it('should infer default table geometry from explicit cell dimensions', async () => {
    const nodes = []

    await satori(
      <table
        style={{
          display: 'table',
          borderSpacing: 0,
          borderCollapse: 'collapse',
        }}
      >
        <tr>
          <td
            data-cell='a'
            style={{
              width: 80,
              height: 30,
              background: '#ff8080',
            }}
          />
          <td
            data-cell='b'
            style={{
              width: 40,
              background: '#80ff80',
            }}
          />
        </tr>
      </table>,
      {
        width: 160,
        height: 80,
        fonts,
        onNodeDetected: (node) => nodes.push(node),
      }
    )

    const cellNodes = nodes.filter((node) => node.props?.['data-cell'])
    const byId = new Map(
      cellNodes.map((node) => [node.props['data-cell'], node])
    )
    const tableNode = nodes.find(
      (node) => node.type === 'div' && !node.props?.['data-cell']
    )
    const cellA = byId.get('a')
    const cellB = byId.get('b')

    expect(tableNode?.width).toBeCloseTo(120, 4)
    expect(tableNode?.height).toBeCloseTo(30, 4)
    expect(cellA?.left).toBeCloseTo(0, 4)
    expect(cellA?.top).toBeCloseTo(0, 4)
    expect(cellA?.width).toBeCloseTo(80, 4)
    expect(cellA?.height).toBeCloseTo(30, 4)
    expect(cellB?.left).toBeCloseTo(80, 4)
    expect(cellB?.top).toBeCloseTo(0, 4)
    expect(cellB?.width).toBeCloseTo(40, 4)
    expect(cellB?.height).toBeCloseTo(30, 4)
  })

  it('should infer table geometry from <col> and <colgroup> sizing', async () => {
    const nodes = []

    await satori(
      <table
        style={{
          display: 'table',
          borderSpacing: 0,
          borderCollapse: 'collapse',
        }}
      >
        <colgroup>
          <col span={1} style={{ width: 50 }} />
          <col style={{ width: 70 }} />
          <col span={2} style={{ width: 30 }} />
        </colgroup>
        <tr>
          <td data-cell='a' />
          <td data-cell='b' />
          <td data-cell='c' />
          <td data-cell='d' />
        </tr>
      </table>,
      {
        width: 220,
        height: 50,
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
    const tableNode = nodes.find(
      (node) => node.type === 'div' && !node.props?.['data-cell']
    )

    expect(tableNode?.width).toBeCloseTo(180, 4)
    expect(cellA?.left).toBeCloseTo(0, 4)
    expect(cellA?.width).toBeCloseTo(50, 4)
    expect(cellB?.left).toBeCloseTo(50, 4)
    expect(cellB?.width).toBeCloseTo(70, 4)
    expect(cellC?.left).toBeCloseTo(120, 4)
    expect(cellC?.width).toBeCloseTo(30, 4)
    expect(cellD?.left).toBeCloseTo(150, 4)
    expect(cellD?.width).toBeCloseTo(30, 4)
  })
})
