import { describe, expect, it } from 'vitest'
import { generateDek, unwrapKey, wrapKey } from '../dek'

describe('DEK generation and KEK-wrapping', () => {
  it('generateDek returns 32 fresh random bytes each call', () => {
    const a = generateDek()
    const b = generateDek()
    expect(a.length).toBe(32)
    expect(a).not.toEqual(b)
  })

  it('wrapKey/unwrapKey round-trips a DEK under a KEK', async () => {
    const kek = crypto.getRandomValues(new Uint8Array(32))
    const dek = generateDek()
    const wrapped = await wrapKey(dek, kek)
    const unwrapped = await unwrapKey(wrapped, kek)
    expect(unwrapped).toEqual(dek)
  })

  it('produces a different wrapped output every call (fresh IV), even for the same DEK+KEK', async () => {
    const kek = crypto.getRandomValues(new Uint8Array(32))
    const dek = generateDek()
    const a = await wrapKey(dek, kek)
    const b = await wrapKey(dek, kek)
    expect(a).not.toBe(b)
  })

  it('unwrapKey rejects the wrong KEK (this is what makes a stale password after a change fail loudly, not silently)', async () => {
    const kek = crypto.getRandomValues(new Uint8Array(32))
    const wrongKek = crypto.getRandomValues(new Uint8Array(32))
    const wrapped = await wrapKey(generateDek(), kek)
    await expect(unwrapKey(wrapped, wrongKek)).rejects.toThrow()
  })
})
