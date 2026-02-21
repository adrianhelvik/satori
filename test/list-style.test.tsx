import { describe, expect, it } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

const PIXEL_ART_2X2_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAGElEQVR4AQXBAQEAAAjDIG7/zhNE0k3CAz7tBf7utunjAAAAAElFTkSuQmCC'

describe('list-style', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should render default unordered list markers', async () => {
    const svg = await satori(
      <ul
        style={{
          width: 240,
          height: 140,
          backgroundColor: 'white',
          fontSize: 20,
          margin: 0,
        }}
      >
        <li>Alpha</li>
        <li>Beta</li>
        <li>Gamma</li>
      </ul>,
      { width: 240, height: 140, fonts }
    )

    expect(toImage(svg, 240)).toMatchImageSnapshot()
  })

  it('should support ordered list listStyleType values', async () => {
    const svg = await satori(
      <ol
        style={{
          width: 260,
          height: 160,
          backgroundColor: 'white',
          fontSize: 18,
          listStyleType: 'lower-alpha',
          margin: 0,
        }}
      >
        <li>First item</li>
        <li>Second item</li>
        <li>Third item</li>
      </ol>,
      { width: 260, height: 160, fonts }
    )

    expect(toImage(svg, 260)).toMatchImageSnapshot()
  })

  it('should support lower-hexadecimal listStyleType values', async () => {
    const nodes = []
    const svg = await satori(
      <ol
        style={{
          width: 260,
          height: 220,
          backgroundColor: 'white',
          fontSize: 18,
          listStyleType: 'lower-hexadecimal',
          paddingLeft: 40,
          margin: 0,
        }}
      >
        {Array.from({ length: 18 }, (_, i) => (
          <li key={i}>Hex marker text</li>
        ))}
      </ol>,
      {
        width: 260,
        height: 220,
        fonts,
        embedFont: false,
        onNodeDetected: (node) => nodes.push(node),
      }
    )

    const markerText = nodes
      .filter(
        (node) =>
          node.key === '__satori-list-marker' &&
          typeof node.textContent === 'string'
      )
      .map((node) => node.textContent)

    expect(markerText).toContain('a.')
    expect(markerText).toContain('10.')
    expect(markerText).toContain('12.')
    expect(toImage(svg, 260)).toMatchImageSnapshot()
  })

  it('should render markers for display:list-item elements', async () => {
    const nodes = []
    const svg = await satori(
      <div
        style={{
          width: 240,
          height: 140,
          backgroundColor: 'white',
          fontSize: 20,
          paddingLeft: 40,
        }}
      >
        <div style={{ display: 'list-item' }}>Alpha</div>
        <div style={{ display: 'list-item' }}>Beta</div>
        <div style={{ display: 'list-item' }}>Gamma</div>
      </div>,
      {
        width: 240,
        height: 140,
        fonts,
        embedFont: false,
        onNodeDetected: (node) => nodes.push(node),
      }
    )

    const markerText = nodes
      .filter(
        (node) =>
          node.key === '__satori-list-marker' &&
          typeof node.textContent === 'string'
      )
      .map((node) => node.textContent)

    expect(markerText).toEqual(['•', '•', '•'])
    expect(toImage(svg, 240)).toMatchImageSnapshot()
  })

  it('should support ordered display:list-item markers from parent listStyleType', async () => {
    const nodes = []
    const svg = await satori(
      <div
        style={{
          width: 260,
          height: 140,
          backgroundColor: 'white',
          fontSize: 18,
          listStyleType: 'decimal',
          paddingLeft: 40,
        }}
      >
        <div style={{ display: 'list-item' }}>First item</div>
        <div style={{ display: 'list-item' }}>Second item</div>
        <div style={{ display: 'list-item' }}>Third item</div>
      </div>,
      {
        width: 260,
        height: 140,
        fonts,
        embedFont: false,
        onNodeDetected: (node) => nodes.push(node),
      }
    )

    const markerText = nodes
      .filter(
        (node) =>
          node.key === '__satori-list-marker' &&
          typeof node.textContent === 'string'
      )
      .map((node) => node.textContent)

    expect(markerText).toEqual(['1.', '2.', '3.'])
    expect(toImage(svg, 260)).toMatchImageSnapshot()
  })

  it('should support lower-greek listStyleType', async () => {
    const nodes = []
    const svg = await satori(
      <ol
        style={{
          width: 260,
          height: 160,
          backgroundColor: 'white',
          fontSize: 18,
          listStyleType: 'lower-greek',
          margin: 0,
        }}
      >
        <li>First item</li>
        <li>Second item</li>
        <li>Third item</li>
      </ol>,
      {
        width: 260,
        height: 160,
        fonts,
        embedFont: false,
        onNodeDetected: (node) => nodes.push(node),
      }
    )

    const markerTextNodes = nodes.filter(
      (node) =>
        node.key === '__satori-list-marker' &&
        typeof node.textContent === 'string'
    )
    const markerText = markerTextNodes.map((node) => node.textContent)
    expect(markerText).toContain('α.')
    expect(markerText).toContain('β.')
    expect(markerText).toContain('γ.')
    expect(toImage(svg, 260)).toMatchImageSnapshot()
  })

  it('should support armenian and georgian listStyleType values', async () => {
    const nodes = []
    const svg = await satori(
      <div
        style={{
          width: 280,
          height: 180,
          display: 'flex',
          gap: 20,
          backgroundColor: 'white',
          fontSize: 18,
          margin: 0,
        }}
      >
        <ol style={{ margin: 0, listStyleType: 'armenian' }}>
          <li>First</li>
          <li>Second</li>
        </ol>
        <ol style={{ margin: 0, listStyleType: 'georgian' }}>
          <li>First</li>
          <li>Second</li>
        </ol>
      </div>,
      {
        width: 280,
        height: 180,
        fonts,
        embedFont: false,
        onNodeDetected: (node) => nodes.push(node),
      }
    )

    const markerText = nodes
      .filter(
        (node) =>
          node.key === '__satori-list-marker' &&
          typeof node.textContent === 'string'
      )
      .map((node) => node.textContent)
    expect(markerText).toContain('Ա.')
    expect(markerText).toContain('Բ.')
    expect(markerText).toContain('ა.')
    expect(markerText).toContain('ბ.')
    expect(toImage(svg, 280)).toMatchImageSnapshot()
  })

  it('should support hebrew listStyleType values', async () => {
    const nodes = []
    const svg = await satori(
      <ol
        style={{
          width: 280,
          height: 180,
          backgroundColor: 'white',
          fontSize: 18,
          listStyleType: 'hebrew' as any,
          counterReset: 'list-item 13',
          paddingLeft: 40,
          margin: 0,
        }}
      >
        <li>Hebrew marker text</li>
        <li>Hebrew marker text</li>
        <li>Hebrew marker text</li>
      </ol>,
      {
        width: 280,
        height: 180,
        fonts,
        onNodeDetected: (node) => nodes.push(node),
      }
    )

    const markerText = nodes
      .filter(
        (node) =>
          node.key === '__satori-list-marker' &&
          typeof node.textContent === 'string'
      )
      .map((node) => node.textContent)

    expect(markerText).toContain('יד.')
    expect(markerText).toContain('טו.')
    expect(markerText).toContain('טז.')
    expect(toImage(svg, 280)).toMatchImageSnapshot()
  })

  it('should support ethiopic-numeric listStyleType values', async () => {
    const nodes = []
    const svg = await satori(
      <ol
        style={{
          width: 320,
          height: 200,
          backgroundColor: 'white',
          fontSize: 20,
          listStyleType: 'ethiopic-numeric' as any,
          counterReset: 'list-item 9',
          paddingLeft: 40,
          margin: 0,
        }}
      >
        <li>Ethiopic marker text</li>
        <li>Ethiopic marker text</li>
        <li>Ethiopic marker text</li>
      </ol>,
      {
        width: 320,
        height: 200,
        fonts,
        onNodeDetected: (node) => nodes.push(node),
      }
    )

    const markerText = nodes
      .filter(
        (node) =>
          node.key === '__satori-list-marker' &&
          typeof node.textContent === 'string'
      )
      .map((node) => node.textContent)

    expect(markerText).toContain('፲/')
    expect(markerText).toContain('፲፩/')
    expect(markerText).toContain('፲፪/')
    expect(toImage(svg, 320)).toMatchImageSnapshot()
  })

  it('should support lower-cyrillic and upper-cyrillic listStyleType values', async () => {
    const nodes = []
    const svg = await satori(
      <div
        style={{
          width: 320,
          height: 180,
          display: 'flex',
          gap: 20,
          backgroundColor: 'white',
          fontSize: 18,
          margin: 0,
        }}
      >
        <ol style={{ margin: 0, listStyleType: 'lower-cyrillic' }}>
          <li>First</li>
          <li>Second</li>
        </ol>
        <ol style={{ margin: 0, listStyleType: 'upper-cyrillic' }}>
          <li>First</li>
          <li>Second</li>
        </ol>
      </div>,
      {
        width: 320,
        height: 180,
        fonts,
        embedFont: false,
        onNodeDetected: (node) => nodes.push(node),
      }
    )

    const markerText = nodes
      .filter(
        (node) =>
          node.key === '__satori-list-marker' &&
          typeof node.textContent === 'string'
      )
      .map((node) => node.textContent)
    expect(markerText).toContain('а.')
    expect(markerText).toContain('б.')
    expect(markerText).toContain('А.')
    expect(markerText).toContain('Б.')
    expect(toImage(svg, 320)).toMatchImageSnapshot()
  })

  it('should support hiragana and katakana listStyleType values', async () => {
    const nodes = []
    const svg = await satori(
      <div
        style={{
          width: 320,
          height: 180,
          display: 'flex',
          gap: 20,
          backgroundColor: 'white',
          fontSize: 18,
          margin: 0,
        }}
      >
        <ol style={{ margin: 0, listStyleType: 'hiragana' }}>
          <li>First</li>
          <li>Second</li>
        </ol>
        <ol style={{ margin: 0, listStyleType: 'katakana' }}>
          <li>First</li>
          <li>Second</li>
        </ol>
      </div>,
      {
        width: 320,
        height: 180,
        fonts,
        embedFont: false,
        onNodeDetected: (node) => nodes.push(node),
      }
    )

    const markerText = nodes
      .filter(
        (node) =>
          node.key === '__satori-list-marker' &&
          typeof node.textContent === 'string'
      )
      .map((node) => node.textContent)
    expect(markerText).toContain('あ.')
    expect(markerText).toContain('い.')
    expect(markerText).toContain('ア.')
    expect(markerText).toContain('イ.')
    expect(toImage(svg, 320)).toMatchImageSnapshot()
  })

  it('should support hiragana-iroha and katakana-iroha listStyleType values', async () => {
    const nodes = []
    const svg = await satori(
      <div
        style={{
          width: 360,
          height: 180,
          display: 'flex',
          gap: 20,
          backgroundColor: 'white',
          fontSize: 18,
          margin: 0,
        }}
      >
        <ol style={{ margin: 0, listStyleType: 'hiragana-iroha' as any }}>
          <li>First</li>
          <li>Second</li>
        </ol>
        <ol style={{ margin: 0, listStyleType: 'katakana-iroha' as any }}>
          <li>First</li>
          <li>Second</li>
        </ol>
      </div>,
      {
        width: 360,
        height: 180,
        fonts,
        embedFont: false,
        onNodeDetected: (node) => nodes.push(node),
      }
    )

    const markerText = nodes
      .filter(
        (node) =>
          node.key === '__satori-list-marker' &&
          typeof node.textContent === 'string'
      )
      .map((node) => node.textContent)
    expect(markerText).toContain('い.')
    expect(markerText).toContain('ろ.')
    expect(markerText).toContain('イ.')
    expect(markerText).toContain('ロ.')
    expect(toImage(svg, 360)).toMatchImageSnapshot()
  })

  it('should support norwegian and danish listStyleType values', async () => {
    const nodes = []
    const svg = await satori(
      <div
        style={{
          width: 320,
          height: 150,
          display: 'flex',
          gap: 20,
          backgroundColor: 'white',
          fontSize: 18,
          margin: 0,
        }}
      >
        <ol
          style={{
            margin: 0,
            listStyleType: 'lower-norwegian' as any,
            counterReset: 'list-item 26',
          }}
        >
          <li>item</li>
          <li>item</li>
          <li>item</li>
        </ol>
        <ol
          style={{
            margin: 0,
            listStyleType: 'upper-danish' as any,
            counterReset: 'list-item 26',
          }}
        >
          <li>item</li>
          <li>item</li>
          <li>item</li>
        </ol>
      </div>,
      {
        width: 320,
        height: 150,
        fonts,
        embedFont: false,
        onNodeDetected: (node) => nodes.push(node),
      }
    )

    const markerText = nodes
      .filter(
        (node) =>
          node.key === '__satori-list-marker' &&
          typeof node.textContent === 'string'
      )
      .map((node) => node.textContent)
    expect(markerText).toContain('æ.')
    expect(markerText).toContain('ø.')
    expect(markerText).toContain('å.')
    expect(markerText).toContain('Æ.')
    expect(markerText).toContain('Ø.')
    expect(markerText).toContain('Å.')
    expect(toImage(svg, 320)).toMatchImageSnapshot()
  })

  it('should support numeric script listStyleType values', async () => {
    const nodes = []
    const svg = await satori(
      <div
        style={{
          width: 340,
          height: 160,
          display: 'flex',
          gap: 20,
          backgroundColor: 'white',
          fontSize: 18,
          margin: 0,
        }}
      >
        <ol
          style={{
            margin: 0,
            listStyleType: 'arabic-indic' as any,
            counterReset: 'list-item 41',
          }}
        >
          <li>item</li>
          <li>item</li>
        </ol>
        <ol
          style={{
            margin: 0,
            listStyleType: 'devanagari' as any,
            counterReset: 'list-item 41',
          }}
        >
          <li>item</li>
          <li>item</li>
        </ol>
        <ol
          style={{
            margin: 0,
            listStyleType: 'persian' as any,
            counterReset: 'list-item 304',
          }}
        >
          <li>item</li>
        </ol>
      </div>,
      {
        width: 340,
        height: 160,
        fonts,
        onNodeDetected: (node) => nodes.push(node),
      }
    )

    const markerText = nodes
      .filter(
        (node) =>
          node.key === '__satori-list-marker' &&
          typeof node.textContent === 'string'
      )
      .map((node) => node.textContent)
    expect(markerText).toContain('٤٢.')
    expect(markerText).toContain('४२.')
    expect(markerText).toContain('۳۰۵.')
    expect(toImage(svg, 340)).toMatchImageSnapshot()
  })

  it('should support additional numeric script listStyleType values', async () => {
    const nodes = []
    await satori(
      <div
        style={{
          width: 420,
          height: 160,
          display: 'flex',
          gap: 20,
          backgroundColor: 'white',
          fontSize: 18,
          margin: 0,
        }}
      >
        <ol
          style={{
            margin: 0,
            listStyleType: 'cjk-decimal' as any,
            counterReset: 'list-item 18',
          }}
        >
          <li>item</li>
        </ol>
        <ol
          style={{
            margin: 0,
            listStyleType: 'mongolian' as any,
            counterReset: 'list-item 41',
          }}
        >
          <li>item</li>
        </ol>
        <ol
          style={{
            margin: 0,
            listStyleType: 'oriya' as any,
            counterReset: 'list-item 41',
          }}
        >
          <li>item</li>
        </ol>
        <ol
          style={{
            margin: 0,
            listStyleType: 'cambodian' as any,
            counterReset: 'list-item 304',
          }}
        >
          <li>item</li>
        </ol>
      </div>,
      {
        width: 420,
        height: 160,
        fonts,
        embedFont: false,
        onNodeDetected: (node) => nodes.push(node),
      }
    )

    const markerText = nodes
      .filter(
        (node) =>
          node.key === '__satori-list-marker' &&
          typeof node.textContent === 'string'
      )
      .map((node) => node.textContent)
    expect(markerText).toContain('一九、')
    expect(markerText).toContain('᠔᠒.')
    expect(markerText).toContain('୪୨.')
    expect(markerText).toContain('៣០៥.')
  })

  it('should size outside text markers using marker text metrics', async () => {
    const nodes = []
    await satori(
      <ol
        style={{
          width: 280,
          height: 220,
          backgroundColor: 'white',
          fontSize: 18,
          listStyleType: 'decimal',
          listStylePosition: 'outside',
          paddingLeft: 32,
          margin: 0,
        }}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <li key={i}>x</li>
        ))}
      </ol>,
      {
        width: 280,
        height: 220,
        fonts,
        onNodeDetected: (node) => {
          nodes.push(node)
        },
      }
    )

    const markerNodes = nodes.filter(
      (node) => node.key === '__satori-list-marker'
    )
    expect(markerNodes).toHaveLength(10)
    expect(markerNodes[9].width).toBeGreaterThan(markerNodes[8].width)
  })

  it('should keep outside markers out of normal content flow', async () => {
    const outsideNodes = []
    await satori(
      <ol
        style={{
          width: 280,
          height: 120,
          backgroundColor: 'white',
          fontSize: 18,
          listStyleType: 'decimal',
          listStylePosition: 'outside',
          paddingLeft: 40,
          margin: 0,
        }}
      >
        <li>Aligned marker text</li>
      </ol>,
      {
        width: 280,
        height: 120,
        fonts,
        onNodeDetected: (node) => outsideNodes.push(node),
      }
    )

    const markerNode = outsideNodes.find(
      (node) => node.key === '__satori-list-marker'
    )
    const contentNode = outsideNodes.find(
      (node) => node.key === '__satori-list-content'
    )

    expect(markerNode).toBeTruthy()
    expect(contentNode).toBeTruthy()
    if (!markerNode || !contentNode) {
      throw new Error('Expected marker and content nodes to be present.')
    }
    expect(markerNode.left).toBeLessThan(contentNode.left)
  })

  it('should indent inside markers by participating in content flow', async () => {
    const outsideNodes = []
    await satori(
      <ol
        style={{
          width: 280,
          height: 120,
          backgroundColor: 'white',
          fontSize: 18,
          listStyleType: 'decimal',
          listStylePosition: 'outside',
          paddingLeft: 40,
          margin: 0,
        }}
      >
        <li>Aligned marker text</li>
      </ol>,
      {
        width: 280,
        height: 120,
        fonts,
        onNodeDetected: (node) => outsideNodes.push(node),
      }
    )

    const insideNodes = []
    await satori(
      <ol
        style={{
          width: 280,
          height: 120,
          backgroundColor: 'white',
          fontSize: 18,
          listStyleType: 'decimal',
          listStylePosition: 'inside',
          paddingLeft: 40,
          margin: 0,
        }}
      >
        <li>Aligned marker text</li>
      </ol>,
      {
        width: 280,
        height: 120,
        fonts,
        onNodeDetected: (node) => insideNodes.push(node),
      }
    )

    const outsideContentNode = outsideNodes.find(
      (node) => node.key === '__satori-list-content'
    )
    const insideContentNode = insideNodes.find(
      (node) => node.key === '__satori-list-content'
    )

    expect(outsideContentNode).toBeTruthy()
    expect(insideContentNode).toBeTruthy()
    if (!outsideContentNode || !insideContentNode) {
      throw new Error(
        'Expected outside and inside content nodes to be present.'
      )
    }
    expect(insideContentNode.left).toBeGreaterThan(outsideContentNode.left)
  })

  it('should support list-style shorthand', async () => {
    const svg = await satori(
      <ul
        style={{
          width: 260,
          height: 160,
          backgroundColor: 'white',
          fontSize: 18,
          listStyle: 'square inside',
          margin: 0,
        }}
      >
        <li>One</li>
        <li>Two</li>
        <li>Three</li>
      </ul>,
      { width: 260, height: 160, fonts }
    )

    expect(toImage(svg, 260)).toMatchImageSnapshot()
  })

  it('should support list-style none', async () => {
    const svg = await satori(
      <ul
        style={{
          width: 220,
          height: 120,
          backgroundColor: 'white',
          fontSize: 18,
          listStyle: 'none',
          margin: 0,
        }}
      >
        <li>Alpha</li>
        <li>Beta</li>
      </ul>,
      { width: 220, height: 120, fonts, embedFont: false }
    )

    expect(svg).not.toContain('•')
    expect(svg).not.toContain('◦')
    expect(svg).not.toContain('▪')
    expect(toImage(svg, 220)).toMatchImageSnapshot()
  })

  it('should support list-style-image url markers', async () => {
    const svg = await satori(
      <ul
        style={{
          width: 240,
          height: 140,
          backgroundColor: 'white',
          fontSize: 18,
          listStyleImage: `url(${PIXEL_ART_2X2_PNG})`,
          margin: 0,
        }}
      >
        <li>Image marker one</li>
        <li>Image marker two</li>
      </ul>,
      { width: 240, height: 140, fonts }
    )

    expect(svg).toContain('data:image/png;base64')
    expect(toImage(svg, 240)).toMatchImageSnapshot()
  })

  it('should lay out list-style-image markers with non-zero size', async () => {
    const nodes = []
    await satori(
      <ul
        style={{
          width: 240,
          height: 140,
          backgroundColor: 'white',
          fontSize: 18,
          listStyleImage: `url(${PIXEL_ART_2X2_PNG})`,
          margin: 0,
        }}
      >
        <li>Image marker one</li>
        <li>Image marker two</li>
      </ul>,
      {
        width: 240,
        height: 140,
        fonts,
        onNodeDetected: (node) => nodes.push(node),
      }
    )

    const markerImageNodes = nodes.filter(
      (node) =>
        node.type === 'img' &&
        node.props?.src === PIXEL_ART_2X2_PNG &&
        node.width > 0 &&
        node.height > 0
    )

    expect(markerImageNodes.length).toBeGreaterThan(0)
  })

  it('should support quoted string listStyleType markers', async () => {
    const svg = await satori(
      <ul
        style={{
          width: 260,
          height: 140,
          backgroundColor: 'white',
          fontSize: 18,
          listStyleType: '"→"',
          margin: 0,
        }}
      >
        <li>Arrow marker one</li>
        <li>Arrow marker two</li>
      </ul>,
      { width: 260, height: 140, fonts, embedFont: false }
    )

    expect(svg).toContain('→')
    expect(toImage(svg, 260)).toMatchImageSnapshot()
  })

  it('should support quoted string markers in list-style shorthand', async () => {
    const svg = await satori(
      <ul
        style={{
          width: 260,
          height: 140,
          backgroundColor: 'white',
          fontSize: 18,
          listStyle: '"※" inside',
          margin: 0,
        }}
      >
        <li>Inside marker one</li>
        <li>Inside marker two</li>
      </ul>,
      { width: 260, height: 140, fonts, embedFont: false }
    )

    expect(svg).toContain('※')
    expect(toImage(svg, 260)).toMatchImageSnapshot()
  })

  it('should support disclosure listStyleType values', async () => {
    const svg = await satori(
      <div
        style={{
          width: 280,
          height: 140,
          display: 'flex',
          gap: 20,
          backgroundColor: 'white',
          fontSize: 18,
          margin: 0,
        }}
      >
        <ul style={{ margin: 0, listStyleType: 'disclosure-open' }}>
          <li>Open item</li>
        </ul>
        <ul style={{ margin: 0, listStyleType: 'disclosure-closed' }}>
          <li>Closed item</li>
        </ul>
      </div>,
      { width: 280, height: 140, fonts, embedFont: false }
    )

    expect(svg).toContain('▾')
    expect(svg).toContain('▸')
    expect(toImage(svg, 280)).toMatchImageSnapshot()
  })

  describe('counter properties', () => {
    it('should support counter-reset for ordered list markers', async () => {
      const nodes = []
      const svg = await satori(
        <ol
          style={{
            width: 260,
            height: 160,
            backgroundColor: 'white',
            fontSize: 18,
            margin: 0,
            counterReset: 'list-item 3',
          }}
        >
          <li>First</li>
          <li>Second</li>
          <li>Third</li>
        </ol>,
        {
          width: 260,
          height: 160,
          fonts,
          onNodeDetected: (node) => nodes.push(node),
        }
      )

      const markerText = nodes
        .filter(
          (node) =>
            node.key === '__satori-list-marker' &&
            typeof node.textContent === 'string'
        )
        .map((node) => node.textContent)

      expect(markerText).toEqual(['4.', '5.', '6.'])
      expect(toImage(svg, 260)).toMatchImageSnapshot()
    })

    it('should apply counter-reset for ordered markers on ul', async () => {
      const nodes = []
      const svg = await satori(
        <ul
          style={{
            width: 260,
            height: 140,
            backgroundColor: 'white',
            fontSize: 18,
            listStyleType: 'decimal',
            counterReset: 'list-item 4',
            paddingLeft: 40,
            margin: 0,
          }}
        >
          <li>First item</li>
          <li>Second item</li>
          <li>Third item</li>
        </ul>,
        {
          width: 260,
          height: 140,
          fonts,
          embedFont: false,
          onNodeDetected: (node) => nodes.push(node),
        }
      )

      const markerText = nodes
        .filter(
          (node) =>
            node.key === '__satori-list-marker' &&
            typeof node.textContent === 'string'
        )
        .map((node) => node.textContent)

      expect(markerText).toEqual(['5.', '6.', '7.'])
      expect(toImage(svg, 260)).toMatchImageSnapshot()
    })

    it('should support counter-increment list-item overrides', async () => {
      const nodes = []
      await satori(
        <ol
          style={{
            width: 260,
            height: 160,
            backgroundColor: 'white',
            fontSize: 18,
            margin: 0,
            counterReset: 'list-item 0',
          }}
        >
          <li style={{ counterIncrement: 'list-item 2' }}>First</li>
          <li style={{ counterIncrement: 'list-item 2' }}>Second</li>
          <li style={{ counterIncrement: 'none' }}>Third</li>
        </ol>,
        {
          width: 260,
          height: 160,
          fonts,
          onNodeDetected: (node) => nodes.push(node),
        }
      )

      const markerText = nodes
        .filter(
          (node) =>
            node.key === '__satori-list-marker' &&
            typeof node.textContent === 'string'
        )
        .map((node) => node.textContent)

      expect(markerText).toEqual(['2.', '4.', '4.'])
    })

    it('should support counter-set for ordered list markers', async () => {
      const nodes = []
      await satori(
        <ol
          style={{
            width: 260,
            height: 160,
            backgroundColor: 'white',
            fontSize: 18,
            margin: 0,
            counterReset: 'list-item 0',
          }}
        >
          <li style={{ counterSet: 'list-item 7', counterIncrement: 'none' }}>
            First
          </li>
          <li>Second</li>
        </ol>,
        {
          width: 260,
          height: 160,
          fonts,
          onNodeDetected: (node) => nodes.push(node),
        }
      )

      const markerText = nodes
        .filter(
          (node) =>
            node.key === '__satori-list-marker' &&
            typeof node.textContent === 'string'
        )
        .map((node) => node.textContent)

      expect(markerText).toEqual(['7.', '8.'])
    })
  })
})
