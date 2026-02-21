import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Logical Properties', () => {
  let fonts
  initFonts((f) => (fonts = f))

  describe('margin-inline / margin-block', () => {
    it('should support margin-inline', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            width: 100,
            height: 100,
            backgroundColor: 'white',
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              backgroundColor: 'red',
              marginInline: 10,
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support margin-block', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            width: 100,
            height: 100,
            backgroundColor: 'white',
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              backgroundColor: 'blue',
              marginBlock: 15,
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support margin-inline-start and margin-inline-end', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            width: 100,
            height: 100,
            backgroundColor: 'white',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              backgroundColor: 'green',
              marginInlineStart: 5,
              marginInlineEnd: 20,
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support margin-block-start and margin-block-end', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            width: 100,
            height: 100,
            backgroundColor: 'white',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              backgroundColor: 'orange',
              marginBlockStart: 10,
              marginBlockEnd: 5,
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support two-value margin-inline syntax', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            width: 100,
            height: 100,
            backgroundColor: 'white',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              backgroundColor: 'purple',
              marginInline: '5px 20px',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('padding-inline / padding-block', () => {
    it('should support padding-inline', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            width: 100,
            height: 100,
            backgroundColor: 'red',
            paddingInline: 20,
          }}
        >
          <div
            style={{ width: '100%', height: 50, backgroundColor: 'white' }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support padding-block', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            width: 100,
            height: 100,
            backgroundColor: 'blue',
            paddingBlock: 15,
          }}
        >
          <div
            style={{ width: 50, height: '100%', backgroundColor: 'white' }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support padding-inline-start and padding-inline-end', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            width: 100,
            height: 100,
            backgroundColor: 'green',
            paddingInlineStart: 30,
            paddingInlineEnd: 10,
          }}
        >
          <div
            style={{ width: '100%', height: 50, backgroundColor: 'white' }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('logical sizing', () => {
    it('should support inline-size as width', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            width: 100,
            height: 100,
            backgroundColor: 'white',
          }}
        >
          <div
            style={{
              inlineSize: 60,
              height: 40,
              backgroundColor: 'red',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support block-size as height', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            width: 100,
            height: 100,
            backgroundColor: 'white',
          }}
        >
          <div
            style={{
              width: 40,
              blockSize: 70,
              backgroundColor: 'blue',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support min/max inline-size and block-size', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            width: 100,
            height: 100,
            backgroundColor: 'white',
          }}
        >
          <div
            style={{
              minInlineSize: 60,
              maxBlockSize: 30,
              width: 20,
              height: 80,
              backgroundColor: 'green',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('logical inset', () => {
    it('should support inset shorthand', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            width: 100,
            height: 100,
            backgroundColor: 'white',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 10,
              backgroundColor: 'red',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support inset with multiple values', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            width: 100,
            height: 100,
            backgroundColor: 'white',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: '5px 10px 15px 20px',
              backgroundColor: 'blue',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support inset-inline and inset-block', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            width: 100,
            height: 100,
            backgroundColor: 'white',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              insetInline: 10,
              insetBlock: 20,
              backgroundColor: 'green',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('logical border', () => {
    it('should support border-inline', async () => {
      const svg = await satori(
        <div
          style={{
            width: 80,
            height: 80,
            borderInline: '3px solid red',
            backgroundColor: 'white',
          }}
        />,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support border-block', async () => {
      const svg = await satori(
        <div
          style={{
            width: 80,
            height: 80,
            borderBlock: '3px solid blue',
            backgroundColor: 'white',
          }}
        />,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support border-inline-start and border-inline-end', async () => {
      const svg = await satori(
        <div
          style={{
            width: 80,
            height: 80,
            borderInlineStart: '5px solid red',
            borderInlineEnd: '2px solid blue',
            backgroundColor: 'white',
          }}
        />,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support logical border sub-properties', async () => {
      const svg = await satori(
        <div
          style={{
            width: 80,
            height: 80,
            borderInlineWidth: '3px',
            borderInlineStyle: 'solid',
            borderInlineColor: 'green',
            borderBlockWidth: '1px',
            borderBlockStyle: 'dashed',
            borderBlockColor: 'orange',
            backgroundColor: 'white',
          }}
        />,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support logical border radius', async () => {
      const svg = await satori(
        <div
          style={{
            width: 80,
            height: 80,
            borderStartStartRadius: 20,
            borderEndEndRadius: 20,
            backgroundColor: 'red',
          }}
        />,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('logical overflow', () => {
    it('should map overflow-inline to overflow-x', async () => {
      const base = await satori(
        <div
          style={{
            width: 120,
            height: 120,
            backgroundColor: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              overflowX: 'hidden',
              overflowY: 'visible',
              backgroundColor: '#ddd',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: 100,
                height: 100,
                backgroundColor: 'red',
              }}
            />
          </div>
        </div>,
        { width: 120, height: 120, fonts }
      )

      const logical = await satori(
        <div
          style={{
            width: 120,
            height: 120,
            backgroundColor: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              overflowInline: 'hidden',
              overflowBlock: 'visible',
              backgroundColor: '#ddd',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: 100,
                height: 100,
                backgroundColor: 'red',
              }}
            />
          </div>
        </div>,
        { width: 120, height: 120, fonts }
      )

      expect(toImage(logical, 120)).toEqual(toImage(base, 120))
    })

    it('should map overflow-block to overflow-y', async () => {
      const base = await satori(
        <div
          style={{
            width: 120,
            height: 120,
            backgroundColor: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              overflowX: 'visible',
              overflowY: 'hidden',
              backgroundColor: '#ddd',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: 100,
                height: 100,
                backgroundColor: 'blue',
              }}
            />
          </div>
        </div>,
        { width: 120, height: 120, fonts }
      )

      const logical = await satori(
        <div
          style={{
            width: 120,
            height: 120,
            backgroundColor: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              overflowInline: 'visible',
              overflowBlock: 'hidden',
              backgroundColor: '#ddd',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: 100,
                height: 100,
                backgroundColor: 'blue',
              }}
            />
          </div>
        </div>,
        { width: 120, height: 120, fonts }
      )

      expect(toImage(logical, 120)).toEqual(toImage(base, 120))
    })
  })
})
