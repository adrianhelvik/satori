import { describe, expect, it } from 'vitest'

import satori from '../src/index.js'
import { initFonts, toImage } from './utils.js'

describe('Text Align Last', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should support text-align-last: center', async () => {
    const svg = await satori(
      <div
        style={{
          width: 140,
          height: 120,
          backgroundColor: 'white',
          fontSize: 16,
          textAlign: 'justify',
          textAlignLast: 'center',
        }}
      >
        Alpha beta gamma delta epsilon zeta eta theta iota kappa lambda.
      </div>,
      { width: 140, height: 120, fonts }
    )
    expect(toImage(svg, 140)).toMatchImageSnapshot()
  })

  it('should support text-align-last: justify', async () => {
    const svg = await satori(
      <div
        style={{
          width: 200,
          height: 120,
          display: 'flex',
          backgroundColor: 'white',
          gap: 4,
        }}
      >
        <div
          style={{
            width: 98,
            fontSize: 14,
            textAlign: 'justify',
            textAlignLast: 'start',
            backgroundColor: '#f5f5f5',
          }}
        >
          one two three four five six seven eight nine ten eleven twelve
        </div>
        <div
          style={{
            width: 98,
            fontSize: 14,
            textAlign: 'justify',
            textAlignLast: 'justify',
            backgroundColor: '#f5f5f5',
          }}
        >
          one two three four five six seven eight nine ten eleven twelve
        </div>
      </div>,
      { width: 200, height: 120, fonts }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })
})
