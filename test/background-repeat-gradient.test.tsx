import { describe, expect, it } from 'vitest'

import satori from '../src/index.js'
import { toImage } from './utils.js'

describe('background-repeat gradients', () => {
  it('should support background-repeat: round for linear gradients', async () => {
    const svg = await satori(
      <div
        style={{
          width: 120,
          height: 72,
          backgroundColor: 'white',
          backgroundImage: 'linear-gradient(90deg, red 0%, blue 100%)',
          backgroundSize: '37px 25px',
          backgroundRepeat: 'round',
        }}
      />,
      { width: 120, height: 72, fonts: [] }
    )

    expect(toImage(svg, 120)).toMatchImageSnapshot()
  })

  it('should support background-repeat: space for linear gradients', async () => {
    const svg = await satori(
      <div
        style={{
          width: 120,
          height: 72,
          backgroundColor: 'white',
          backgroundImage: 'linear-gradient(90deg, red 0%, blue 100%)',
          backgroundSize: '24px 18px',
          backgroundRepeat: 'space',
        }}
      />,
      { width: 120, height: 72, fonts: [] }
    )

    expect(toImage(svg, 120)).toMatchImageSnapshot()
  })

  it('should support mixed repeat values for radial gradients', async () => {
    const svg = await satori(
      <div
        style={{
          width: 120,
          height: 80,
          backgroundColor: 'white',
          backgroundImage:
            'radial-gradient(circle at 50% 50%, red 0%, rgba(255,0,0,0) 100%)',
          backgroundSize: '34px 22px',
          backgroundRepeat: 'round space',
        }}
      />,
      { width: 120, height: 80, fonts: [] }
    )

    expect(toImage(svg, 120)).toMatchImageSnapshot()
  })
})
