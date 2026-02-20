import { describe, it, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

const PNG_SAMPLE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAPCAYAAADkmO9VAAAAAXNSR0IArs4c6QAAAIRlWElmTU0AKgAAAAgABQESAAMAAAABAAEAAAEaAAUAAAABAAAASgEbAAUAAAABAAAAUgEoAAMAAAABAAIAAIdpAAQAAAABAAAAWgAAAAAAAABIAAAAAQAAAEgAAAABAAOgAQADAAAAAQABAACgAgAEAAAAAQAAABSgAwAEAAAAAQAAAA8AAAAAVtc7bQAAAAlwSFlzAAALEwAACxMBAJqcGAAAAVlpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDYuMC4wIj4KICAgPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICAgICAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgICAgICAgICAgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iPgogICAgICAgICA8dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk9yaWVudGF0aW9uPgogICAgICA8L3JkZjpEZXNjcmlwdGlvbj4KICAgPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KGV7hBwAAA1FJREFUOBGNVFtME0EUnd3S3T5paamRxidoihRKRVGJkaDBRCFNiMkSP9QPiaHhgwRREwOGEUn8MfERIDEqMfxZEtEoSviQGh8Qg4YagQCipVIepdoWSh+03XFndRXkx/uxc+fOPWfO3nt3AfhtDGMTCf6VK3PFFRVTDADdGhyDEJEAAUI4z+7Mzmj1t6bwewhIIY5XPgkDICRYAMZ1Vmv0FkEsH5qcFKFd+bKRDwPUsa6uzT4BVNVZBbVJ2lMBScDPqtm65vzm54yNEXWUdyRwDomVYbL2doe8uDjYtrgYOUpRsUggEBxXK1H+lg3B8wJZU0/jHcmyuNr9w+1eCCxok8PJLYo3inWYDCLIKyWNRoZXOTNDq0pLqWyzWbQ8MoJCuSZasRQKB1sGiQMC4SxayhPLVN5t8gxkSM0MO/1OWU2ixorP096n8SUT2e2XWQh7k+rr8wNFRWc3arTKYplE5I2RbIKmpSrLd7enrdqkrdxXWJE25VJ7iFCi3nPDr/MpKXdoVu4MOV+7Ol1vg/og6bQ72aRftxdx9QMAoXVXFZJAYXqmcmfUuTRVKLIvyPI+b/X9kDbNP3o4p99fAooIMnpAv0cnl6fQYNF9/dXJ/msYa2+wJwD83RQcEBozYJtQDWnTDQpYW5aG2svD2oJw8nYDq8zNFROaFBkxMhrv9tTerj5+ugfktTkwlp8Agnty9mcU8IYfD0jgi9g+E7BE9lW1RmLRWb3ZpCRpWuy1Wucle3anqvzr67LGnj6wMUaq3DgU5wD8G2KOVTOEu81AyJeBlJSMijXJy7RCop1ou6Yaugv18aZGg+7chYxwWWYOBhuZBk7FXzIc48HYESwLwhinnSDePRsbLC3oi8/4LEvmg4Th8BFSGYvHfP39A/Hxb/dwvmd4+I8yAb9KIQ5yNUAdkBFj//smx2N2BxtGEf/o/KcXX6YTL6Pegvt1e590fB2yQeoghHGct9LWEPKHDQw/9VSuaWw6RwkWLXrNZA6d5NJRKlnGJV6VR7f6VQXSVU0RgnhF3LdLcJ173nXmYiyhPhGNBlxikdQx9/FmYyUEIeF8Jea//d7eMrXNBqQCAJMJ/r/rmqasTEAIcUCCk/rIj+OQ/7NAbg/XNEPA/QQBqVjfA25FYgAAAABJRU5ErkJggg=='

describe('Object Fit & Position Extras', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should support object-fit: none using intrinsic size', async () => {
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
            backgroundColor: 'red',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support object-fit: scale-down without upscaling small images', async () => {
    const svg = await satori(
      <div
        style={{ width: 100, height: 100, display: 'flex', background: '#ddd' }}
      >
        <img
          src={PNG_SAMPLE}
          style={{
            width: 100,
            height: 100,
            objectFit: 'scale-down',
            backgroundColor: 'red',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support object-fit: scale-down downscaling large images', async () => {
    const svg = await satori(
      <div
        style={{ width: 40, height: 40, display: 'flex', background: '#ddd' }}
      >
        <img
          src={PNG_SAMPLE}
          style={{
            width: 10,
            height: 10,
            objectFit: 'scale-down',
            backgroundColor: 'red',
          }}
        />
      </div>,
      { width: 40, height: 40, fonts }
    )

    expect(toImage(svg, 40)).toMatchImageSnapshot()
  })

  it('should support object-position percentages', async () => {
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
            objectPosition: '25% 75%',
            backgroundColor: 'red',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support object-position lengths', async () => {
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
            objectPosition: '10px 20px',
            backgroundColor: 'red',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support right/bottom length offsets for object-position', async () => {
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
            objectPosition: 'right 10px',
            backgroundColor: 'red',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
})
