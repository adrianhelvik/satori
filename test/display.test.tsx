import { it, describe, expect } from 'vitest'

import { toImage } from './utils.js'
import satori from '../src/index.js'

describe('display', () => {
  it('should support display: contents', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          gap: 10,
          backgroundColor: '#e2e2e2',
        }}
      >
        <div
          style={{
            display: 'contents',
          }}
        >
          <div
            style={{
              height: 10,
              width: 10,
              backgroundColor: 'black',
            }}
          />
          <div
            style={{
              height: 10,
              width: 10,
              backgroundColor: 'black',
            }}
          />
        </div>
      </div>,
      { width: 100, height: 100, fonts: [] }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support display: inline-flex', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'inline-flex',
          height: 100,
          width: 100,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'white',
        }}
      >
        <div style={{ width: 30, height: 30, backgroundColor: 'red' }} />
      </div>,
      { width: 100, height: 100, fonts: [] }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support display: inline-block', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'inline-block',
          height: 100,
          width: 100,
          backgroundColor: 'white',
          padding: 10,
        }}
      >
        <div style={{ width: 30, height: 30, backgroundColor: 'blue' }} />
      </div>,
      { width: 100, height: 100, fonts: [] }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
})
