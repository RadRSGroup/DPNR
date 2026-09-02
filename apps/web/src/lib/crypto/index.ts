/**
 * DPNR client-side crypto module — Phase 6 / crypto contract v1.
 * See docs/adr/0009-crypto-contract-v1.md for the design this implements,
 * and C:\Users\rekkawi\.claude\plans\memoized-painting-parnas.md (Stage 1)
 * for where this sits in the wider rollout.
 *
 * This module never talks to the network — it's pure key material and
 * content encryption. Callers (signup/login/room flows) are responsible
 * for getting bytes to and from the `/v1/keys` and `/v1/session-ticket`
 * endpoints (Stage 2, not yet built).
 */
export * from './constants'
export * from './encoding'
export * from './blob'
export * from './dek'
export * from './kek'
export * from './keypair'
export * from './recoveryCode'
export * from './passkey'
export * from './sessionTicketKey'
