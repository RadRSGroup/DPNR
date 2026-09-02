# ADR 0009 — Crypto contract v1: algorithms, wire format, and test vectors

**Status:** Accepted (2026-08-28, Phase 6 Stage 1 — see `C:\Users\rekkawi\.claude\plans\memoized-painting-parnas.md`)

## Context

`aws-migration-plan.html` §6 and ADR 0001 already decided the crypto *design* (Argon2id-derived KEK, AES-256-GCM DEK, KMS-wrapped session tickets, X25519 inbox keypair, mandatory recovery code). Neither document pins the exact algorithm parameters, wire format, or test vectors §6.7 calls for — that's this ADR's job, and it's a prerequisite for Stage 2 (key bootstrap) and Stage 4 (swapping `crypto-stub.ts` for real encryption), since both depend on a stable format that won't change out from under already-written data.

This is also the first client-side crypto code in the repo — `apps/web/src/lib/crypto/` was a total gap before this (confirmed by direct code search: zero WebCrypto/Argon2id/AES usage anywhere in `apps/web/src`).

## Decision

### Algorithms and parameters

| Purpose | Algorithm | Parameters |
|---|---|---|
| Content encryption (every `[ENCRYPTED]` field) | AES-256-GCM, native WebCrypto | 96-bit (12-byte) random IV per encryption, auth tag embedded in WebCrypto's ciphertext output (not stored separately) |
| Password-path KEK derivation | Argon2id (`@noble/hashes/argon2`, pure JS/TS, no WASM) | memory=19456 KiB, iterations=2, parallelism=1, output=32 bytes — OWASP Password Storage Cheat Sheet's minimum recommended Argon2id profile at p=1, chosen for browser-runtime cost |
| Passkey-PRF / recovery-code KEK derivation | HKDF-SHA256, native WebCrypto | 32-byte output, distinct `info` strings per source (`dpnr-crypto-v1/passkey-kek`, `dpnr-crypto-v1/recovery-kek`) so the two can never collide even given the same raw secret |
| Key wrapping (DEK, DEK-recovery, X25519 private key) | AES-256-GCM over the raw key bytes, IV prepended to the ciphertext, both base64-encoded as one string | Same primitive as content encryption — one less thing to get wrong |
| Inbox keypair (ticketless-writer, §6.3) | X25519 (`@noble/curves/ed25519`'s `x25519` export) | 32-byte private/public keys |
| Recovery code | 160 bits (20 bytes) of `crypto.getRandomValues` entropy | Displayed as unpadded base32, grouped in 4-character blocks (32 characters, 8 groups) |

**Why these libraries**: Argon2id has no native WebCrypto implementation, so it needs a userland library regardless. `@noble/hashes`/`@noble/curves` (Paul Miller) were chosen over a WASM-based alternative (e.g. `hash-wasm`, `libsodium-wrappers`) because they're pure TypeScript — no WASM asset loading/bundling concerns in a Next.js client bundle, and both are widely used, audited libraries in the same family already trusted by major wallet software. Everything else (AES-GCM, HKDF, X25519's underlying field arithmetic isn't native but the curve op itself routes through the same audited library) uses native WebCrypto where WebCrypto has it.

### Wire format

`EncryptedBlob` (`packages/shared-types/src/dynamo/crypto.ts`, unchanged by this ADR — the format was already fixed to accommodate real crypto): `{ v, iv, ciphertext, tag? }`, all base64 except `v`. `tag` stays unused — WebCrypto's AES-GCM appends the auth tag to the ciphertext itself. `v: 1` is the first real format version; `crypto-stub.ts` already reserves `999_999` as a sentinel that can never collide with it.

A `WrappedKey` (`wrappedDek`, `wrappedDekRecovery`, `wrappedPrivateKey` in `UserKeysItemSchema`) is simpler than `EncryptedBlob`: one base64 string, IV prepended to the ciphertext, no separate version byte — these are internal to `apps/web/src/lib/crypto/dek.ts`'s `wrapKey`/`unwrapKey` and never cross the wire to a mobile client independently of the `KEYS` item as a whole, so they don't need their own version negotiation.

### Where the code lives

`apps/web/src/lib/crypto/` — `constants.ts` (this ADR's parameters, as actual exported constants — changing a shipped value here is what "bump `ENCRYPTED_BLOB_VERSION`" means in practice), `encoding.ts` (base64/base32), `blob.ts` (AES-GCM + `EncryptedBlob`), `kek.ts` (Argon2id, passkey-PRF HKDF, recovery-code HKDF), `dek.ts` (DEK generation + wrapping), `keypair.ts` (X25519), `recoveryCode.ts`, `passkey.ts` (WebAuthn PRF extension — see below), `index.ts` (barrel).

### OAuth / passkey scope split

The passkey-PRF KEK derivation (`kek.ts`'s `deriveKekFromPasskeyPrf`, `passkey.ts`'s WebAuthn helpers) is built now, even though Google OAuth federation isn't configured in Cognito yet (`auth-stack.ts`: "needs a Google Cloud Console project and OAuth client credentials... Email/password only for now"). The PRF derivation is a client-side WebAuthn flow independent of which identity provider fronts sign-in, so it's exercisable today via a plain email/password account that separately registers an encryption passkey. What's genuinely blocked on external credentials is wiring Google as a Cognito identity provider itself — a Stage 2+/later concern, not this one.

### Test vectors

`apps/web/src/lib/crypto/__tests__/vectors.ts` pins fixed-input → fixed-output pairs for every primitive above (AES-GCM, Argon2id, HKDF, X25519, base32), generated by running this module's own functions against deterministic byte-sequence inputs (`0x00..`, `0x10..`, etc. — chosen to be trivially reproducible without transcription risk, not from an external test suite). `apps/web/src/lib/crypto/__tests__/*.test.ts` (vitest — the first test runner in this repo; see the file's own doc comment for why it's scoped narrowly here rather than adopted project-wide) asserts the implementation reproduces every vector exactly, plus round-trip/determinism/tamper-rejection behavior for the parts that use fresh randomness by design (encrypted-field IVs, DEK generation, wrapped-key IVs).

A future non-web client (iOS CryptoKit, Android Keystore/Tink) is wire-compatible with this one if and only if it reproduces these same vectors for these same inputs.

## Consequences

- Any future change to a value in `constants.ts` is a wire-format break for already-written `KEYS`/`EncryptedBlob` items. Bump `ENCRYPTED_BLOB_VERSION`, regenerate the affected vectors, and document the change here as a new dated section — don't edit a shipped constant in place.
- This ADR does not itself change any server-side behavior — `crypto-stub.ts` is untouched (Stage 4's job). Nothing in the live AWS account changes as a result of this ADR landing.
- Argon2id in pure JS/TS is measurably slower than a WASM or native implementation (the library's own doc comment: "JS Argon is 2-10x slower than native code"). The chosen parameters (19 MiB, t=2) take roughly 300-650ms in this session's own test run on ordinary dev hardware — acceptable for a one-time sign-in cost, but worth re-benchmarking on real low-end mobile devices before treating this as final; revisit the parameters (not the algorithm) via a new ADR section if that benchmark finds a problem, rather than silently changing them.
