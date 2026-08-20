# DPNR — Phase Audit (Ground Truth)

**Written:** 2026-08-19, dedicated audit session (no feature work performed). **Updated same day, follow-up
session:** §2.2/§4.1/§4.2 (the consent-gate findings) are now **fixed**, not just flagged — see the update
notes inline at each section. Everything else in this document is unchanged from the original audit pass.

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
| **1 — Slice 1: Product spine** | §7: account/consent/onboarding, Companion, Dashboard, Digital Twin v1 (data+confirm/reject), Roadmap, Beta Trial+Credits | **Partial — more open than AGENT_LOG's framing suggests** | See §2.1–§2.3 below. Companion/Dashboard handlers are real DynamoDB code; Twin confirm/reject and Credits are schema-only (zero handlers, zero routes); the Auth/account API row (§4 table row 1) is entirely unbuilt; the consent gate is currently unsatisfiable for any real user. |
| **2 — Slice 2: Mirror Room** | §7: flow-engine reuse, new prompt set, candidate Twin updates | **Design settled + backend built; not independently functionally verified this session; not consent-gated** | Code read directly: 6-step flow (`mirror-steps/*.ts`), 2 prompts live-seeded. Design explicitly product-reviewed and approved (AGENT_LOG Session 6) — no longer a draft. Model call still routes through the shared stub (§2.4). `command.ts` has no consent check (§4.3). |
| **3 — Slice 3: Content Library** | §7: catalog table, taxonomy, AI explanation, recommendations | **Reads done and live-seeded; personalization plumbing real but model-stubbed; recommendations honestly empty** | `aws dynamodb scan --table-name dpnr-library-catalog --select COUNT` → 12 items (6 topics × version+alias, matches). `recommendations.ts` read directly — returns `[]` by design, documented why. 6 topics are self-flagged in their own seed file as an unreviewed first draft (still true, no review has happened). |
| **4 — Slice 4: Decision Room port** | §5.3/§7: port 7-step+summary UI to `/v1`; swap AI to Bedrock | **Done and live-verified end to end (guided-creation flow only — post-completion review page still deferred)** | `apps/web/src/app/decision/new/page.tsx` + all 7 step components + 4 post-flow/summary screens now call `submitRoomCommand`/`getDecisionFull`, zero `lib/supabase/decisions.ts` calls left in that flow. Real browser session driven through all 14 steps against the live API with a throwaway Cognito user, cross-checked against `aws dynamodb get-item`/`query` at multiple points (SessionItem reached `status:'completed'`/`currentStepId:'COMMITMENT'`; outcome's reflection carries the real commitment text). `session_version_conflict` resync and `session_completed` redirect both fired for real during this pass, not just unit-tested. AI calls still route through the model stub (§2.4) — unchanged by this session. |
| **5 — Slice 5: Continuity layer** | §7: Daily Card, Weekly Recap, commitments/reminders, EventBridge pipeline | **Not started** | Schemas exist (`dynamo/continuity.ts`); zero Lambda handlers, zero CDK routes, zero EventBridge rules anywhere in `infra/cdk/lib`. No `session.completed` event is even published by `rooms/command.ts` — sessions complete silently today, so there is nothing yet for a pipeline to consume even once built. |
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

### 2.3 Digital Twin & Credits: confirmed schema-only

`packages/shared-types/src/dynamo/twin.ts` (`TwinSignalItemSchema`, `RoadmapItemSchema`) and
`.../account.ts` (`CreditsBalanceItemSchema`, `CreditsTransactionItemSchema`) are fully specified. Zero
Lambda handlers or CDK routes exist for either. `dashboard/handler.ts` (read directly) correctly degrades
to `roadmap: null` / `creditsBalance: 0` when these items don't exist — this part is honest, not broken.
Accurately reflected as not-started in `AGENT_LOG.md`.

### 2.4 Every AI-driven feature is still model-stubbed, even where "wired"

Companion (`companion/model-stub.ts`), Decision Room + Mirror Room + Library personalization
(`lib/model-call-stub.ts`, shared) all route through named, clearly-labeled canned-text stubs — confirmed
by reading each file directly. **This is true even though Session 6 verified real Bedrock access works**
(`aws bedrock-runtime converse` succeeded with the correct inference-profile model id). Live Bedrock access
being confirmed and the product code actually calling it are two different facts, and only the first is
true today — worth being precise about this distinction, since "Bedrock is confirmed working" (accurate)
could otherwise be misread as "the product uses Bedrock" (not yet true anywhere).

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

### 3.2 "Mobile Capsule of a Digital Identity" — **deliberate scoping decision, still valid; one smaller stale-code issue found underneath it**

PDF page 2 frames the capsule as a full personal graph DB the user owns and can move between storage
backends. The MVP Build Spec frames it more narrowly and as a **deferral, not a permanent exclusion**:
*"Encrypted / portable personal data concept — Maintain privacy-first architecture and user control.
Portability is a future capability unless required for the Beta MVP."* `MVP_ARCHITECTURE.md` §10 lists it
under "What NOT to build for this MVP," consistent with that framing.

The only real export code today is `apps/web/src/app/api/user/export/route.ts` — read directly. It is a
plaintext, unencrypted GDPR JSON dump, with no capsule format and no import path, which matches the "not
required for MVP" framing exactly.

**A smaller, separate issue found underneath this**: the export route queries **only the old Supabase
schema** (`user_profiles`, `decisions`, `token_usage`) — it doesn't touch the new DynamoDB data model at
all. If a real user existed today with Companion messages, Mirror Room sessions, or Digital Twin signals,
a GDPR export request would silently omit all of it. This isn't the Mobile Capsule question (encryption/
portability) — it's a data-completeness bug waiting to happen, and worth fixing whenever this route is next
touched, independently of any capsule decision.

**Judgment: the capsule deferral itself is deliberate and still valid.** The export-route staleness
underneath it is a separate, smaller, unexamined gap.

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
5. **Export route data completeness** (§3.2): decide whether/when to extend the GDPR export route to cover
   the new DynamoDB data model, independent of any Mobile Capsule decision.
6. **Whole-product cost model** (§3.4): schedule rebuilding it once real usage projections exist (e.g.,
   once the Decision Room frontend port gives a first real traffic pattern to model against).
7. **Auth/account API surface** (§2.1/§4.4): confirm this is simply next-in-line unbuilt work, not
   something that was supposed to happen alongside Phase 0.

Everything else in this document (no graph DB, no Mobile Capsule, Grow webhook stub, no VPC yet, Library
topics awaiting review) is already a deliberate, documented, still-valid decision — re-confirmed this
session, not re-opened.
