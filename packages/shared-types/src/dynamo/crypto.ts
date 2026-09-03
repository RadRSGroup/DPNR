import { z } from 'zod'

/**
 * Client-side encrypted content blob, per the crypto contract
 * (aws-migration-plan.html §6.7, ADR 0001 — full zero-knowledge encryption).
 * This is what actually sits in DynamoDB for any field marked [ENCRYPTED]
 * in MVP_ARCHITECTURE.md §3 — never the plaintext shape.
 *
 * NOTE: no encryption/decryption code exists yet (that's a client-side
 * crypto module + the session-ticket Lambda flow, not built this session —
 * see AGENT_LOG.md). This schema fixes the wire/storage shape so nobody
 * accidentally stores a plaintext field later by skipping it.
 */
export const EncryptedBlobSchema = z.object({
  v: z.number().int().min(1), // format version byte — bump on any layout change
  iv: z.string(), // base64 AES-256-GCM nonce
  ciphertext: z.string(), // base64 ciphertext
  tag: z.string().optional(), // base64 auth tag, if the chosen crypto lib doesn't embed it
})
export type EncryptedBlob = z.infer<typeof EncryptedBlobSchema>

/**
 * The first real `EncryptedBlob.v` value (ADR 0009/ADR 0014, Phase 6 Stage
 * 4) — real AES-256-GCM, auth tag appended to `ciphertext` (not the
 * optional `tag` field), matching WebCrypto's own AES-GCM output
 * convention. `crypto-stub.ts`'s `STUB_BLOB_VERSION = 999_999` is a
 * sentinel that can never collide with this.
 */
export const ENCRYPTED_BLOB_VERSION = 1
