import { describe, expect, it } from 'vitest'

import satori from '../src/index.js'
import { initFonts, toImage } from './utils.js'

describe('line-break', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should support line-break:anywhere by allowing word breaks like break-all', async () => {
    const withLineBreakAnywhere = await satori(
      <div
        style={{
          width: 80,
          height: 100,
          backgroundColor: '#eee',
          lineBreak: 'anywhere',
        }}
      >
        cooperate
      </div>,
      { width: 80, height: 100, fonts }
    )

    const withWordBreak = await satori(
      <div
        style={{
          width: 80,
          height: 100,
          backgroundColor: '#eee',
          wordBreak: 'break-all',
        }}
      >
        cooperate
      </div>,
      { width: 80, height: 100, fonts }
    )

    expect(toImage(withLineBreakAnywhere, 80)).toEqual(
      toImage(withWordBreak, 80)
    )
  })

  it('should keep normal behavior for line-break:normal', async () => {
    const withLineBreakNormal = await satori(
      <div
        style={{
          width: 80,
          height: 100,
          backgroundColor: '#eee',
          lineBreak: 'normal',
        }}
      >
        cooperate
      </div>,
      { width: 80, height: 100, fonts }
    )

    const base = await satori(
      <div style={{ width: 80, height: 100, backgroundColor: '#eee' }}>
        cooperate
      </div>,
      { width: 80, height: 100, fonts }
    )

    expect(toImage(withLineBreakNormal, 80)).toEqual(toImage(base, 80))
  })

  it('should accept line-break strict and loose values', async () => {
    const strict = await satori(
      <div
        style={{
          width: 120,
          height: 100,
          backgroundColor: '#eee',
          lineBreak: 'strict',
        }}
      >
        Alpha beta gamma.
      </div>,
      { width: 120, height: 100, fonts }
    )

    const loose = await satori(
      <div
        style={{
          width: 120,
          height: 100,
          backgroundColor: '#eee',
          lineBreak: 'loose',
        }}
      >
        Alpha beta gamma.
      </div>,
      { width: 120, height: 100, fonts }
    )

    expect(toImage(strict, 120)).toMatchImageSnapshot()
    expect(toImage(loose, 120)).toMatchImageSnapshot()
  })
})
