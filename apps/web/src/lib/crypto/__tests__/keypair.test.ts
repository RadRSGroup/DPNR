import { describe, expect, it } from 'vitest'
import { decodePublicKey, encodePublicKey, generateInboxKeypair, unwrapPrivateKey, wrapPrivateKey } from '../keypair'
import { X25519_VECTOR } from './vectors'
import { x25519 } from '@noble/curves/ed25519'

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}
function bytesToHex(b: Uint8Array): string {
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
}

describe('X25519 crypto contract vector', () => {
  it('reproduces the pinned public key for a fixed private key', () => {
    const pub = x25519.getPublicKey(hexToBytes(X25519_VECTOR.privHex))
    expect(bytesToHex(pub)).toBe(X25519_VECTOR.pubHex)
  })
})

describe('inbox keypair generation + wrapping', () => {
  it('generateInboxKeypair returns a public key derivable from the private key', () => {
    const { privateKey, publicKey } = generateInboxKeypair()
    expect(x25519.getPublicKey(privateKey)).toEqual(publicKey)
  })

  it('encodePublicKey/decodePublicKey round-trips', () => {
    const { publicKey } = generateInboxKeypair()
    expect(decodePublicKey(encodePublicKey(publicKey))).toEqual(publicKey)
  })

  it('wrapPrivateKey/unwrapPrivateKey round-trips under a KEK', async () => {
    const kek = crypto.getRandomValues(new Uint8Array(32))
    const { privateKey } = generateInboxKeypair()
    const wrapped = await wrapPrivateKey(privateKey, kek)
    const unwrapped = await unwrapPrivateKey(wrapped, kek)
    expect(unwrapped).toEqual(privateKey)
  })
})
