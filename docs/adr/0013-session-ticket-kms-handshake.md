# ADR 0013 — Session-ticket KMS handshake: asymmetric key, client-side wrap

**Status:** Accepted (2026-09-02, Phase 6 Stage 2 — see `C:\Users\rekkawi\.claude\plans\memoized-painting-parnas.md`)

## Context

`packages/shared-types/src/api/account.ts`'s `SessionTicketRequestSchema` doc comment has flagged, since it was written, that the exact DEK-wrap handshake for a session ticket "isn't locked down yet... needs a security-review pass before the Lambda is built" — that same comment already describes the *intended* design as the client "re-wrapping its DEK against the session-ticket KMS CMK's public key locally."

Investigating this for Stage 2 found the already-provisioned `sessionTicketsKmsKey` (`infra/cdk/lib/data-stack.ts`) is a default **symmetric** KMS key. A symmetric KMS key has no public key at all — there is nothing for a browser to wrap a DEK against without first calling KMS itself, which means the raw DEK would have to reach a Lambda (and therefore AWS-side process memory, however briefly) before it could be wrapped. That directly contradicts the doc comment's own description of the design, and is a real, if narrow, weakening of the full zero-knowledge guarantee ADR 0001 requires for content otherwise held to that bar. This had to be resolved before the Lambda could be built, not implemented around.

## Decision

`sessionTicketsKmsKey` becomes an **asymmetric CMK**: `KeySpec.RSA_2048`, `KeyUsage.ENCRYPT_DECRYPT`, using RSAES-OAEP-SHA-256 for the actual encrypt/decrypt operations (KMS's `EncryptionAlgorithm: RSAES_OAEP_SHA_256`, which is bit-for-bit the same padding scheme as WebCrypto's `RSA-OAEP` with a SHA-256 hash — the two interoperate with no bridging logic needed).

The handshake:
1. The client fetches the CMK's DER-encoded (SubjectPublicKeyInfo) public key once, via a new **unauthenticated** `GET /v1/session-ticket/public-key` — public keys aren't secret, same no-authorizer precedent as `GET /v1/health`.
2. The client imports it with `crypto.subtle.importKey('spki', der, {name:'RSA-OAEP', hash:'SHA-256'}, false, ['encrypt'])` and encrypts the raw DEK bytes locally with `crypto.subtle.encrypt`.
3. `POST /v1/session-ticket` sends only that ciphertext as `wrappedDek`. The create-ticket Lambda stores it verbatim as `SessionTicketItem.kmsWrappedDek` — it never receives, decrypts, or forwards the raw DEK, and needs no KMS permission of any kind to do its job.
4. Only `kms:Decrypt` (the RSA private-key operation, always server-side — asymmetric private keys never leave KMS) ever unwraps a ticket, and only Stage 4 will actually call it. The grant lands now, narrowly scoped to the interactive Rooms/Companion/Twin Lambdas (the `active_session` window) and the Continuity composer pipeline (the `post_session` window) — nobody else.

## Why not the already-provisioned symmetric key

A symmetric CMK can only be used through the KMS API directly (`Encrypt`/`Decrypt`), which means whichever side calls `Encrypt` must hold the plaintext at that moment. Doing that server-side (client sends the raw DEK over TLS, a Lambda calls `kms:Encrypt` and discards the plaintext) was the simpler alternative, but it means the raw DEK transits a Lambda's process memory for one call — acceptable for some designs, but not the one this doc comment and ADR 0001 already committed to.

## Consequences

- **This replaces the already-provisioned `SessionTicketsKey`** — CloudFormation cannot mutate a KMS key's `KeySpec` in place; changing it forces `cdk` to destroy and recreate the key. Confirmed safe to do here: per `docs/AGENT_LOG.md`'s own "current-state gap" table, the key has zero real consumers and zero data has ever been encrypted under it. This reasoning does **not** extend to any future `KeySpec` change once real tickets exist under it — that would need its own ADR weighing real data loss.
- **Two real deploy-time gotchas found live-deploying this, not hypothetical** (Session 32): (1) `KeySpec` is documented as "Update requires: Replacement," but `cdk deploy` showed the `AWS::KMS::Key` resource provider issuing an in-place `UpdateKey` call and rejecting it outright ("You cannot change the values of the KeySpec...") rather than replacing the resource — forcing a real replacement needed a new CDK construct ID for the Key itself, not just a changed prop. (2) Once that was fixed, KMS then refused a second thing: repointing the existing `Alias` from the old symmetric key to the new asymmetric one ("The current CMK and new CMK must both be symmetric or asymmetric"). An `Alias` can't be reused across that type change, and two aliases can't share one name at once, so this was a genuine **two-phase deploy**, not a one-shot fix — Phase A dropped the alias only (freeing `alias/dpnr-session-tickets`, old key left untouched), Phase B then created the new RSA-2048 key under a fresh construct ID plus a brand-new alias. Both phases deployed clean; live-verified the resulting key is genuinely `RSA_2048`/`ENCRYPT_DECRYPT` via `aws kms describe-key`.
- Asymmetric CMKs don't support AWS-managed automatic key rotation. `enableKeyRotation` comes off the key's CDK definition. This is an accepted trade-off, not an oversight — manual rotation (a new key + a migration window) would need its own ADR if ever pursued.
- `SessionTicketRequestSchema`'s doc comment is updated to point here instead of carrying its own "unresolved" note.
- Nothing in Stage 4 changes as a result of this ADR beyond "call `kms:Decrypt`, not `kms:Encrypt`-then-`Decrypt`" — the wire shape (`kmsWrappedDek` as an opaque base64 blob) was already correct.
