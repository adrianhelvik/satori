import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TwConfig } from 'twrnc'

const createMock = vi.fn((config?: Record<string, unknown>) => {
  const converter = ((tokens: string[]) => {
    const classes = String(tokens[0] || '')
      .split(/\s+/)
      .filter(Boolean)
    const style: Record<string, unknown> = {}

    if (classes.includes('text-brand')) {
      style.color = (
        config?.theme as
          | { extend?: { colors?: { brand?: string } } }
          | undefined
      )?.extend?.colors?.brand
    }
    if (classes.includes('text-sm')) {
      style.fontSize = 10
    }
    if (classes.includes('leading-tight')) {
      style.lineHeight = 20
    }
    if (classes.includes('shadow')) {
      style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.1)'
    }
    if (classes.includes('shadow-pink')) {
      style.shadowColor = 'rgba(255, 0, 255, 1)'
    }

    return style
  }) as ((tokens: string[]) => Record<string, unknown>) & {
    setWindowDimensions: ReturnType<typeof vi.fn>
  }

  converter.setWindowDimensions = vi.fn()
  return converter
})

vi.mock('twrnc/create', () => ({
  create: createMock,
}))

beforeEach(() => {
  vi.resetModules()
  createMock.mockClear()
})

describe('tailwind handler', () => {
  it('reuses converter instances for the same config object', async () => {
    const { createTwStyleResolver } = await import('../src/handler/tailwind.js')

    const config = {
      theme: { extend: { colors: { brand: '#ff0000' } } },
    }

    const resolveA = createTwStyleResolver({
      width: 100,
      height: 80,
      config: config as TwConfig,
    })
    const resolveB = createTwStyleResolver({
      width: 200,
      height: 160,
      config: config as TwConfig,
    })

    expect(createMock).toHaveBeenCalledTimes(1)
    expect(resolveA('text-brand', {}).color).toBe('#ff0000')
    expect(resolveB('text-brand', {}).color).toBe('#ff0000')
  })

  it('creates separate converter instances for different configs', async () => {
    const { createTwStyleResolver } = await import('../src/handler/tailwind.js')

    const resolveA = createTwStyleResolver({
      width: 100,
      height: 80,
      config: {
        theme: { extend: { colors: { brand: '#ff0000' } } },
      } as TwConfig,
    })
    const resolveB = createTwStyleResolver({
      width: 100,
      height: 80,
      config: {
        theme: { extend: { colors: { brand: '#0000ff' } } },
      } as TwConfig,
    })

    expect(createMock).toHaveBeenCalledTimes(2)
    expect(resolveA('text-brand', {}).color).toBe('#ff0000')
    expect(resolveB('text-brand', {}).color).toBe('#0000ff')
  })

  it('normalizes line-height and resolves shadowColor in box shadows', async () => {
    const { createTwStyleResolver } = await import('../src/handler/tailwind.js')

    const resolve = createTwStyleResolver({ width: 100, height: 100 })
    const style = resolve('text-sm leading-tight shadow shadow-pink', {
      fontSize: 16,
    })

    expect(style.lineHeight).toBe(2)
    expect(style.boxShadow).toContain('rgba(255, 0, 255, 1)')
  })
})
