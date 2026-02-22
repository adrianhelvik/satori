import { it, describe, expect } from 'vitest'

import {
  getDynamicAsset,
  initFonts,
  loadDynamicAsset,
  toImage,
} from './utils.js'
import satori from '../src/index.js'

describe('word-break', () => {
  let fonts
  initFonts((f) => (fonts = f))

  describe('normal', () => {
    it('should not break word if possible to wrap', async () => {
      const svg = await satori(
        <div
          style={{
            width: 100,
            height: 100,
            fontSize: 24,
            color: 'red',
            wordBreak: 'normal',
          }}
        >
          {'aaaaaa hello'}
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )

      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should wrap thai text in locale-sensitive word boundaries', async () => {
      const svg = await satori(
        <div
          style={{
            width: 80,
            height: 120,
            fontSize: 32,
            color: 'red',
            wordBreak: 'normal',
          }}
          lang='th-TH'
        >
          {'สวัสดีสวัสดีสวัสดี'}
        </div>,
        {
          width: 80,
          height: 120,
          fonts,
        }
      )

      expect(toImage(svg, 80)).toMatchImageSnapshot()
    })

    it('should not break long word', async () => {
      const svg = await satori(
        <div
          style={{
            width: 100,
            height: 100,
            fontSize: 24,
            color: 'red',
            wordBreak: 'normal',
          }}
        >
          {'aaaaaaaaaaa hello'}
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )

      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should wrap complex script text by grapheme clusters', async () => {
      const svg = await satori(
        <div
          style={{
            width: 96,
            height: 140,
            fontSize: 40,
            color: 'red',
            wordBreak: 'normal',
          }}
        >
          {'안녕하세요안녕하세요'}
        </div>,
        {
          width: 96,
          height: 140,
          fonts,
          loadAdditionalAsset: async (languageCode) => {
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

      expect(toImage(svg, 96)).toMatchImageSnapshot()
    })
  })

  it('should support non-breaking space', async () => {
    const text = `She weighs around blah 50\u00a0kg`
    const svg = await satori(
      <div
        style={{
          color: 'red',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          wordBreak: 'normal',
        }}
      >
        <span>{text}</span>
        <span>{text.replaceAll('\u00A0', ' ')}</span>
      </div>,
      {
        width: 200,
        height: 100,
        fonts,
      }
    )

    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })

  describe('break-all', () => {
    it('should always break words eagerly', async () => {
      const svg = await satori(
        <div
          style={{
            width: 100,
            height: 100,
            fontSize: 24,
            color: 'red',
            wordBreak: 'break-all',
          }}
        >
          {'a fascinating world'}
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )

      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('break-word', () => {
    it('should try to wrap words if possible', async () => {
      const svg = await satori(
        <div
          style={{
            width: 100,
            height: 100,
            fontSize: 24,
            color: 'red',
            wordBreak: 'break-word',
          }}
        >
          {'aaaaaa world'}
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )

      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should break words if cannot fit into one line', async () => {
      const svg = await satori(
        <div
          style={{
            width: 100,
            height: 100,
            fontSize: 24,
            color: 'red',
            wordBreak: 'break-word',
          }}
        >
          {'fascinating world'}
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )

      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should wrap first and then break long words', async () => {
      const svg = await satori(
        <div
          style={{
            width: 100,
            height: 100,
            fontSize: 24,
            color: 'red',
            wordBreak: 'break-word',
          }}
        >
          {'a fascinating world'}
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )

      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should not break CJK with word-break: keep-all', async () => {
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            backgroundColor: '#fff',
            display: 'flex',
          }}
        >
          <div
            style={{
              width: '100%',
              wordBreak: 'keep-all',
            }}
          >
            Hello! 你好! 안녕! こんにちは! Χαίρετε! Hallå!
          </div>
        </div>,
        {
          width: 200,
          height: 200,
          fonts,
          loadAdditionalAsset: (languageCode: string, segment: string) => {
            return loadDynamicAsset(languageCode, segment) as any
          },
        }
      )

      expect(toImage(svg, 200)).toMatchImageSnapshot()
    })
  })
})
