import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ImageResolver,
  inflightRequests,
  resetImageResolutionState,
  resolveImageData,
} from '../src/handler/image.js'

const PNG_1X1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg=='

function toArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

afterEach(() => {
  resetImageResolutionState()
  vi.restoreAllMocks()
  delete (globalThis as any).fetch
})

describe('image request state', () => {
  it('cleans inflight entries after successful fetch', async () => {
    const url = 'https://example.com/success.png'
    ;(globalThis as any).fetch = vi.fn(async () => ({
      headers: { get: () => 'image/png' },
      arrayBuffer: async () => toArrayBuffer(PNG_1X1_BASE64),
    }))

    const pending = resolveImageData(url)
    expect(inflightRequests.has(url)).toBe(true)

    await pending

    expect(inflightRequests.has(url)).toBe(false)
  })

  it('cleans inflight entries after failed fetch', async () => {
    const url = 'https://example.com/failure.png'
    ;(globalThis as any).fetch = vi.fn(async () => {
      throw new Error('network failed')
    })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const pending = resolveImageData(url)
    expect(inflightRequests.has(url)).toBe(true)

    await expect(pending).resolves.toEqual([])
    expect(inflightRequests.has(url)).toBe(false)
  })

  it('keeps resolver instances isolated', async () => {
    const url = 'https://example.com/isolated.png'
    ;(globalThis as any).fetch = vi.fn(async () => ({
      headers: { get: () => 'image/png' },
      arrayBuffer: async () => toArrayBuffer(PNG_1X1_BASE64),
    }))

    const first = new ImageResolver()
    const second = new ImageResolver()

    await first.resolve(url)

    expect(first.cache.get(url)).toBeTruthy()
    expect(second.cache.get(url)).toBeUndefined()
    expect(first.inflightRequests.has(url)).toBe(false)
    expect(second.inflightRequests.has(url)).toBe(false)
  })
})
