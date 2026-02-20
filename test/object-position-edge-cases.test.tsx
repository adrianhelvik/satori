import { describe, expect, it } from 'vitest'

import satori from '../src/index.js'
import { initFonts, toImage } from './utils.js'

const PNG_SAMPLE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAPCAYAAADkmO9VAAAAAXNSR0IArs4c6QAAAIRlWElmTU0AKgAAAAgABQESAAMAAAABAAEAAAEaAAUAAAABAAAASgEbAAUAAAABAAAAUgEoAAMAAAABAAIAAIdpAAQAAAABAAAAWgAAAAAAAABIAAAAAQAAAEgAAAABAAOgAQADAAAAAQABAACgAgAEAAAAAQAAABSgAwAEAAAAAQAAAA8AAAAAVtc7bQAAAAlwSFlzAAALEwAACxMBAJqcGAAAAVlpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDYuMC4wIj4KICAgPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICAgICAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgICAgICAgICAgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iPgogICAgICAgICA8dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk9yaWVudGF0aW9uPgogICAgICA8L3JkZjpEZXNjcmlwdGlvbi4KICAgPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KGV7hBwAAA1FJREFUOBGNVFtME0EUnd3S3T5paamRxidoihRKRVGJkaDBRCFNiMkSP9QPiaHhgwRREwOGEUn8MfERIDEqMfxZEtEoSviQGh8Qg4YagQCipVIepdoWSh+03XFndRXkx/uxc+fOPWfO3nt3AfhtDGMTCf6VK3PFFRVTDADdGhyDEJEAAUI4z+7Mzmj1t6bwewhIIY5XPgkDICRYAMZ1Vmv0FkEsH5qcFKFd+bKRDwPUsa6uzT4BVNVZBbVJ2lMBScDPqtm65vzm54yNEXWUdyRwDomVYbL2doe8uDjYtrgYOUpRsUggEBxXK1H+lg3B8wJZU0/jHcmyuNr9w+1eCCxok8PJLYo3inWYDCLIKyWNRoZXOTNDq0pLqWyzWbQ8MoJCuSZasRQKB1sGiQMC4SxayhPLVN5t8gxkSM0MO/1OWU2ixorP096n8SUT2e2XWQh7k+rr8wNFRWc3arTKYplE5I2RbIKmpSrLd7enrdqkrdxXWJE25VJ7iFCi3nPDr/MpKXdoVu4MOV+7Ol1vg/og6bQ72aRftxdx9QMAoXVXFZJAYXqmcmfUuTRVKLIvyPI+b/X9kDbNP3o4p99fAooIMnpAv0cnl6fQYNF9/dXJ/msYa2+wJwD83RQcEBozYJtQDWnTDQpYW5aG2svD2oJw8nYDq8zNFROaFBkxMhrv9tTerj5+ugfktTkwlp8Agnty9mcU8IYfD0jgi9g+E7BE9lW1RmLRWb3ZpCRpWuy1Wucle3anqvzr67LGnj6wMUaq3DgU5wD8G2KOVTOEu81AyJeBlJSMijXJy7RCop1ou6Yaugv18aZGg+7chYxwWWYOBhuZBk7FXzIc48HYESwLwhinnSDePRsbLC3oi8/4LEvmg4Th8BFSGYvHfP39A/Hxb/dwvmd4+I8yAb9KIQ5yNUAdkBFj//smx2N2BxtGEf/o/KcXX6YTL6Pegvt1e590fB2yQeoghHGct9LWEPKHDQw/9VSuaWw6RwkWLXrNZA6d5NJRKlnGJV6VR7f6VQXSVU0RgnhF3LdLcJ173nXmYiyhPhGNBlxikdQx9/FmYyUEIeF8Jea//d7eMrXNBqQCAJMJ/r/rmqasTEAIcUCCk/rIj+OQ/7NAbg/XNEPA/QQBqVjfA25FYgAAAABJRU5ErkJggg=='

describe('Object Position Edge Cases', () => {
  let fonts
  initFonts((f) => (fonts = f))

  function extractImageXY(svg: string): { x: number; y: number } {
    const match = svg.match(/<image[^>]*x="([^"]+)"[^>]*y="([^"]+)"/)
    if (!match) {
      throw new Error('Expected SVG output to contain an <image> element.')
    }
    return { x: Number(match[1]), y: Number(match[2]) }
  }

  async function render(position: string) {
    const svg = await satori(
      <div
        style={{ width: 100, height: 100, display: 'flex', background: '#ddd' }}
      >
        <img
          src={PNG_SAMPLE}
          style={{
            width: 100,
            height: 100,
            objectFit: 'none',
            objectPosition: position,
            backgroundColor: 'red',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )

    return { svg, image: toImage(svg, 100) }
  }

  it('should support object-position center right', async () => {
    const { image } = await render('center right')
    expect(image).toMatchImageSnapshot()
  })

  it('should support object-position center bottom', async () => {
    const { image } = await render('center bottom')
    expect(image).toMatchImageSnapshot()
  })

  it('should support object-position right center', async () => {
    const { image } = await render('right center')
    expect(image).toMatchImageSnapshot()
  })

  it('should support object-position bottom center', async () => {
    const { image } = await render('bottom center')
    expect(image).toMatchImageSnapshot()
  })

  it('should support object-position center 10px', async () => {
    const { image } = await render('center 10px')
    expect(image).toMatchImageSnapshot()
  })

  it('should support object-position 10px center', async () => {
    const { image } = await render('10px center')
    expect(image).toMatchImageSnapshot()
  })

  it('should support object-position center left', async () => {
    const { image } = await render('center left')
    expect(image).toMatchImageSnapshot()
  })

  it('should support object-position center top', async () => {
    const { image } = await render('center top')
    expect(image).toMatchImageSnapshot()
  })

  it('should support object-position with calc coordinates', async () => {
    const { svg, image } = await render('calc(100% - 10px) calc(100% - 5px)')
    const { x, y } = extractImageXY(svg)
    expect(x).toBe(70)
    expect(y).toBe(80)
    expect(image).toMatchImageSnapshot()
  })

  it('should support object-position with side-based calc offsets', async () => {
    const { svg, image } = await render(
      'right calc(25% + 2px) bottom calc(10% + 3px)'
    )
    const { x, y } = extractImageXY(svg)
    expect(x).toBe(58)
    expect(y).toBeCloseTo(73.5, 5)
    expect(image).toMatchImageSnapshot()
  })
})
