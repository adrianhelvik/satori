import { describe, expect, it } from 'vitest'

import satori from '../src/index.js'
import { getDynamicAsset, initFonts, toImage } from './utils.js'

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

  it('should support line-break:anywhere for complex scripts without splitting clusters', async () => {
    const koreanText = '안녕하세요안녕하세요'

    const withLineBreakAnywhere = await satori(
      <div
        style={{
          width: 84,
          height: 120,
          backgroundColor: '#eee',
          lineHeight: 1.2,
          lineBreak: 'anywhere',
          fontSize: 28,
        }}
      >
        {koreanText}
      </div>,
      {
        width: 84,
        height: 120,
        fonts,
        loadAdditionalAsset: async (languageCode: string) => {
          if (languageCode === 'ko-KR') {
            return [
              {
                name: 'satori_ko_fallback',
                data: await getDynamicAsset('안녕'),
                weight: 400,
                style: 'normal',
                lang: 'ko-KR',
              },
            ]
          }

          return []
        },
      }
    )

    const withWordBreak = await satori(
      <div
        style={{
          width: 84,
          height: 120,
          backgroundColor: '#eee',
          wordBreak: 'break-all',
          lineHeight: 1.2,
          fontSize: 28,
        }}
      >
        {koreanText}
      </div>,
      {
        width: 84,
        height: 120,
        fonts,
        loadAdditionalAsset: async (languageCode: string) => {
          if (languageCode === 'ko-KR') {
            return [
              {
                name: 'satori_ko_fallback',
                data: await getDynamicAsset('안녕'),
                weight: 400,
                style: 'normal',
                lang: 'ko-KR',
              },
            ]
          }

          return []
        },
      }
    )

    expect(toImage(withLineBreakAnywhere, 84)).toEqual(
      toImage(withWordBreak, 84)
    )
  })

  it('should keep line-break:anywhere behavior consistent when word-break is keep-all', async () => {
    const withLineBreakAnywhere = await satori(
      <div
        style={{
          width: 40,
          height: 120,
          backgroundColor: '#eee',
          lineHeight: 1.2,
          wordBreak: 'keep-all',
          lineBreak: 'anywhere',
          fontSize: 28,
        }}
      >
        {'안녕하세요안녕하세요'}
      </div>,
      {
        width: 40,
        height: 120,
        fonts,
        loadAdditionalAsset: async (languageCode: string) => {
          if (languageCode === 'ko-KR') {
            return [
              {
                name: 'satori_ko_fallback',
                data: await getDynamicAsset('안녕'),
                weight: 400,
                style: 'normal',
                lang: 'ko-KR',
              },
            ]
          }

          return []
        },
      }
    )

    const withWordBreak = await satori(
      <div
        style={{
          width: 40,
          height: 120,
          backgroundColor: '#eee',
          lineHeight: 1.2,
          fontSize: 28,
          wordBreak: 'break-all',
        }}
      >
        {'안녕하세요안녕하세요'}
      </div>,
      {
        width: 40,
        height: 120,
        fonts,
        loadAdditionalAsset: async (languageCode: string) => {
          if (languageCode === 'ko-KR') {
            return [
              {
                name: 'satori_ko_fallback',
                data: await getDynamicAsset('안녕'),
                weight: 400,
                style: 'normal',
                lang: 'ko-KR',
              },
            ]
          }

          return []
        },
      }
    )

    expect(toImage(withLineBreakAnywhere, 40)).toEqual(
      toImage(withWordBreak, 40)
    )
  })

  it('should keep emoji grapheme clusters when using line-break:anywhere', async () => {
    const text = '👨‍👩‍👧👶🏾❤️‍🔥👨‍👩‍👧👶🏾'

    const withLineBreakAnywhere = await satori(
      <div
        style={{
          width: 112,
          height: 160,
          backgroundColor: '#eee',
          fontSize: 28,
          lineBreak: 'anywhere',
        }}
      >
        {text}
      </div>,
      {
        width: 112,
        height: 160,
        fonts,
        graphemeImages: {
          '👨‍👩‍👧': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlTRAfQMAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
          '👶🏾': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlTRAfQMAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
          '❤️‍🔥': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlTRAfQMAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        },
      }
    )

    const withWordBreak = await satori(
      <div
        style={{
          width: 112,
          height: 160,
          backgroundColor: '#eee',
          fontSize: 28,
          wordBreak: 'break-all',
        }}
      >
        {text}
      </div>,
      {
        width: 112,
        height: 160,
        fonts,
        graphemeImages: {
          '👨‍👩‍👧': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlTRAfQMAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
          '👶🏾': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlTRAfQMAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
          '❤️‍🔥': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlTRAfQMAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        },
      }
    )

    expect(toImage(withLineBreakAnywhere, 112)).toEqual(
      toImage(withWordBreak, 112)
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
