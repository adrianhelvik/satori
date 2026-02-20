import { describe, expect, it } from 'vitest'

import satori from '../src/index.js'
import { initFonts, toImage } from './utils.js'

describe('Text Wrap Subproperties', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should support white-space-collapse: preserve-breaks', async () => {
    const svg = await satori(
      <div
        style={{
          width: 220,
          height: 120,
          display: 'flex',
          backgroundColor: 'white',
          gap: 8,
          fontSize: 14,
        }}
      >
        <div
          style={{
            width: 106,
            whiteSpaceCollapse: 'preserve-breaks',
            backgroundColor: '#f5f5f5',
          }}
        >
          {'line  one\nline   two'}
        </div>
        <div
          style={{
            width: 106,
            whiteSpace: 'pre-line',
            backgroundColor: '#f5f5f5',
          }}
        >
          {'line  one\nline   two'}
        </div>
      </div>,
      { width: 220, height: 120, fonts }
    )
    expect(toImage(svg, 220)).toMatchImageSnapshot()
  })

  it('should support text-wrap-mode: nowrap', async () => {
    const svg = await satori(
      <div
        style={{
          width: 220,
          height: 120,
          display: 'flex',
          backgroundColor: 'white',
          gap: 8,
          fontSize: 14,
        }}
      >
        <div
          style={{
            width: 106,
            textWrapMode: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            backgroundColor: '#f5f5f5',
          }}
        >
          this line should not wrap and should be ellipsized
        </div>
        <div
          style={{
            width: 106,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            backgroundColor: '#f5f5f5',
          }}
        >
          this line should not wrap and should be ellipsized
        </div>
      </div>,
      { width: 220, height: 120, fonts }
    )
    expect(toImage(svg, 220)).toMatchImageSnapshot()
  })

  it('should support text-wrap-style: balance', async () => {
    const svg = await satori(
      <div
        style={{
          width: 220,
          height: 120,
          display: 'flex',
          backgroundColor: 'white',
          gap: 8,
          fontSize: 14,
        }}
      >
        <div
          style={{
            width: 106,
            textWrapStyle: 'balance',
            backgroundColor: '#f5f5f5',
          }}
        >
          balance wrapping can spread words more evenly across lines
        </div>
        <div
          style={{
            width: 106,
            textWrap: 'balance',
            backgroundColor: '#f5f5f5',
          }}
        >
          balance wrapping can spread words more evenly across lines
        </div>
      </div>,
      { width: 220, height: 120, fonts }
    )
    expect(toImage(svg, 220)).toMatchImageSnapshot()
  })
})
