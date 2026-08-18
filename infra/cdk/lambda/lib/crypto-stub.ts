import type { EncryptedBlob } from '@dpnr/shared-types'

/**
 * TEMPORARY, NON-CRYPTOGRAPHIC placeholder for the `[ENCRYPTED]` field
 * contract (`EncryptedBlobSchema`, ADR 0001 — full zero-knowledge
 * encryption). `MVP_ARCHITECTURE.md` §7's explicit phase-ordering note
 * authorizes exactly this: Phases 1–5 may read/write plaintext directly,
 * "provided the §6.4 encrypted/plaintext field split, the API contract
 * shape, and the ticket model are all designed during Phase 0" — which
 * they already are (see the dynamo schemas' `[ENCRYPTED]` comments and
 * `api/account.ts`'s `SessionTicketRequestSchema`).
 *
 * The point of routing every read/write through these two functions,
 * instead of just storing plaintext directly in the field, is that every
 * call site already stores/reads data in the real `EncryptedBlob` SHAPE
 * (`v`/`iv`/`ciphertext`/`tag`) today. Phase 6 swaps this file's
 * implementation for real client-DEK + session-ticket + KMS envelope
 * encryption — no caller changes, no data migration.
 *
 * This is real plaintext-in-DynamoDB, deliberately, until Phase 6 — the
 * "no plaintext personal content in DynamoDB" guardrail (AGENT_LOG.md)
 * binds the *shipped* product, not this authorized interim build phase.
 * Both functions refuse to run unless `PLAINTEXT_CRYPTO_STUB_ACK=true` is
 * set, so a deploy that flips `isProduction: true` (see `ApiStack`) can't
 * silently inherit this stub by accident — it must fail loudly instead.
 */
const STUB_BLOB_VERSION = 999_999 // reserved sentinel — never used by real crypto's version numbering

function assertStubAcknowledged(): void {
  if (process.env.PLAINTEXT_CRYPTO_STUB_ACK !== 'true') {
    throw new Error(
      'Refusing to use the plaintext crypto stub without PLAINTEXT_CRYPTO_STUB_ACK=true. ' +
        'This is Phase 0-5 scaffolding, not real encryption — see infra/cdk/lambda/lib/crypto-stub.ts.'
    )
  }
}

export function stubEncryptField<T>(value: T): EncryptedBlob {
  assertStubAcknowledged()
  return { v: STUB_BLOB_VERSION, iv: '', ciphertext: JSON.stringify(value) }
}

export function stubDecryptField<T>(blob: EncryptedBlob): T {
  assertStubAcknowledged()
  return JSON.parse(blob.ciphertext) as T
}
