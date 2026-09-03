# DPNR — Phase Audit (Ground Truth)

**Written:** 2026-08-19, dedicated audit session (no feature work performed). **Updated same day, follow-up
session:** §2.2/§4.1/§4.2 (the consent-gate findings) are now **fixed**, not just flagged — see the update
notes inline at each section. **Updated 2026-08-21, Session 12 (documentation-only correction, no
re-audit)**: §2.4/§1 updated for Companion's real Bedrock wiring; §3.2/§6 item 5 corrected — the GDPR
export-route gap that section described was already fixed in Session 10 part 3, this document just hadn't
caught up. **Updated 2026-08-21, Session 12 part 2 (new finding, targeted verification, no full re-audit)**:
§4.6 — the spec's two Golden Paths (§2) are not actually satisfiable end to end today; see that section and
§6 item 8. **Updated 2026-08-21, Session 12 part 3**: §4.6's fix was scoped into four workstreams; one
(the Dashboard frontend port) is now done, deployed, and live-verified — see §4.6's own update note. The
other three (Companion UI, proactive continuation/context, onboarding+Roadmap) remain open.

**Updated 2026-08-21, Session 13**: a second of the four workstreams — the Companion frontend UI — is now
also done and live-verified, and the default post-login landing page is now `/companion`, not `/dashboard`.
See §4.6's own update note. Proactive continuation/context and onboarding+Roadmap remain open.

**Updated 2026-08-21, Session 14**: a third workstream — proactive continuation + real context — is now also
done and live-verified. Companion replies are informed by the caller's confirmed Digital Twin signals, and a
real "welcome back" opener is synthesized and persisted when the person returns after a gap. See §4.6's own
update note. Only onboarding + Roadmap generation (workstream D) remains open.

**Updated 2026-08-21, Session 15, part 1**: the fourth and last workstream — Companion-led onboarding + initial
Roadmap generation — is now also done and live-verified. All four Golden Path workstreams are complete. See
§4.6's own update note. **Session 15, part 2 (same session, at the user's explicit request)**: a full re-walk
of both Golden Paths and the Core MVP Scope table (§3) against the live product, not just against this
document's own prior claims — see new §4.7. Confirms both Golden Paths are now genuinely satisfiable end to
end, and surfaces three real, previously-untracked gaps against the Core MVP Scope table specifically (a real
session timer, soft-stopping cues, and Beta labeling at the Welcome/Trial moment) — none of them part of any
Golden Path workstream's own scope, so not a regression in A/B/C/D, a genuinely new finding from checking a
document this project had never checked line-by-line before.

**Updated 2026-08-21, Session 16, part 1**: Digital Twin now has a real frontend (`/twin`, "InnerSelf") — the
last piece of §1's Phase 1 row that was still backend-only. Beta labeling now reaches `/signup` and root, closing
that Session 15 finding. Beyond the originally-scoped work, the user directed a live IA expansion mid-session
— a new `/rooms` ("Work Rooms") hub and a real Library frontend (`/library`), with Dashboard rebuilt into a
tile-based hub — which also closes the Library-frontend gap tracked since Session 13. A real, previously-latent
bug in `LibraryTopicDetailFn` (missing `PLAINTEXT_CRYPTO_STUB_ACK`) was found via live verification of the new
frontend and fixed/deployed in the same session. **Session 16, part 2 (same session)**: a real Roadmap-revision
mechanism is now built and live-verified — Golden Path B step 5 ("update... only when evidence justifies it")
is fully true for the first time, closing the last item from Session 15 part 2's re-walk except the session-
timer/soft-stopping-cue work. See §1's Phase 1/2/3 rows and `AGENT_LOG.md` Session 16 (both parts) for full
detail.

**Updated 2026-08-24, Session 17 (documentation-only correction, no full re-audit)**: §6's consolidated list
items 10-12 (Beta labeling, Library/Twin frontend, Roadmap-revision) were still marked open below despite this
document's own update notes above already recording all three as closed by Session 16 — that section was
never edited to match. Corrected inline at each item, not re-litigated. Session 17 also found and fixed a real
gap in Content Library's row (§1 Phase 3): the seeded `taxonomyCategory` values never matched the spec's own
§4 taxonomy (6 real categories) — see that row's own update note. Full detail, including the nav/account and
Daily Card UX fixes this session also made outside this document's scope, is in `AGENT_LOG.md` Session 17.

**Purpose:** this is the
single place to check what's actually built and verified, as opposed to what a session's narrative log
*says* is built. `docs/AGENT_LOG.md` is the cross-session handoff journal — trustworthy, but written
session-by-session, in-the-moment, and never re-checked afterward. This document is a fresh, independent
pass: every status claim below was re-verified this session by reading the actual code, running the actual
build/typecheck/synth commands, and querying the actual live AWS account (`346866989957`, `us-east-1`) —
not by trusting a prior session's self-report. Where a prior claim held up, it's confirmed here with new
evidence. Where it didn't, or where something was never checked at all, that's called out explicitly.

**How to use this doc:** read the phase table for a fast status scan, then the "Divergences" section for
everything that needs a human product decision. Don't duplicate this content into `AGENT_LOG.md` — point
to it instead, per that file's own protocol.

---

## 0. Source documents — authority map (confirmed this session)

| Document | Date | Role | This session's finding |
|---|---|---|---|
| `DPNR_MVP_Build_Specification_FINAL_CHAT_HUB_v2.docx` | 2026-08-17 | **Authoritative product source of truth** | Confirmed. Newest document by over a year; `docs/MVP_ARCHITECTURE.md` correctly treats it as primary. |
| `aws-migration-plan.html` rev.10 | 2026-07-19/20 | Decision-Room-specific AWS design, adopted as the platform architecture reference | Confirmed still the most complete architecture/encryption/cost design in the whole document set — nothing supersedes its §6 (encryption) or §12 (cost model). |
| `digital_personality_presentation.pdf` | file mod. 2026-07-25 | Conceptual reference only (Appendix B), explicitly optional per the build spec's own adoption rule | Read in full this session. **Correction to a stale detail carried across prior sessions: the file has 5 pages total, not "147 pages, 5 real."** `doc.page_count` via PyMuPDF confirms 5 — there is no 147-page version of this artifact on this machine. Content summarized in §3.1 below. |
| `Software Requirements Specification DPNR.docx` + its 2 `.md` siblings | 2025-06-05 (docx), one `.md` edited ~2 hrs later | **Never reviewed before this session** | Read in full. **Verdict: stale and superseded, not a live requirement source** — see §3.3. |
| `dpnr-architecture-cost.html` (3 copies) | content dated 2026-07-14; files re-saved 07-14/07-15/08-17 | **Never reviewed before this session** | Read in full. **All three copies are byte-identical** (same MD5). Not the whole-product cost-model successor `AWS_SETUP.md` references as unbuilt — see §3.4. |

---

## 1. Phase-by-phase status (MVP_ARCHITECTURE.md §7)

| Phase | Scope (cite) | Status | Verified how (this session) |
|---|---|---|---|
| **0 — Platform foundation** | §7: Cognito, `/v1` API Gateway+Lambda skeleton, DynamoDB (app+Registry+Tickets), Bedrock swap, Prompt Registry skeleton, `proxy.ts` extended | **Done, live** | Live AWS: `aws sts get-caller-identity`, `aws cloudformation describe-stacks` (all 3 stacks + CDKToolkit `CREATE_COMPLETE`), `aws dynamodb list-tables` (5 tables exist), `curl {ApiUrl}/v1/health` → real 200, unauthenticated `POST /v1/rooms/decision` → 401 (authorizer enforced), `aws cognito-idp list-user-pools` (pool + both triggers wired), `aws budgets describe-budgets` (both alerts exist). Local: fresh `npm run build:shared-types && npm run typecheck:cdk && npm run synth` — all green, only the pre-documented cosmetic cross-stack-reference-strength warning. |
| **1 — Slice 1: Product spine** | §7: account/consent/onboarding, Companion, Dashboard, Digital Twin v1 (data+confirm/reject), Roadmap, Beta Trial+Credits | **All four Golden Path workstreams done (§4.6); the two Golden Paths are now genuinely satisfiable end to end. Session 16 closed the remaining frontend gap this row flagged — Digital Twin now has a real frontend (`/twin`, "InnerSelf"), live-verified confirm/reject in both directions.** See §4.7 for the full re-walk, which also surfaces two remaining gaps against the Core MVP Scope table (§3): Roadmap-revision and the session-timer/soft-stopping-cue work. | See §2.1–§2.3 below. `GET /v1/dashboard`'s Lambda is real DynamoDB code, and — as of Session 12 part 3 — **`apps/web/src/app/dashboard/page.tsx` now actually calls it**, extended to also surface Daily Card/commitment continuity cues, live-verified; it had never called it before (§4.6). Session 16 rebuilt Dashboard again into a tile-based hub (Companion/Work Rooms/InnerSelf/Library), at the user's direct request. **Companion now calls real Bedrock** (Session 12, see §2.4) with a live routing directive, **has a real frontend at `/companion`**, now also the default post-login landing page (Session 13, §4.6), replies are informed by confirmed Twin signals and a real synthesized "welcome back" opener fires and persists when the person returns after a gap (Session 14), and — as of **Session 15** — **a real Companion-led onboarding conversation generates the person's actual first Roadmap plus two confirmed Twin signals**, live-verified, with the handoff back into normal `respond`/routing behavior confirmed working immediately afterward. **Digital Twin v1 is now real, live-verified, and has a real frontend as of Session 16**: `GET /v1/twin`, confirm/reject (real since Session 10), and `/twin`'s card-list UI (Session 16) — confirmed a real signal `confirmed → rejected → confirmed` round-trip persists server-side both ways, not just optimistically client-side. **Credits ledger built and live-verified (Session 11)**: `grantCredits`/`consumeCredits` primitives (`lib/credits.ts`), a starter-trial grant wired into the Cognito post-confirmation trigger, `GET /v1/credits`, `GET /v1/plans` (Plans catalog table now seeded), all live-verified against the real deployed API — see AGENT_LOG.md Session 11. `POST /v1/credits/purchase` is NOT built (blocked on the payment-provider decision) and `consumeCredits` is NOT wired into any Room/Companion/Library call site yet (blocked on the "billable action" decision, still true even after Companion's own Bedrock wiring) — see §2.3 below, updated. Roadmap generation is now real (Session 15) and, as of **Session 16 part 2**, **revisable**: confirming a Twin signal runs a conservative `roadmap/revise` check that, when it decides real evidence warrants it, writes a proposal the person must explicitly accept (`POST /v1/roadmap/proposal/accept`) or reject before it touches the live Roadmap — Golden Path B step 5 is fully satisfied for the first time, live-verified end to end including the version-history archive on accept. The Auth/account API row (§4 table row 1, minus consent/export/delete which Session 10 also built) is still otherwise unbuilt. (This row's older "consent gate unsatisfiable" claim predates §2.2's own fix — see that section, not repeated here to avoid amplifying a stale claim.) |
| **2 — Slice 2: Mirror Room** | §7: flow-engine reuse, new prompt set, candidate Twin updates | **Backend + frontend both done and live-verified end to end (Session 9)** | Backend: 6-step flow (`mirror-steps/*.ts`), 2 prompts live-seeded, design product-reviewed (AGENT_LOG Session 6). Frontend (Session 9, greenfield — no legacy UI existed): `apps/web/src/components/mirror/*` + `mirror/new/page.tsx`, styled to match Decision Room's design system, built to the real free-text contract (Figma's richer scenario-catalog concept explicitly deferred, confirmed with the user). Real browser session driven through all 6 steps + Commitment + Completion with a throwaway Cognito user, cross-checked against `aws dynamodb get-item` (`status:'completed'`, all 11 content fields correct), `?resume=` tested. Found and fixed a real `mirror-full.ts` bug this session (`currentStepId` sourced from the wrong item — see AGENT_LOG Session 9) and deployed the fix live. `command.ts`'s consent check **does** cover Mirror Room (§4.1 already notes this fixed session-of-discovery) — the "not consent-gated" claim in a prior version of this row was stale, corrected here. Model call still routes through the shared stub (§2.4) — unchanged. As of Session 16, reachable from Dashboard via the new `/rooms` ("Work Rooms") hub rather than a direct Dashboard CTA. |
| **3 — Slice 3: Content Library** | §7: catalog table, taxonomy, AI explanation, recommendations | **Reads done and live-seeded; personalization real (Bedrock, Session 10); a real frontend as of Session 16; recommendations still honestly empty** | `aws dynamodb scan --table-name dpnr-library-catalog --select COUNT` → 12 items (6 topics × version+alias, matches). `recommendations.ts` read directly — returns `[]` by design, documented why; the new `/library` page doesn't surface it. **The 6 topics' content was explicitly product-reviewed and approved as-is by the user in Session 10** — no longer a draft, same status Decision Room/Mirror Room's content already has. Personalization (`topic-detail.ts`) now calls real Bedrock, not the old stub, per Session 10's Bedrock-wiring work — **Session 16 found and fixed a real bug in this exact path**: `LibraryTopicDetailFn` was deployed without `PLAINTEXT_CRYPTO_STUB_ACK`, so decrypting a confirmed Twin signal to build the personalized explanation threw a 500 for any real user with one, until this session (nothing had reached that combination before, with neither a Twin nor a Library frontend to drive it). Fixed, deployed, re-verified live with a real personalized explanation rendering correctly. `/library` (list, grouped by `taxonomyCategory`) + `/library/[slug]` (detail) are Session 16's new frontend, live-verified end to end including the bug above. **Session 17**: found the seeded `taxonomyCategory` values never matched the spec's own §4 taxonomy (6 categories: Inner World, Values & Needs, Energy & Motivation, Patterns & Beliefs, Relationships, Direction & Creation) — the original categories were this project's own invention from a session that never had the docx. Re-seeded all 6 topics onto the real taxonomy by content fit; confirmed live via `dynamodb scan`. `Energy & Motivation` and `Relationships` honestly have zero topics — no existing approved content fits either, out of scope for a category remap to also write new content. |
| **4 — Slice 4: Decision Room port** | §5.3/§7: port 7-step+summary UI to `/v1`; swap AI to Bedrock | **Done and live-verified end to end (guided-creation flow only — post-completion review page still deferred)** | `apps/web/src/app/decision/new/page.tsx` + all 7 step components + 4 post-flow/summary screens now call `submitRoomCommand`/`getDecisionFull`, zero `lib/supabase/decisions.ts` calls left in that flow. Real browser session driven through all 14 steps against the live API with a throwaway Cognito user, cross-checked against `aws dynamodb get-item`/`query` at multiple points (SessionItem reached `status:'completed'`/`currentStepId:'COMMITMENT'`; outcome's reflection carries the real commitment text). `session_version_conflict` resync and `session_completed` redirect both fired for real during this pass, not just unit-tested. AI calls still route through the model stub (§2.4) — unchanged by this session. |
| **5 — Slice 5: Continuity layer** | §7: Daily Card, Weekly Recap, commitments/reminders, EventBridge pipeline | **Done and live-verified end to end (Session 11, both parts) — only the reminder-notification piece remains, blocked on an open decision** | **Session 11 part 1**: `POST /v1/commitments`/`GET /v1/commitments` built and live-verified. **Session 11 part 2**: Daily Card + Weekly Recap fully built and live-verified too — `compose-daily-card.ts`/`compose-weekly-recap.ts` (scheduled via a plain `aws-events.Rule` cron, not the dedicated EventBridge Scheduler service `MVP_ARCHITECTURE.md` §6 names — a deliberate, flagged substitution, functionally equivalent for a fixed daily/weekly invocation) compose real, personalized `DAILYCARD#<date>`/`WEEKLYRECAP#<isoWeek>` items from confirmed Twin signals + session summaries; `GET /v1/daily-card`/`GET /v1/weekly-recap` are pure cache-hit reads. Manually invoked both composer Lambdas (simulating the schedule rather than waiting a day/week) and confirmed via the real API that the composed content was specific and clearly personalized, not generic — and confirmed no urgency/streak language, i.e. the spec's anti-addiction rule actually held against a live model, not just in the prompt text. A real, previously-undocumented gap was found and closed along the way: `SessionSummaryItem` had existed in the schema since early sessions but nothing had ever written one — see §2.3 below, updated. No reminder ever fires from a commitment's `reviewDate` — deliberately out of scope, blocked on the "what is a reminder" decision (AGENT_LOG.md); this is the one piece of Slice 5 still not built. `rooms/command.ts` still doesn't publish any `session.completed` event — not needed for what got built (Twin extraction and now session-summary persistence both run synchronously inline instead, see §2.3), but would be if a future async consumer ever needs one. |
| **6 — Slice 6: Production hardening (encryption)** | §7: client-side E2E encryption, crypto contract, recovery-code UX, security review, CloudTrail alarms, real webhook HMAC | **Not started — and carries a live, latent infrastructure risk** | `crypto-stub.ts` read directly: plaintext-in-DynamoDB, guarded by `PLAINTEXT_CRYPTO_STUB_ACK`. Traced the guard's wiring end to end (`api-stack.ts` → `bin/dpnr.ts`) — see §4.5: **the real, live deployment today has this stub active**, because `isProduction` was never passed at deploy time. No real user data exists yet (`aws dynamodb scan --table-name dpnr-application --select COUNT` → 0), so this is latent, not realized — but there is currently no deploy-time control preventing it. |

---

## 2. Phase 1 detail — the gaps AGENT_LOG's summary doesn't fully name

### 2.1 Auth/account API surface: entirely unbuilt, not just "encryption-pending"

> **Update (Session 7 part 4):** `apps/web`'s login/signup/session now runs on Cognito for real
> (`lib/cognito/client.ts`, `lib/api/v1-client.ts`), live-verified through an actual browser against the
> real account. This surfaced a real infrastructure bug this audit's own original pass didn't catch because
> nothing had ever called the API from a browser before: **the API Gateway `HttpApi` had zero CORS
> configuration** — every browser call was silently blocked pre-flight, even though the identical call via
> `curl` always worked. Fixed (`corsPreflight` on `api-stack.ts`'s `HttpApi`, currently scoped to
> `http://localhost:3000` only) and deployed. `POST /v1/user/consent` is no longer part of this unbuilt
> row (§2.2); `session-ticket`, `keys`, password change, and account deletion remain unbuilt.
>
> **Update (Session 32 — Phase 6 Stage 2, `smooth-purring-harp.md`):** `session-ticket` and `keys` are now
> built, deployed, and live-verified — `GET /v1/session-ticket/public-key` (unauthenticated), `GET`/`POST
> /v1/keys`, `POST /v1/session-ticket`, `DELETE /v1/auth/sessions/{id}`. See ADR 0013 for the asymmetric
> RSA-2048 KMS handshake design and its own two real CloudFormation/KMS deploy-time gotchas (KeySpec change
> rejected as an in-place update; an Alias can't be repointed across a symmetric→asymmetric key change — both
> required a genuine key/alias replacement, done as a two-phase deploy). `PUT /v1/auth/password` and account
> deletion — account deletion is actually already built (`DELETE /v1/account`, confirmed live in `api-stack.ts`
> and this file's own §2.2) — remain the only items in this row still unbuilt: password change only.
>
> **Update (Session 33 — Phase 6 Stage 3, `lovely-napping-milner.md`):** the key bundle these endpoints serve
> is now actually populated for real signups, not just theoretically reachable. `apps/web/src/lib/auth/keyBootstrap.ts`
> (new) wires real key generation into `signup`'s confirm step (with the mandatory ADR 0001 recovery-code
> reveal, `components/auth/RecoveryCodeReveal.tsx`) and real session-ticket creation/revocation into
> `login`/sign-out. A new `PUT /v1/keys` endpoint (`infra/cdk/lambda/account/keys-update.ts`) and a net-new
> `/forgot-password` page complete the account-recovery loop: reset the Cognito password, then use the
> recovery code to recover and re-wrap the DEK (rotating the code in the process — ADR 0014, which also
> corrects `wrappedPrivateKey`'s wrapping key from "the account KEK" to the raw DEK itself, so it's
> recoverable via either path). `PUT /v1/auth/password` (a direct, already-signed-in password change, distinct
> from this forgot-password flow) remains the only item in this row still unbuilt.
>
> **Update (Session 33, part 2 — Phase 6 Stage 4a pilot):** the key material above is now actually consumed
> for real — `infra/cdk/lambda/lib/session-crypto.ts` (new) is the first real caller of the `kms:Decrypt`
> grant Stage 2 wrote: it looks up the caller's live `active_session` ticket, unwraps its DEK via KMS, and
> hands back real AES-256-GCM `encryptField`/`decryptField`. Companion (`companion/message.ts`/`context.ts`,
> 2 of ~37 `crypto-stub.ts` call-site files) is converted and live-verified — a real `dynamodb get-item` shows
> genuine ciphertext (`v: 1`, a real 12-byte IV) where the stub used to write `iv: ''` and readable
> `JSON.stringify` text. The `active_session` ticket duration was also bumped 60min → 8h (a deliberate,
> reversible stopgap — no touch/refresh mechanism built), and every sign-in now also mints a `post_session`
> ticket for the still-unconverted Continuity composer. The remaining ~35 files, the `SessionItem.lastResponse`
> plaintext leak, `userExportFn`'s missing KMS/session-ticket grants, and flipping `PLAINTEXT_CRYPTO_STUB_ACK`'s
> `isProduction` meaning are Stage 4b — deliberately not done in this pilot.
>
> **Update (Session 34 — Phase 6 Stage 4b, the final stage): every remaining `crypto-stub.ts` call site (34
> files across Rooms, Continuity, Twin, Roadmap, Dashboard, Library, and `account/export.ts`) is now real
> per-user AES-256-GCM encryption, deployed and live-verified against real AWS across all 8 domains.**
> `userExportFn`'s previously-missing `kms:Decrypt`/session-tickets-table grants are now in place (it was
> calling the stub with zero grant before this). `crypto-stub.ts` and `PLAINTEXT_CRYPTO_STUB_ACK` are deleted
> from the codebase entirely — there is no remaining plaintext fallback, gated or otherwise. **ADR 0007 (the
> plaintext-stub internal-testing exception) is formally closed** — see its own "Resolution" section for why
> `isProduction: true` was deliberately NOT flipped as part of this (it now gates two unrelated concerns, real
> Grow payment API + DynamoDB/Cognito removal policies, not evaluated this session). The `SessionItem.lastResponse`
> plaintext leak in `rooms/command.ts` (flagged since Session 10) is the one item from Stage 4b's own scope that
> remains genuinely unfixed — still real, still open backlog, not touched this session.

`MVP_ARCHITECTURE.md` §4's first API row — `POST /v1/session-ticket`, `DELETE /v1/auth/sessions/{id}`,
`PUT /v1/auth/password`, `DELETE /v1/account`, `GET /v1/keys` — has **zero Lambda handlers and zero CDK
routes**. Confirmed by grepping `infra/cdk/lib/api-stack.ts` for every wired path (11 routes exist total:
health, dashboard, companion×2, rooms×4, library×3 — none of the Auth/account ones) and by grepping the
whole `infra/cdk/lambda` tree for any handler touching `SessionTicket`/`UserKeys`/account deletion (only
the Zod schemas in `packages/shared-types/src/api/account.ts` exist). `AGENT_LOG.md`'s "Prompt for next
agent" names "Digital Twin, Credits, and Continuity" as "the remaining unbuilt `/v1` surface" — that's true
of those three, but this entire row is *also* unbuilt and isn't named anywhere in the handoff. **This
should be added to the unbuilt-surface list** so a future session doesn't miss it when scoping remaining
work — a client can't fetch its own `KEYS` item, open a session ticket, change its password, or self-delete
its account against the new backend today.

### 2.2 The consent gate is currently unsatisfiable for any real user — **FIXED, same day**

> **Update:** built `POST /v1/user/consent` (`infra/cdk/lambda/account/consent.ts`, wired in
> `infra/cdk/lib/api-stack.ts`) — the write path ADR 0004 anticipated but that never existed. It
> `UpdateItem`s the caller's own `PROFILE` item, setting `consentedAt`/`consentVersion`, gated by
> `attribute_exists(pk)` (404s if the profile genuinely doesn't exist yet, which shouldn't happen given the
> post-confirmation trigger, but fails loudly rather than silently creating a profile if it ever does).
> Idempotent — a retry just re-confirms. Verified end to end with a throwaway integration script
> (not committed, same convention as every prior session): before the fix, a fresh `PROFILE` item with
> `consentedAt: null` makes both Companion's message handler and a Rooms command 403 with
> `consent_required`, exactly as this finding predicted; calling the new endpoint sets `consentedAt`, and
> the identical downstream command that 403'd before now succeeds end to end (writes the real `DecisionItem`,
> advances to the next step). 12/12 checks passed. **Deployed to the live account the same session** (with
> explicit go-ahead) — `cdk deploy Dpnr-Api`, all 16 resources `*_COMPLETE`; live-verified afterward with
> `curl -X POST {ApiUrl}/v1/user/consent` (no auth) → `401`, confirming the JWT authorizer is correctly
> attached, and `GET /v1/health` still `200` (no regression to the rest of the API).

**Original finding (2026-08-19), preserved as a record of what was broken before the fix above:**
`infra/cdk/lambda/lib/consent.ts`'s `requireConsent()` throws `403 consent_required` unless
`PROFILE.consentedAt` is set. Traced every write path to that field:

- `infra/cdk/lambda/auth/post-confirmation.ts` creates the `PROFILE` item with `consentedAt: null` — by
  design, per its own doc comment ("Consent starts unset").
- The only endpoint anywhere that ever sets `consentedAt` is `apps/web/src/app/api/user/consent/route.ts`
  — read directly — and it writes to the **old Supabase** `user_profiles` table, not the new DynamoDB
  `PROFILE` item. There is no `/v1/user/consent`-equivalent endpoint against the new backend at all.

**Net effect: a real user signing up through the new Cognito pool today can never satisfy the consent
gate.** `POST /v1/companion/message` — the one handler that actually enforces it — would 403 forever. This
is a genuine, verifiable, unexamined gap: no ADR or AGENT_LOG entry flags it, and it would silently block
the very first real Companion interaction the moment the frontend is pointed at the live API.

### 2.3 Digital Twin & Credits — Twin done (Session 10), Credits ledger now real too (Session 11)

`packages/shared-types/src/dynamo/twin.ts` (`TwinSignalItemSchema`, `RoadmapItemSchema`) is fully specified
and Twin itself is real (Session 10, see §1's row 1). **Credits is no longer schema-only**: `lib/credits.ts`
has `grantCredits` (used by the Cognito post-confirmation trigger to grant a starter Beta Trial balance —
`STARTER_TRIAL_CREDITS = 50`, an unconfirmed placeholder, not a real pricing decision) and `consumeCredits`
(an atomic `ConditionExpression: balance >= amount` deduction). **Updated Session 18**: `consumeCredits` is
now actually wired in — `rooms/command.ts` charges 1 credit per Room `REFINE` action, `companion/message.ts`
charges 1 credit per real Companion reply (onboarding stays free) — both live-verified end to end, including
the real `402 credits_exhausted` path and its new `CreditsExhaustedModal`. `library/topic-detail.ts` was not
included in that decision (only Rooms/Companion were) and still doesn't charge. `GET /v1/credits` and `GET /v1/plans` are
built and live-verified against the real deployed API and the real (now-seeded) `dpnr-plans-catalog` table.
**Updated Session 18, part 2**: `POST /v1/credits/purchase` and the `POST /v1/webhooks/payment` Grow callback
are now built (`credits/initiate-purchase.ts`/`credits/grow-webhook.ts`, ADR 0008) but NOT deployed as of
this update, and not launch-ready even once deployed — no real Grow credentials exist, several response-shape
details are unconfirmed against a real sandbox transaction, and (a security-review finding) the webhook
never grants credits itself; a human must run `approve-pending-purchase.ts` after manually confirming each
transaction in Grow's own dashboard, since Grow's real API has no signature and no verification endpoint
was found in public docs. Roadmap
(`RoadmapItemSchema`) is still fully unbuilt; `dashboard/handler.ts` correctly degrades to `roadmap: null`
when it doesn't exist.

### 2.4 Every AI surface now calls real Bedrock — Companion (Session 12) was the last one stubbed

**Updated Session 10**: `lib/model-call.ts` (renamed from `lib/model-call-stub.ts`) now makes a real
Bedrock Converse call — forced tool-use when a Prompt Registry entry has an `outputSchema`, plain text
otherwise, per ADR 0005. This is the shared call used by every Decision Room step, Mirror Room step, and
Library's `topic-detail.ts` personalization. Live-verified: a direct script call against real Bedrock for
both calling conventions, plus an actual browser session through Decision Room's `NAME_DECISION` and
`MAP_OPTIONS` steps against the deployed `Dpnr-Api` stack, returning real generated text/JSON, not stub
text. `RoomsCommandFn` and `LibraryTopicDetailFn` both got a scoped `bedrock:InvokeModel`/
`InvokeModelWithResponseStream` IAM grant and a timeout bump (3s default → 29s) to accommodate it.

**Updated Session 12**: Companion (`companion/message.ts`) is no longer stubbed either — a new `companion`
Prompt Registry domain (`respond`) calls the same shared `lib/model-call.ts`, with a structured routing
directive (`open_room`/`open_dashboard`/`open_library_topic`/`none`) grounded in the live Library catalog so
it can never name a topic slug that doesn't exist. `companion/model-stub.ts` deleted. Live-verified against
the real deployed API with a throwaway user: a decision-style message correctly routed to Decision Room, a
commitments question routed to the exact real Library topic, and CloudWatch logs showed zero errors — see
`AGENT_LOG.md` Session 12. **Nothing in this product is still on the model stub** — every prompt-driven
feature (Decision Room, Mirror Room, Library, Twin extraction, Daily Card, Weekly Recap, Companion) now
calls real Bedrock.

### 2.5 `SessionSummaryItem` had existed since early sessions but nothing ever wrote one — **FIXED, Session 11 part 2**

`dynamo/session.ts`'s `SessionSummaryItemSchema` (`SESSION#<id>#SUMMARY`) was schema-complete from an early
session onward, but no handler anywhere ever `PutCommand`'d one — Session 10's Twin-signal extraction
(`rooms/twin-signals.ts`) builds a plain-text summary in memory purely to feed the extraction prompt, then
discards it, never persisting it in the shape the schema (and `MVP_ARCHITECTURE.md` §5.7/§6's own pipeline
description) anticipated. This blocked Daily Card/Weekly Recap entirely, since both are supposed to read
real stored session summaries. Fixed by adding `persistSessionSummary()` alongside
`extractCandidateSignals()` in the same file, called from both rooms' `COMMITMENT` steps right after
extraction — same summary text already computed, no new AI call. Live-verified via `aws dynamodb query`:
confirmed a real `SESSION#<id>#SUMMARY` item now exists with the actual composed summary text and the real
Twin-signal ids it's linked to, not just that the code compiles.

---

## 3. Divergences from source-document vision

### 3.1 No graph database anywhere — **deliberate, still valid, re-confirmed independently by three sources**

The presentation PDF (5 pages, corrected count — see §0) describes, across pages 1–3 and 5, an
individual-person graph database cross-linked to a scientific-psychology knowledge-graph database, with
the explicit rationale (page 1, verbatim): *"Psychology contains many cross-cutting interconnections" →
"Therefore, a graph database is suitable."* Page 5 elaborates a **"Harness"** framework: a fixed,
untouched LLM core wrapped by six orchestration components (Context, Generation, Output, Orchestration,
Memory, Tools), each specialized via its own training dataset for one of two extraction tasks — personal
dialogue → individual graph DB, scientific literature → psychology knowledge graph DB. The explicit framing
is that this avoids LLM hallucination risk by grounding output in structured graph data.

This is independently downgraded to optional by two other sources, not just one:
- **MVP Build Spec Appendix B** (the authoritative doc): *"Personal graph / structured person model — Use
  structured Digital Twin signals, provenance, confidence, timestamps and confirmation state. Graph
  storage is optional; the product contract matters more than the database technology."* Its own
  "Recommended Build Stack" names DynamoDB as the target, and an explicit adoption rule governs the whole
  appendix: anything appearing only in the reference material "must be treated as optional until the DPNR
  team explicitly decides to adopt it."
- **`MVP_ARCHITECTURE.md`** §2.1 and §10 make the same call for a structural reason (everything fits one
  per-user partition, scoped by key not by new tables) and explicitly lists the graph DB under "What NOT to
  build for this MVP."

Code confirms the outcome: `TwinSignalItemSchema` is flat — `domain`/`status`/`confidence`/`source` fields,
no relational or edge data, no graph store anywhere in `infra/cdk`.

**Judgment: this was never an unexamined gap.** It's a decision made once (Session 1), stated in the
authoritative spec's own terms, restated architecturally, and holding up under code inspection three
independent ways. Nothing found this session should reopen it.

### 3.2 "Mobile Capsule of a Digital Identity" — **deliberate scoping decision, still valid; the stale-code issue found underneath it is fixed**

> **Update (Session 12, documentation-only — this audit wasn't re-run, just corrected against a fact
> Session 10 part 3 already established)**: the "smaller issue" below, as originally written, is now stale.
> Session 10 part 3 (`docs/AGENT_LOG.md`) deleted the old Supabase-only `apps/web/src/app/api/user/export/route.ts`
> entirely and replaced it with a real `GET /v1/user/export` Lambda (`infra/cdk/lambda/account/export.ts`)
> that queries the caller's whole `USER#<id>` partition in DynamoDB and decrypts every `[ENCRYPTED]`-shaped
> field — i.e. it already covers Companion messages, Room sessions, and Digital Twin signals, not just the
> old Supabase tables. This document simply wasn't updated to reflect that fix at the time. Preserved below
> for history; the "data-completeness bug" it describes no longer exists.

PDF page 2 frames the capsule as a full personal graph DB the user owns and can move between storage
backends. The MVP Build Spec frames it more narrowly and as a **deferral, not a permanent exclusion**:
*"Encrypted / portable personal data concept — Maintain privacy-first architecture and user control.
Portability is a future capability unless required for the Beta MVP."* `MVP_ARCHITECTURE.md` §10 lists it
under "What NOT to build for this MVP," consistent with that framing.

**Original finding (2026-08-19), preserved for context, now stale per the update above**: the only real
export code was `apps/web/src/app/api/user/export/route.ts` — a plaintext, unencrypted GDPR JSON dump, with
no capsule format and no import path, which matched the "not required for MVP" framing exactly, but queried
**only the old Supabase schema** (`user_profiles`, `decisions`, `token_usage`) and would have silently
omitted a real user's Companion messages, Mirror Room sessions, or Digital Twin signals from an export
request.

**Judgment: the capsule deferral itself is deliberate and still valid.** The export-route staleness
underneath it was a separate, smaller, real gap — already closed the same day this audit found it (Session
10 part 3), this document just hadn't caught up to say so.

### 3.3 The never-before-reviewed SRS is stale and superseded — recommend marking it as such

`Software Requirements Specification DPNR.docx` (and its faithful `.md` conversion) describes an entirely
different, ~18-months-older product concept (meeting-log dates Jan–Feb 2025): a cinematic,
gamified onboarding, a **fixed 9-type Enneagram-style persona classification** (`PersonType1`…
`PersonaType9`), and a **PostgreSQL + Clickhouse + Sequelize + Express** backend on AWS's Israel region —
none of which is referenced by, or compatible with, the current MVP Build Spec or `MVP_ARCHITECTURE.md`.
Its central mechanic directly **contradicts** the current spec's explicit intelligence rule: *"Never
diagnose, label or define the user as a fixed type"* (and "Predictive personality labeling" is explicitly
listed as not required for the MVP). A repo-wide grep for `PersonaType|Enneagram|Clickhouse|PersonType`
turned up zero matches — none of this old concept ever made it into code.

The second `.md` sibling (`... DPNR (1).md`) additionally prepends ~177 lines of unrelated,
Perplexity-chatbot-generated content (homomorphic encryption, blockchain-immutable audit logs, EU
data-residency sharding, NEO-PI-R psychometric validation) appended to the document roughly 2 hours after
the original was authored. This content has no traceable authority, isn't referenced by any current spec or
architecture doc, and sits in a gray zone by virtue of living inside a file literally named as a
requirements spec.

**Judgment: not a live requirement, and not something this audit should silently discard either** — it's
a real historical artifact that could confuse a future session into thinking there's an unreconciled
requirement here. Recommend the user either (a) explicitly mark both files as superseded/historical in
`docs/` (e.g., a one-line note or moving them out of the active document set), or (b) confirm they should
just be ignored going forward. Not treated as settled here since deciding what happens to source documents
outside the repo isn't this audit's call to make unilaterally.

### 3.4 The whole-product "load-based cost model successor" — confirmed genuinely not built (not a stale doc reference)

`docs/AWS_SETUP.md` (line 102) says: *"Re-run the load-based cost model (`aws-migration-plan.html` §12, or
its successor once rebuilt for the whole product) whenever a new component goes live."* This session
checked whether `dpnr-architecture-cost.html` is that successor.

All three copies on disk (`dpnr-architecture-cost.html`, `(1).html`, `(2).html`) are **byte-for-byte
identical** (same MD5, confirmed via `diff` and checksum) — despite different download timestamps
(Jul 14 / Jul 15 / Aug 17), there is no content evolution across them; they're the same artifact re-saved
three times.

The file itself is **not** the whole-product successor:
- It's scoped to a generic "DPNR Backend" auth/crypto skeleton (Cognito, two Lambdas — `AddUser`,
  `PutSessionKey` — three tables `Users`/`UserSecrets`/`SessionSecrets`, two KMS keys), not the
  Companion/Rooms/Twin/Library product `MVP_ARCHITECTURE.md` describes.
- It has **no Bedrock/LLM cost line at all** ("LLM provider: not estimated"), while the migration plan's
  own §12 — the model it would need to supersede — treats Bedrock token cost as the dominant variable cost
  driver. A successor that omits the largest cost line of what it replaces isn't a successor.
- Its pricing snapshot (July 14, 2026) actually **predates** the migration plan's own rev. 10 (July
  19–20, 2026) that contains §12 — it isn't even chronologically later.

**Judgment: `AWS_SETUP.md`'s self-assessment is correct, not stale.** The whole-product cost model
successor is a genuinely open TODO, correctly self-identified. `dpnr-architecture-cost.html` should not be
treated as satisfying it — it reads instead as an earlier, narrower, parallel snapshot of the same
auth/crypto bootstrap work described in the migration plan's near-term execution plan.

---

## 4. New findings this session (not previously documented anywhere)

### 4.1 Consent gate has no coverage for Decision Room or Mirror Room — **FIXED, same day**

> **Update:** `requireConsent(ddb, TABLE_NAME, userId)` is now called in `rooms/command.ts`, right after
> parsing the request body and before touching the flow registry — same placement convention as
> Companion's `message.ts`. This was a judgment call made without a formal round-trip to the user first
> (the spec's own quoted language left little ambiguity, the change is a few lines, and it's trivially
> reversible) — flagged clearly in the handoff in case there's a reason Rooms were meant to be exempt that
> this audit didn't surface. Verified as part of the same integration script as §2.2's fix.

**Original finding (2026-08-19), preserved for context:** `infra/cdk/lambda/rooms/command.ts` — the single
flow-engine Lambda shared by both Rooms — never called `requireConsent()`. Only `companion/message.ts` did.
Read `consent.ts`'s own doc comment: the gate exists because spec §8 requires *"collecting consent before
any personal-content processing happens."* Decision Room and especially Mirror Room (situation, automatic
reaction, body response, recurring pattern) process exactly the kind of content this rule targets —
arguably more sensitive than a Companion chat turn in Mirror Room's case. No ADR or AGENT_LOG entry
documented this as a deliberate exemption.

### 4.2 The consent gate is currently unsatisfiable — **FIXED, same day** (detailed in §2.2)

Restated here as a top-level finding because of its severity: this single gap, once the frontend is wired
up, would have made Companion (and now, correctly, Rooms too — see §4.1) completely unusable for any real
signup — not a partial degradation, a hard block with no code path around it. See §2.2 for the fix and its
verification.

### 4.3 Live deployment runs with the plaintext crypto stub active by default — **decision made, same day: ADR 0007**

> **Update:** the user chose, of three options presented, to accept this via a scoped, documented exception
> rather than a technical access-restriction gate (which was also shown to be more complex than it first
> looks — see below) or silent acceptance. **ADR 0007** now governs this: plaintext-stub use against the
> live account is accepted for internal/founder testing only, ending automatically the moment a non-founder
> user is invited or Phase 6 ships, whichever comes first — re-opening this decision, not silently
> extending it, is required before either boundary is crossed. This reconciles the interim state with ADR
> 0001 rather than contradicting it (ADR 0001's actual *launch* commitment is untouched).
>
> One technical nuance surfaced while scoping this: the naive fix — require `isProduction: true` before any
> personal-content route works — doesn't just block real users, it makes `crypto-stub.ts` throw
> unconditionally for everyone, since that flag is designed to make a real-data deploy fail loudly, not to
> gate access tiers. Real encryption doesn't exist yet (Phase 6 not started), so there is currently no way
> to run Companion or either Room against the live account *at all*, for anyone, without the stub active.
> A real access-restriction gate (e.g., a Cognito allow-list group) remains a legitimate future improvement
> — ADR 0007 explicitly keeps this technical gap open as a tracking item even though the policy question is
> now resolved.

**Original finding (2026-08-19), preserved for context:**

Traced end to end: `crypto-stub.ts`'s `assertStubAcknowledged()` requires
`PLAINTEXT_CRYPTO_STUB_ACK==='true'`; `api-stack.ts` sets that env var to `props.isProduction ? 'false' :
'true'`; `bin/dpnr.ts` reads `isProduction` from CDK context, defaulting to `false` when not explicitly
passed (`app.node.tryGetContext('isProduction') === true`). Session 6's actual deploy command
(`cdk deploy Dpnr-Data Dpnr-Auth Dpnr-Api --require-approval never`, per `AGENT_LOG.md`) never passed
`--context isProduction=true` — reproduced this session by running `cdk synth` with no context and getting
the same default. **The real, live account today has the plaintext stub active.** No real user data exists
yet (`aws dynamodb scan --table-name dpnr-application --select COUNT` → 0 items, verified this session), so
nothing has actually been stored in plaintext — but there is currently no deploy-time control that would
prevent it the moment any endpoint is exercised by a real client (e.g., as soon as the Decision Room
frontend is pointed at the live API per the "Prompt for next agent" priority-1 task).

**Needs a decision**: this sits directly under ADR 0001's "ship full zero-knowledge encryption from day
one" commitment, which doesn't address the operational gap between "the code allows plaintext during
Phases 1–5" and "the live account currently has no gate stopping that plaintext path from accepting real
traffic today." Options include: an explicit pre-launch check that blocks any route real users can reach
until `isProduction=true`, or a documented, time-boxed exception if the plan is to onboard beta users before
Phase 6 lands (which would need its own ADR, since it would contradict 0001's literal wording).

### 4.4 Auth/account API surface entirely unbuilt (detailed in §2.1)

### 4.5 Zero committed tests exist anywhere — a cross-cutting verification-methodology caveat

Confirmed: no `.test.ts`, `.spec.ts`, `__tests__` directory, or `test` script in any `package.json`
anywhere in the repo. Every session's "N/N checks passed" claim in `AGENT_LOG.md` (Session 3 through 6)
refers to an integration test explicitly described in the log as "throwaway, not committed." This means:

- None of those historical verification runs are reproducible today — they can't be re-run to confirm
  they'd still pass, only trusted as a narrative claim about what happened once.
- This audit's own re-verification was necessarily structural (typecheck/synth/lint, all independently
  re-run and confirmed green this session) plus live infrastructure checks (curl, DynamoDB, CloudFormation,
  Cognito, Budgets — all independently re-run and confirmed matching the log's claims) — never a re-run of
  a prior session's actual functional test.
- Every historical claim checked this session held up with no discrepancies. This isn't a finding that
  anything was falsified — it's a methodology note: "verified" in this project's session logs means
  "a throwaway script passed once, in that session," which is weaker than the word usually implies, and
  should be read that way by future sessions and this document's readers alike.

**Not flagged as urgent to fix** — building a committed test suite is a legitimate scope decision for a
future session, not something this audit is recommending unilaterally, since the project has operated this
way by design since Session 1 (no CI, agent-only development, "small working increments" over process
overhead). Noted here so the weight of "verified" claims is calibrated correctly going forward.

### 4.6 Neither of the spec's two Golden Paths (§2) is actually satisfiable end to end — found 2026-08-21, Session 12 part 2

> **Update (Session 12 part 3, same day)**: scoped the fix into four workstreams (A: port `dashboard/page.tsx`
> off Supabase onto the real `GET /v1/dashboard`; B: build a Companion chat UI; C: proactive Companion
> continuation + real cross-session context restoration; D: Companion-led onboarding + Roadmap generation —
> its own dedicated product-design pass, not a quick add-on). User chose **A only** this session, and
> confirmed Companion should become the actual post-login default landing page (replacing Dashboard) once B
> is built — recorded for whoever builds B, not acted on yet since B hasn't started.
>
> **A is done, deployed, and live-verified.** `dashboard/page.tsx` now calls the real `GET /v1/dashboard`
> (no more `lib/supabase/client`/`getDecisions()`/`getTokenUsage()`); `dashboard/handler.ts` was extended to
> also read today's Daily Card and the soonest-due open commitment, filling `continuityCue` with real content
> for the first time instead of always being `null` in practice. Verified with a real fresh signup: Credits
> balance (50) rendered correctly from the live ledger, the Roadmap empty-state rendered honestly (still
> `null` — D not built), and after creating one real commitment via the live API, the Dashboard correctly
> surfaced it as a `commitment`-kind continuity cue after redeploying `DashboardFn`. Deliberately dropped the
> old page's Supabase-era "list every past decision" section — no `/v1` equivalent exists yet; flagged
> in-code as an honest gap for a future session, not silently regressed. CloudWatch confirmed zero errors;
> Cognito user + all 4 DynamoDB rows cleaned up afterward, partition count confirmed 0.
>
> **Update (Session 13, same day)**: workstream B is now done, deployed (no backend change was needed — this
> was `apps/web` only), and live-verified. `apps/web/src/app/companion/page.tsx` is a real chat surface
> calling `POST /v1/companion/message`/`GET /v1/companion/context` verbatim, rendering whatever routing
> directive comes back as an actionable card (`components/companion/DirectiveCard.tsx`) rather than
> auto-navigating. The default post-login landing page is now `/companion`, not `/dashboard` — the switch the
> user confirmed in this same session's part 3, executed now that B exists to route to; Dashboard itself is
> unchanged and stays one tap away. Verified with a real throwaway signup against the live API: a real
> Bedrock reply plus an `open_room` directive that correctly navigated to `/decision/new`, and a real
> `open_library_topic` directive that correctly expanded the real topic content inline (see below for why
> inline, not a real Library page). `GET /v1/companion/context` correctly resumed history on reload. Zero
> CloudWatch errors during the test window; throwaway user fully cleaned up.
>
> **A real gap `open_library_topic` surfaced, not fixed**: there is still no Library frontend section at all
> — no `/library` route of any kind. Rather than block B on building one (out of scope for "build a Companion
> chat surface"), the directive card fetches `GET /v1/library/topics/{slug}` and expands the topic inline in
> the chat itself. Flagged for whoever eventually gives Library its own real section — that work should
> probably absorb or replace this inline card, not leave two ways to read a topic.
>
> **Update (Session 14, same day)**: workstream C is now also done, deployed, and live-verified — both
> sub-pieces. `companion/message.ts` now pulls the caller's confirmed Digital Twin signals into every reply
> (a new `confirmedSignals` variable on `companion/respond`, via the same `gatherContinuityContext` read the
> Continuity composers already use) — verified with a real confirmed signal inserted directly, producing a
> reply that naturally acknowledged the pattern without stating it as a diagnosis. `companion/context.ts` now
> synthesizes a real "welcome back" opener (a new, plain-text `companion/continuation` prompt) when the gap
> since the last stored message meets `CONTINUATION_GAP_HOURS` (3, an unconfirmed placeholder), and persists
> it as a genuine assistant turn — verified by backdating a real message's `createdAt` by 4 hours and
> reloading `/companion`, which produced a specific, correctly-grounded continuation (confirmed as a real new
> DynamoDB item, not just rendered client-side) and did not duplicate on a second immediate reload. Required
> no frontend change at all — the Companion page (Session 13) already renders whatever's in message history.
>
> **Update (Session 15 part 1, same day): workstream D — the last one — is now done, deployed, and
> live-verified.** A new `companion/onboard` prompt (forced tool-use) runs instead of `respond` for any caller
> without a Roadmap yet, asking one question at a time until it sets `readyForRoadmap`, at which point
> `message.ts` writes a real `RoadmapItem` plus two Twin signals (`current_focus`/`direction`) — both written
> already `confirmed`, a deliberate exception to the general trust rule, confirmed with the user before
> building rather than decided unilaterally (see `AGENT_LOG.md` Session 15 part 1 for the two other judgment
> calls put to the user the same way). `context.ts` synthesizes the very first onboarding question the instant
> a brand-new user opens Companion, same zero-frontend-change mechanism Session 14 built. Live-verified with
> a real signup: a real, specific, non-generic Roadmap and two real confirmed signals were written after two
> exchanges, and the very next message correctly resumed normal `respond` behavior with a real `open_room`
> directive — proving the *handoff* works, not just each half in isolation. Zero CloudWatch errors; fully
> cleaned up.
>
> **Update (Session 15 part 2, same day, at the user's explicit request — "review the golden path... to
> confirm that all items are planned")**: a full re-walk of both Golden Paths plus the Core MVP Scope table
> (§3), done as its own dedicated task, not folded into D's own close-out. **Both Golden Paths are now
> genuinely satisfiable end to end** — see §4.7 for the complete table-by-table result, including the three
> real, previously-untracked gaps this re-walk surfaced against the Core MVP Scope table specifically (a real
> session timer, soft-stopping cues, and Beta labeling at Welcome/Trial) and the two real, already-flagged
> gaps it reconnects to Golden Path B directly (no Library/Twin frontend, and the Roadmap is write-once).
> None of these five are a regression in A/B/C/D — they were never any workstream's own scope, which is
> exactly the kind of boundary a re-walk like this exists to find.

The MVP spec states plainly: *"These are the two journeys that must work end-to-end before the MVP is
considered usable."* Neither one is, today — checked by reading the actual frontend code, not just the
backend routes this document otherwise tracks. This is a materially different (and larger) gap than "Auth
API surface unbuilt" (§2.1) or any single missing endpoint — it's the product's two defining user journeys,
and the backend-completeness view this document has used everywhere else understates how far from working
they are.

**Golden Path A (first-time user), broken at step 5 of 14**: "Companion-led conversational onboarding — use
Main Chat as the onboarding interface." No onboarding conversation flow exists anywhere in the code. Nothing
infers an initial focus/theme/direction (step 6), nothing generates a first My Evolution Map from onboarding
specifically (step 7 — Twin signals are only ever written from a completed Room session, never from
onboarding, since there is no onboarding to extract from), and Roadmap generation (step 8) doesn't exist at
all — confirmed by `dashboard/handler.ts`'s own comment, "Beta Trial/Credits ledger... isn't built yet" is
now stale (Credits *is* real, Session 11) but the adjacent Roadmap gap it was describing is still accurate.
Step 9 ("keep user in Main Chat by default... Dashboard one tap away") fails structurally: there is no
Companion frontend page at all — no route, no chat UI, not even a client helper function
(`apps/web/src/lib/api/v1-client.ts` has zero Companion calls, confirmed by grep). The app's actual entry
point, `apps/web/src/app/page.tsx`, is a Decision-Room-first marketing page ("Start a Decision" / "Sign In")
— the direct opposite of the spec's own "Core Experience Principle — Gate 1 First."

**Golden Path B (returning user), broken at steps 2–4 of 6**: step 2 requires "the Companion opens with a
relevant continuation" — a proactive greeting. `companion/message.ts` is purely reactive: `POST
/v1/companion/message` only ever replies to a message the user sends, and `GET /v1/companion/context`
returns raw stored history with no synthesized "welcome back" summary. Step 3 requires surfacing "a Daily
Card, relevant continuation, upcoming commitment, Roadmap cue... only when useful" — `dashboard/handler.ts`
(lines 57–65) still has a code comment reading "Daily Card / commitments... don't exist yet," which is now
false (both were built in Session 11) but nobody revisited this handler afterward: `continuityCue` only ever
derives from the still-unbuilt Roadmap, so it is always `null` in practice regardless of what a user has
actually done. Step 4 requires Companion/Dashboard/Twin/Rooms/Library to be "directly accessible" with
"Dashboard [as] the primary navigation hub" — **the more severe half of this finding**:
`apps/web/src/app/dashboard/page.tsx` was never migrated off the pre-migration Supabase stack at all. It
still calls `createClient()` from `lib/supabase/client` and `getDecisions()`/`getTokenUsage()` against the
old Supabase tables, shows a "Monthly AI usage / tokens" bar from the retired tier-cap model (superseded by
the real Credits ledger, per `MVP_ARCHITECTURE.md` §5.3's own migration table), and links only to Decision
Room and Mirror Room. No Companion, Library, Digital Twin, Credits balance, Roadmap, Daily Card, or
Commitments appear anywhere on it. This is a real regression against this document's own prior confidence:
`docs/AGENT_LOG.md` Session 10 part 3 ported `/account` and `/pricing` to the real `/v1` backend explicitly,
and no session's log entry ever claims to have touched `/dashboard`'s frontend — the real `GET /v1/dashboard`
Lambda (built early, confirmed real and live) has apparently never had a real caller. This should have been
caught earlier; it wasn't, because every session's own verification (this document's §4.5 caveat included)
checked backend routes and Lambda behavior, never asked "does the actual shipped page call this."

**Judgment**: not a single missing feature but a coherence gap — enough of Gate 1's individual backend
pieces are real (Companion's Bedrock call, Twin, Credits, Daily Card, Dashboard's Lambda) that it would be
easy to read this document's phase table as "Slice 1 is mostly done." The two Golden Paths say otherwise:
today, a real user cannot experience Main-Chat-first onboarding, a proactive Companion continuation, or a
Dashboard that reflects any of Slice 1's own real backend work. Scoping the fix is this session's next step
— tracked in `AGENT_LOG.md`'s handoff, not decided unilaterally here. **(Historical — see §4.6's own Session
15 update above and §4.7 below: as of Session 15, all four workstreams that fix this are done, and both
Golden Paths are now genuinely satisfiable end to end.)**

### 4.7 Golden Path + Core MVP Scope re-walk — Session 15 part 2, at the user's explicit request

Requested directly: *"review the golden path for first-time and returning users, as well as the Core MVP, to
confirm that all items are planned."* Read the spec's §2 (Golden Paths) and §3 (Core MVP Scope) in full again
from the actual docx, then checked every row against the real, current code — grepping for behavior, not
just checking a route exists — rather than trusting this document's own prior summaries of either section.

**Golden Path A (first-time user) — all 14 steps, checked individually:**

| # | Step | Status |
|---|---|---|
| 1 | Welcome / explain Beta simply | **Soft gap** — no dedicated welcome screen; see the Beta-labeling finding below |
| 2 | Create account or sign in | Done (Cognito) |
| 3 | Consent | Done (`POST /v1/user/consent`, Session 7) |
| 4 | Activate Beta Trial, starter credits, no payment | Done (Session 11, `STARTER_TRIAL_CREDITS`) |
| 5 | Companion-led conversational onboarding | **Done (Session 15)** |
| 6 | Initial orientation: focus, theme, direction | **Done (Session 15)** |
| 7 | Generate My Evolution Map v1 | Real signal data exists (Session 15); **no dedicated visual view** — spec explicitly allows this (visual form "intentionally iterative," not MVP-required) |
| 8 | Generate initial Roadmap | **Done (Session 15)**, partially rendered on Dashboard (`currentFocus`/`direction`; `theme`/`suggestedSpaces` not yet shown there) |
| 9 | Enter Gate 1, Companion default, Dashboard one tap away | Done (Session 13) |
| 10 | Companion recommends/opens a next action | Done (`respond`'s `directiveKind`, live-verified) |
| 11 | Complete a meaningful session in a Room or Companion | Done (Rooms both real) |
| 12 | Receive a reflection/insight | Done (Room session summaries) |
| 13 | Update Digital Twin signals | Done (Room completion, Session 10; onboarding, Session 15) |
| 14 | Return later, continuity across Companion + Dashboard | Done (Session 14 continuation; Session 12 part 3 Dashboard cue) |

**Genuinely satisfiable end to end for the first time**, modulo step 1's soft gap and step 7's spec-sanctioned missing visualization.

**Golden Path B (returning user) — all 6 steps, checked individually:**

| # | Step | Status |
|---|---|---|
| 1 | Authenticate, restore context | Done |
| 2 | Companion opens with a relevant continuation | Done (Session 14) |
| 3 | Surface Daily Card/continuation/commitment/Roadmap cue only when useful | Done (Dashboard `continuityCue`, Session 12 part 3) |
| 4 | Companion/Dashboard/Twin/Mirror/Decision/Library directly accessible, Dashboard as primary hub | **Real gap** — Library and Digital Twin/My Evolution Map both still have zero frontend |
| 5 | Update user model and Roadmap only when evidence justifies it | **Half-built** — Twin signals do get added (Rooms, onboarding); the Roadmap itself is write-once, never revised after onboarding |
| 6 | Preserve continuity, don't re-ask what's known | Done (`confirmedSignals` in `respond`, `continuation` prompt) |

Two real, previously-unexamined gaps (steps 4, 5) — neither was ever any of A/B/C/D's own scope, so this isn't
a regression; it's exactly the kind of boundary a re-walk like this exists to find. Both added to
`AGENT_LOG.md`'s backlog as their own future items, not silently folded into D's close-out.

**Core MVP Scope (§3) — all 14 "Required" rows, checked individually:**

| Capability | Status |
|---|---|
| Account, auth, consent, deletion | Done |
| First-entry welcome + conversational onboarding | Onboarding done (Session 15); welcome/Beta-explanation half is the same soft gap as Golden Path A step 1 |
| Gate 1 (Companion + Dashboard combined) | Done |
| Dashboard/Roadmap as living system hub | Done |
| My Evolution Map v1 (Digital Twin-backed) | Signal data real; **no frontend** (same gap as Golden Path B step 4) |
| Mirror Room v1 | Done |
| Decision Room v1 | Done |
| Content Library (taxonomy + AI explanation + personalization) | Backend done; **no frontend** (same gap as Golden Path B step 4) |
| Daily Card | Done (Session 11) |
| Weekly Recap | Done (Session 11) |
| Growth / continuity indicators on Dashboard | Soft/interpretive — `continuityCue` reasonably covers "continuity"; nothing distinctly labeled "growth," but the spec never elaborates this row beyond one line, so not treated as a confirmed gap |
| In-app session timer, soft stopping cues, anti-addiction rules | **Real gap, newly found** — see below |
| Reminders for commitments/review dates | Not built — already one of the three standing open decisions (§6), not a new finding |
| Privacy-first storage / encryption path | Genuinely planned (ADR 0001, ADR 0007) — Phase 6 hasn't landed yet, which this confirms rather than newly finds |
| Beta Trial + Credits | Done (Session 11), modulo the still-unbuilt purchase endpoint (already tracked) |
| Beta labeling across Welcome/Trial + Account/Profile | **Real gap, newly found** — see below |

The 4 "Not required to prove the MVP" rows (calendar integration, predictive personality labeling, hundreds
of content items, complex gamification) were also checked — none have crept into the build; all four
correctly stayed out.

**Two new, previously-untracked findings, confirmed by direct grep, not assumption:**

1. **No real in-app session timer.** `apps/web/src/components/decision/StepShell.tsx` and
   `.../mirror/MirrorStepShell.tsx` both take a `minutesLeft` prop with a static default (`27` and `12`
   respectively) that is never decremented anywhere — no `setInterval`, no elapsed-time tracking of any
   kind, just a fixed label rendered once. **"Soft stopping cues"** (spec §6: *"After sustained intensive
   reflection, offer to integrate, stop, or continue later"*) have zero implementation anywhere in the
   codebase — grepped directly for the concept, no hits. The broader anti-addiction *principle* (no streaks,
   no infinite feed, no variable rewards) does genuinely hold — verified separately in Sessions 11 and 14 —
   it is specifically the timer and the stopping-cue behavior that are missing.
2. **Beta labeling doesn't reach the Welcome/Trial moment itself.** `/account`, `/dashboard`, and `/pricing`
   all show a Beta badge (grep-confirmed); `/signup` and the root marketing page
   (`apps/web/src/app/page.tsx`) show none at all (also grep-confirmed, zero matches). This is the same gap
   as Golden Path A step 1 from a different angle — neither the actual welcome moment nor the trial-activation
   moment ever tells the person this is Beta.

**One naming check, resolving a possible ambiguity rather than finding a gap**: "Growth Tracker" appears
exactly once in the entire spec, as one illustrative item inside the Roadmap's own example text (§4,
*"Suggested Spaces: Mirror Room · Content Library · Growth Tracker"*) — it is never defined as a real
capability anywhere else in the document. This confirms `companion/onboard`'s `suggestedSpaces` enum
(Mirror Room / Decision Room / Library only, Session 15 part 1) was right to exclude it — there is no real
"Growth Tracker" feature for a suggestion to ever point to.

**Judgment**: this re-walk changes the phase table's own framing (§1) — both Golden Paths are now genuinely,
not just backend-wise, satisfiable end to end. It does not mean the product is "done": five real gaps
survive the re-walk (session timer, soft-stopping cues, Beta labeling at signup, no Library/Twin frontend,
write-once Roadmap), none of them assigned to any prior workstream, all newly logged in `AGENT_LOG.md`'s
backlog rather than silently absorbed into D's close-out.

---

## 5. Live AWS state — this session's independent snapshot (2026-08-19)

All of the following were queried directly against the real account this session, not read from a prior
log entry:

- **Identity**: `arn:aws:iam::346866989957:user/RadBarOn`, account `346866989957`, region `us-east-1`.
- **CloudFormation**: `Dpnr-Data`, `Dpnr-Auth`, `Dpnr-Api`, `CDKToolkit` — all `CREATE_COMPLETE`.
- **DynamoDB tables**: `dpnr-application` (0 items), `dpnr-library-catalog` (12 items), `dpnr-plans-catalog`,
  `dpnr-prompt-registry` (32 items), `dpnr-session-tickets`.
- **API**: `GET /v1/health` → `{"status":"ok","service":"dpnr-api","timestamp":"..."}` (real 200).
  `POST /v1/rooms/decision` with no auth → `401` (JWT authorizer correctly enforced).
- **Cognito**: user pool `dpnr-users` (`us-east-1_EXgRW01Mg`) exists with both `PostConfirmation` and
  `PreTokenGeneration` triggers wired to the expected Lambda ARNs.
- **Budgets**: `dpnr-monthly-dev-budget` ($20/mo) and the pre-existing `My Monthly Cost Budget` ($20/mo)
  both exist.
- **Build health**: `npm run build:shared-types`, `npm run typecheck:cdk`, `npm run synth` (root), and
  `npm run lint` + `npm run build` (apps/web) all ran clean this session with no fixes needed — the
  "never hand off a red build" guardrail is genuinely being honored, not just claimed.

No discrepancies were found between what `AGENT_LOG.md` claims about live AWS state and what's actually
there. This is the first time any of these specific claims has been checked by a session other than the
one that made them.

---

## 6. Consolidated list — needs a product decision

1. ~~**Consent gate coverage** (§4.1)~~ — **done**: wired `requireConsent()` into `rooms/command.ts` the
   same day, as a judgment call (see §4.1's update note) rather than a formal decision round-trip. Reversible
   if there's a reason Rooms should differ from Companion.
2. ~~**Consent gate satisfiability** (§4.2/§2.2)~~ — **done**: `POST /v1/user/consent` built and verified
   (§2.2). Not yet deployed — needs the standing explicit go-ahead before any `cdk deploy`.
3. ~~**Plaintext-stub live-deploy risk** (§4.3)~~ — **decided**: ADR 0007 accepts a scoped, internal-testing-only
   exception with an explicit end condition. The underlying technical gap (no enforced access restriction,
   just a documented boundary) remains open as a lower-priority tracking item — see §4.3's update.
4. **SRS document status** (§3.3): mark the old SRS docx/md files as superseded, or confirm they should be
   ignored — currently ambiguous to a future reader.
5. ~~**Export route data completeness** (§3.2)~~ — **done**: Session 10 part 3 replaced the old
   Supabase-only export route with a real `GET /v1/user/export` covering the whole DynamoDB partition; this
   document just hadn't been updated to say so until Session 12.
6. **Whole-product cost model** (§3.4): schedule rebuilding it once real usage projections exist (e.g.,
   once the Decision Room frontend port gives a first real traffic pattern to model against).
7. **Auth/account API surface** (§2.1/§4.4): confirm this is simply next-in-line unbuilt work, not
   something that was supposed to happen alongside Phase 0.
8. ~~**Neither Golden Path (§2/§4.6) fully works end to end**~~ — **done (Session 15)**: all four workstreams
   (A: Dashboard port, B: Companion frontend, C: proactive continuation + context, D: onboarding + Roadmap
   generation) are built, deployed, and live-verified — see §4.6's Session 15 update. A full re-walk (§4.7)
   confirms both Golden Paths are now genuinely satisfiable end to end, modulo the five items below it
   surfaced — none of them part of any workstream's own scope.
9. **Real in-app session timer + soft-stopping cues** (§4.7, Core MVP Scope, newly found Session 15 part 2):
   `minutesLeft` in both Room step shells is a static default, never an actual countdown; "offer to
   integrate, stop, or continue later" after sustained reflection doesn't exist anywhere. Needs a product
   decision on what "sustained intensive" actually means before building.
10. ~~**Beta labeling at the Welcome/Trial moment**~~ — **done, Session 16**: `/signup` and root now show the
    Beta badge (§4.7, newly found Session 15 part 2, since corrected — this item was stale until Session 17's
    documentation-only pass caught it).
11. ~~**Real Library and Digital Twin/My Evolution Map frontend sections**~~ — **done, Session 16**: `/library`
    + `/library/[slug]` and `/twin` are both real, live-verified frontends now (§4.7 reconnects this to Golden
    Path B step 4 directly; also stale until Session 17 caught it).
12. ~~**A Roadmap-revision mechanism**~~ — **done, Session 16 part 2**: confirming a Twin signal runs a
    conservative `roadmap/revise` check that proposes a revision (never silently rewrites) for the user to
    accept or reject — Golden Path B step 5 fully satisfied, live-verified end to end (also stale until
    Session 17 caught it).

Everything else in this document (no graph DB, no Mobile Capsule, Grow webhook stub, no VPC yet, Library
topics awaiting review) is already a deliberate, documented, still-valid decision — re-confirmed this
session, not re-opened.

**Update, Session 10**: the Grow webhook stub is a bigger gap than "missing signature verification." Pulled
Grow's real developer docs (`developers.grow.business`, formerly Meshulam) and found `apps/web/src/lib/grow.ts`
+ `apps/web/src/app/api/webhooks/grow/route.ts` are built against a **fictional API shape**, not Grow's real
one: no `X-Grow-Signature` header or HMAC scheme exists in their docs at all; the real webhook payloads are
flat (`transactionCode`/`paymentSum`/`webhookKey`/`payerEmail`/etc.) across 10 distinct webhook types
(recurring payment, failed recurring, invoice, POS, paymentLinks, ...), not the `event.type`/
`event.data.{plan_id,customer_id,period_end}` shape the code expects; and Grow's real auth model is
`UserId`/`PageCode`(+`APIKey` for platforms), not the `Bearer $GROW_SECRET_KEY` scheme
`createGrowCheckoutSession` uses against a `/v1/checkout/sessions` endpoint that also doesn't appear in
their docs. A `webhookKey` field embedded in the payload may be the real authenticity mechanism (a static
value configured per-merchant, compared server-side, not a signature) but Grow's own docs never explain it.
**"Implement real HMAC verification" is not achievable as scoped — there's no HMAC scheme to implement.**
A real fix means rebuilding this integration against Grow's actual API from scratch, informed by their real
docs — not a small patch. Presented to the user, who chose to defer entirely rather than disable-and-flag or
research further this session — no code changed. This is also legacy Supabase-billing code the still-unbuilt
Credits ledger (Slice 1) is meant to replace, not port, so a real fix may belong there instead of as a
standalone patch. **Do not re-scope this as "just add HMAC verification" in a future session** — start from
this finding.

**Update, Session 10, part 3**: while building `GET /v1/user/export` (a real GDPR-export endpoint, replacing
the Supabase-only `/api/user/export` route that never worked for Cognito users), found that
`SessionItem.lastResponse` (set by `infra/cdk/lambda/rooms/command.ts` on every command, used for
idempotency-check short-circuiting) stores the **full command response in plaintext** — for a `REFINE`
result this includes real generated content (e.g. a decision's suggested options), not routed through
`stubEncryptField`/`[ENCRYPTED]` like every other content field. Confirmed live: a real export dump showed
`lastResponse.result.title` as cleartext next to properly-decrypted `content` fields from the same item
family. Not something introduced this session — this is how `command.ts` was written back in Session 5 —
and not fixed here (out of scope for the account-audit task; the export endpoint just honestly surfaces
what's actually stored). Flagging for whoever works on Phase 6 encryption: `lastResponse` needs the same
`[ENCRYPTED]` treatment as every other content field, or a documented reason it's exempt.
