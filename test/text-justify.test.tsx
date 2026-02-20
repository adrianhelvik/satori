import { describe, expect, it } from 'vitest'

import satori from '../src/index.js'
import { initFonts, toImage } from './utils.js'

describe('text-justify', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should support text-justify: none', async () => {
    const content =
      'one two three four five six seven eight nine ten eleven twelve'

    const svg = await satori(
      <div
        style={{
          width: 220,
          height: 140,
          display: 'flex',
          gap: 8,
          backgroundColor: '#fff',
          fontSize: 14,
        }}
      >
        <div
          style={
            {
              width: 106,
              textAlign: 'justify',
              textJustify: 'none',
              backgroundColor: '#f5f5f5',
            } as any
          }
        >
          {content}
        </div>
        <div
          style={{
            width: 106,
            textAlign: 'left',
            backgroundColor: '#f5f5f5',
          }}
        >
          {content}
        </div>
      </div>,
      { width: 220, height: 140, fonts }
    )

    expect(toImage(svg, 220)).toMatchImageSnapshot()
  })

  it('should support text-justify: inter-character', async () => {
    const content =
      'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda'

    const svg = await satori(
      <div
        style={{
          width: 220,
          height: 140,
          display: 'flex',
          gap: 8,
          backgroundColor: '#fff',
          fontSize: 14,
        }}
      >
        <div
          style={
            {
              width: 106,
              textAlign: 'justify',
              textJustify: 'inter-word',
              wordBreak: 'break-all',
              backgroundColor: '#f5f5f5',
            } as any
          }
        >
          {content}
        </div>
        <div
          style={
            {
              width: 106,
              textAlign: 'justify',
              textJustify: 'inter-character',
              wordBreak: 'break-all',
              backgroundColor: '#f5f5f5',
            } as any
          }
        >
          {content}
        </div>
      </div>,
      { width: 220, height: 140, fonts }
    )

    expect(toImage(svg, 220)).toMatchImageSnapshot()
  })
})
