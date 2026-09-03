# ADR 0007 — Plaintext crypto-stub use accepted for internal testing only, not for any real user

**Status:** Resolved/closed (2026-09-03, Session 34 — Phase 6 Stage 4b). See "Resolution" below.

## Context

`docs/PHASE_AUDIT.md` §4.3 found a real, live-infrastructure gap: the `crypto-stub.ts` plaintext-in-DynamoDB
placeholder (authorized by `MVP_ARCHITECTURE.md` §7's phase-ordering note for Phases 1–5) is guarded by
`PLAINTEXT_CRYPTO_STUB_ACK`, which `api-stack.ts` sets to `'true'` unless `isProduction` is explicitly
passed at deploy time. Session 6's real deploy never passed it, so the live account
(`346866989957`/`us-east-1`) currently runs with the stub active by default — no code path stops real
personal content from being written as plaintext the moment a real client hits Companion or a Room.

This sits in tension with ADR 0001's "ship full zero-knowledge encryption from day one" commitment. But the
literal fix — requiring `isProduction: true` before allowing these routes to work at all — doesn't just
block real users; `crypto-stub.ts`'s own guard makes `isProduction: true` throw unconditionally on every
encrypt/decrypt call, since it's designed to make a real-data deploy fail loudly rather than silently ship
plaintext. Real encryption doesn't exist yet (Phase 6 is not started). So there is currently no way to run
Companion or either Room against the live account at all — for anyone, including internal testing — without
the plaintext stub active. The alignment work this session is starting (Decision Room's frontend port to
the live `/v1` API) needs the stub active to be testable at all before Phase 6 lands.

## Decision

Plaintext-crypto-stub use against the live AWS account is **knowingly accepted, but only under this exact
scope**:

- **Internal/founder testing only.** No user outside the founding team may be invited to use Companion,
  Decision Room, or Mirror Room against the live `346866989957` account while this exception is in effect.
- **Hard boundary, whichever comes first**: this exception ends automatically (a) the moment any user
  outside the founding team is invited to touch a live personal-content route, or (b) when Phase 6 (real
  encryption) ships — no session may extend it past either point without a new ADR.
- **Any session that would invite a non-founder user to a live personal-content route before Phase 6 must
  re-open this ADR first** — that is a new decision, not something to do silently under cover of this one.

This does **not** relax ADR 0001's "zero-knowledge encryption from day one" *launch* commitment — nothing
here authorizes shipping to real beta or public users with plaintext storage. It only covers the pre-launch
internal-testing window that the alignment work (Decision Room port, and any other frontend work against
the live API) happens in, which was already implicitly assumed by every prior session's "no AWS account
exists yet" framing but was never explicitly written down once AWS actually went live in Session 6.

## Consequences

- No code change from this ADR alone — `crypto-stub.ts` and `api-stack.ts`'s existing `isProduction` wiring
  are unchanged. This is a documented policy boundary on top of the existing technical design, not a new
  technical control. `docs/PHASE_AUDIT.md` §4.3 remains open as a technical-gap tracking item even after
  this ADR — the two are not the same thing, and building a real access-restriction gate (a stronger,
  enforced version of this boundary) remains a legitimate future improvement, just not required to unblock
  the alignment work happening now.
- Whoever does any internal testing of Companion/Decision Room/Mirror Room against the live account should
  treat whatever they enter as genuinely stored in plaintext in a real AWS account today — not a
  hypothetical. Don't enter anything in a test session you wouldn't want readable in plaintext.
- The `dpnr-application` table had 0 items as of the original audit (2026-08-19) — this ADR is written
  before any content exists under this exception, not as an after-the-fact rationalization of data already
  written.
- A future session building Phase 6 should treat "the stub can finally be retired" as the natural trigger to
  mark this ADR's exception closed, alongside `isProduction: true` actually being set at deploy time for
  the first time.

## Resolution (2026-09-03, Session 34)

Phase 6 Stage 4b converted the last ~34 `crypto-stub.ts` call sites to real per-user AES-256-GCM encryption
(`getSessionCrypto()`, `lib/session-crypto.ts` — built in Stage 4a, this session applied it everywhere else).
`crypto-stub.ts` itself and `PLAINTEXT_CRYPTO_STUB_ACK` have been deleted from the codebase entirely — there
is no longer a plaintext fallback to gate, under any env var or flag. Every `[ENCRYPTED]` field in the live
`dpnr-application` table is real ciphertext as of this deploy, live-verified across all 8 remaining domains
(Rooms, Continuity, Twin, Roadmap, Dashboard, Library, Export — see `docs/AGENT_LOG.md` Session 34).

This closes the exception this ADR granted: the trigger condition ("Phase 6 ships") is met, and more strongly
than the original text anticipated — the risk wasn't just deprioritized behind a flag, the escape hatch was
removed from the code. **`isProduction: true` was deliberately NOT flipped as part of this session** — that
flag now controls two unrelated production-readiness concerns that this session did not evaluate (the real,
non-sandbox Grow payment API base URL in `api-stack.ts`, and DynamoDB/Cognito removal policies in
`data-stack.ts`/`auth-stack.ts`), and flipping it is a separate decision for whoever actually launches to a
paying user, not something this ADR's closure requires or this session was scoped to assess.
