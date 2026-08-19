# DPNR Enterprise MVP — Architecture & Build Plan

*Drafted 2026-08-17. Synthesizes: `DPNR_MVP_Build_Specification_FINAL_CHAT_HUB_v2.docx` (product source of truth), `aws-migration-plan.html` rev.10 (Decision-Room-specific AWS design, Appendix C reference), `digital_personality_presentation.pdf` (Appendix B reference, conceptual only), and the current `decision-room` codebase (`origin/decision-room` @ `f7937f0`).*

## 0. What this document is

The MVP spec defines **DPNR — The Human Operating System** as the product: Gate 1 (Companion + Dashboard), Gate 2 (Mirror Room, Decision Room, Content Library), a Digital Twin/My Evolution Map signal layer, Daily Card, Weekly Recap, and a Beta Trial/Credits system. **Decision Room is one component**, not the product.

Two things make this buildable now rather than speculative:

1. The spec's own §9 "Recommended Build Stack" and §8 "Target privacy architecture" independently converge on almost exactly the AWS architecture the migration plan designed for Decision Room alone (Cognito, API Gateway + Lambda, DynamoDB, Bedrock/Claude, Prompt Registry, KMS session-tickets). That architecture just needs to be **generalized from one room to the whole product** rather than re-invented.
2. A working, if pre-migration, Decision Room already exists in this repo — 7-step flow, 8 AI prompts, full UI — that becomes the reference implementation for how *any* Room in Gate 2 should be structured.

**Ground-truth check performed before writing this plan:** the `decision-room` repo (local checkout was 53 commits behind `origin/decision-room` and mid-merge-conflict; now synced to `f7937f0`, see `git log`) contains **only** the Next.js + Supabase + OpenAI stack described in `HANDOVER.md`. No `backend/`, `CDK/`, or Lambda code exists anywhere accessible — the "near-term execution plan" in the migration plan (§11, e.g. `lmb_AddUser` as "live") does not correspond to anything found. **This plan treats all AWS infrastructure as net-new work**, not a continuation of started backend work. If that Lambda/CDK code exists somewhere else, its absence from the estimates below should be revisited.

**Scope note on "enterprise-scale":** nothing in the spec suggests DPNR is multi-tenant B2B software. This plan reads "enterprise-scale" as *production-grade*: scales automatically with user growth (serverless, pay-per-use), meets the spec's non-negotiable privacy/security bar, is observable, and fails safely (retries, DLQs, no data loss). If literal multi-tenancy (e.g. white-labeling DPNR for clinics/employers) is actually intended, that's a materially different data-isolation model and should be called out explicitly before Phase 0 starts.

---

## 1. Product surface being built

| Layer | Components | Status today |
|---|---|---|
| Gate 1 | Companion (Main Chat), Dashboard/Roadmap | Not built |
| Gate 1 support | My Evolution Map / Digital Twin | Not built |
| Gate 2 | Mirror Room | Not built |
| Gate 2 | Decision Room | **Built** (pre-migration: Next.js + Supabase + OpenAI) |
| Gate 2 | Content Library | Not built |
| Continuity | Daily Card, Weekly Recap, reminders/commitments | Not built |
| Commercial | Beta Trial & Credits | Not built (current repo has Grow subscription tiers + hard token caps, a different model) |
| Platform | Cognito / API Gateway+Lambda / DynamoDB / Bedrock / Prompt Registry / encryption | Not built (Supabase + OpenAI in place instead) |

---

## 2. Target architecture (generalized across all components)

```
Clients            Product core
Web (Next.js)  ──►  API Gateway  /v1/...
iOS / Android  ──►     │  Cognito authorizer (JWT + consent claim)
(future)       ──►     ▼
                    Lambda handlers, one family per bounded context:
                      companion · dashboard · twin · rooms/{decision,mirror}
                      library · daily-card · weekly-recap · credits · account
                        │
                        ├─► DynamoDB (application table — single-table design)
                        ├─► Prompt Registry (DynamoDB, separate table)
                        ├─► Session Tickets (DynamoDB, no PITR/backups)
                        ├─► Credits Ledger (part of application table)
                        └─► Bedrock (Claude, Converse API)
                        │
                        └─► EventBridge ─► Step Functions / Lambda:
                              - session.completed → Digital Twin extraction
                              - session.completed → session summary
                              - scheduled: Daily Card, Weekly Recap, reminders
```

This is the same shape as the migration plan's §3 diagram — the only change is that Lambda handlers are organized **per bounded context** (companion, rooms, library, twin, credits) instead of one handler family for Decision Room alone, and the event pipeline feeds **one shared Digital Twin**, not a Decision-Room-only profile.

### 2.1 Why single-table DynamoDB still holds

The migration plan's rationale (§14) — instant scaling, no connection pooling, storage-agnostic encryption/API/Registry design — applies unchanged. The **only** design question the wider product adds is: *does every Room get its own table?* No — per spec §8.1's own reasoning (reused from the migration plan almost verbatim): future sections are scoped by **key**, not by new tables. Mirror Room, Decision Room, Companion sessions, and Digital Twin signals all live in the same per-user partition.

### 2.2 Encryption model — unchanged, scope widened

§6 of the migration plan (client-side field-level encryption, DEK/KEK hierarchy, session tickets, the 24–72h audited post-session window) is adopted as-is by spec §8. The only generalization: **every Room's personal content is encrypted, not just Decision Room's**, and so is Digital Twin signal data (spec §8: "sensitive derived profile data is treated as personal content"). Companion chat messages fall under the same rule — this is the most privacy-sensitive stream in the product (people will say more to a chat box than a structured form) and must not be treated as a special case.

### 2.3 Auth — unchanged

Cognito, JWT + consent claim in the authorizer, pre-token-generation trigger, post-confirmation trigger creating the app-level profile. Nothing product-specific changes this; it's identical to migration plan §4.2 / §10 Phase 2.

---

## 3. Data model

### 3.1 Application table (single-table, per-user partition)

Extends the migration plan's §5 schema with the spec's §7 "Core data objects." Everything under `[ENCRYPTED]` uses the user's DEK; everything else is structural metadata (per migration plan §6.4's split, applied product-wide).

```
PK                  SK                                  purpose
USER#<id>           PROFILE                             app profile: tier, consent, language      
USER#<id>           KEYS                                salt · wrapped_DEK(+recovery) · keypair    (§6)
USER#<id>           CREDITS                              current balance, low/exhausted flags
USER#<id>           CREDITS#TXN#<ts>                     ledger entry (grant/consume/purchase)      atomic, auditable
USER#<id>           ROADMAP                              current focus/theme/direction              [ENCRYPTED]
USER#<id>           ROADMAP#v<n>                         history (optional)                         [ENCRYPTED]
USER#<id>           TWIN#SIGNAL#<domain>#<id>            pattern|trigger|value|focus|direction|
                                                          commitment; {confidence, status, source}   [ENCRYPTED]
USER#<id>           SESSION#<id>                          generic session envelope (any room/chat)   metadata plaintext
USER#<id>           SESSION#<id>#MSG#<ts>                 Companion chat turns                       [ENCRYPTED]
USER#<id>           SESSION#<id>#SUMMARY                  post-session summary                       [ENCRYPTED w/ DEK]
USER#<id>           ROOM#DECISION#<id>                    ← ports existing `decisions` table          [ENCRYPTED]
USER#<id>           ROOM#DECISION#<id>#OPTION#A|B         ← ports existing `options` table             [ENCRYPTED]
USER#<id>           ROOM#DECISION#<id>#EMOTION            ← ports existing `emotion_maps`               [ENCRYPTED]
USER#<id>           ROOM#DECISION#<id>#TAG#<n>            ← ports existing `option_tags`                [ENCRYPTED]
USER#<id>           ROOM#DECISION#<id>#PROJECTION#<n>     ← ports existing `projections`                [ENCRYPTED]
USER#<id>           ROOM#DECISION#<id>#OUTCOME#<ts>       ← ports existing `outcomes`                   [ENCRYPTED]
USER#<id>           ROOM#MIRROR#<id>                      situation/trigger/pattern (spec §Mirror Room) [ENCRYPTED]
USER#<id>           COMMITMENT#<id>                       review date / reminder, from any room         [ENCRYPTED]
USER#<id>           INSIGHT#<id>                          standalone insight card                        [ENCRYPTED]
USER#<id>           DAILYCARD#<date>                       generated card                                 [ENCRYPTED]
USER#<id>           WEEKLYRECAP#<week>                      generated recap                               [ENCRYPTED]
USER#<id>           LIBRARY#PROGRESS#<topic-slug>           opened/saved/feedback                          plaintext (non-sensitive)
USER#<id>           USAGE#<billing-period>                   atomic token/credit counter                    plaintext (billing)
USER#<id>           PROMPT_OVERLAY#<domain>                  per-user personalization overlay (§8, MP)     [ENCRYPTED w/ DEK]
```

### 3.2 Global tables (unchanged from migration plan, extended)

- **Prompt Registry** — same immutable-version + `prod` alias model (migration plan §8), extended with new domains: `companion`, `mirror_room`, `decision_room` (13 prompts ported), `library`, `daily_card`, `weekly_recap`, `twin_extraction`.
- **Session Tickets** — unchanged (§6.5). One mechanism serves every room and Companion chat alike, since they all need the same bounded server-side decrypt window.
- **Content Library catalog** (new, same profile as Prompt Registry — config-like, versioned, low write volume): `PK: LIBRARY#TOPIC#<slug>`, `SK: VERSION#<n>` / `ALIAS#prod`. Plaintext — it's DPNR's authored taxonomy, not personal data.
- **Plans/Packages catalog** (new, config-like): `PK: PLAN#<id>` — credit packs and subscription plans, kept configurable per spec §Beta Trial ("package names are Beta variables... should remain configurable rather than hard-coded").

### 3.3 What retires

The 8 Supabase tables (`user_profiles`, `decisions`, `options`, `emotion_maps`, `option_tags`, `projections`, `outcomes`, `token_usage`) map 1:1 onto the `ROOM#DECISION#*` items above — this mapping is the actual Decision Room migration work, already scoped in migration plan §10 Phase 3. Supabase Auth, Postgres, and RLS are decommissioned once Cognito + DynamoDB are live for all rooms (not just Decision Room).

---

## 4. API surface (`/v1`)

| Resource | Endpoints | Notes |
|---|---|---|
| Auth/account | `POST /v1/session-ticket`, `DELETE /v1/auth/sessions/{id}`, `PUT /v1/auth/password`, `DELETE /v1/account`, `GET /v1/keys`, `POST /v1/user/consent` | Ported directly from migration plan §11 workstream 1. `POST /v1/user/consent` is the write path ADR 0004 anticipated ("updates the PROFILE item") — built in the audit-follow-up session that found consent was otherwise unsatisfiable (docs/PHASE_AUDIT.md §2.2); the other five endpoints in this row remain unbuilt. |
| Companion | `POST /v1/companion/message`, `GET /v1/companion/context` | Chat-first router; resolves intent, may return a room/dashboard transition directive |
| Dashboard | `GET /v1/dashboard` | Aggregate read: roadmap + twin summary + continuity cues + credits status, one call |
| Digital Twin | `GET /v1/twin`, `POST /v1/twin/signals/{id}/confirm`, `POST /v1/twin/signals/{id}/reject` | Confirm/reject rule from spec §5 "Trust rules" |
| Decision Room | `POST /v1/rooms/decision`, command payload contract (`sessionId/flowId/stepId/action/expectedSessionVersion/idempotencyKey`) per migration plan §11, `GET /v1/rooms/decision/{id}/full` | `flowId: DECISION`; reuses the exact contract already designed |
| Mirror Room | Same command contract, `flowId: MIRROR` | Structurally identical to Decision Room — same engine, different step map (see §5.2) |
| Content Library | `GET /v1/library/topics`, `GET /v1/library/topics/{slug}`, `GET /v1/library/recommendations` | |
| Daily Card / Weekly Recap | `GET /v1/daily-card`, `GET /v1/weekly-recap` | Pre-computed by scheduled pipeline, read is a cache hit |
| Commitments | `POST /v1/commitments`, `GET /v1/commitments` | Feeds EventBridge Scheduler reminders |
| Credits | `GET /v1/credits`, `POST /v1/credits/purchase`, `GET /v1/plans` | Payment provider abstracted behind this; no card data in DPNR storage (spec §8 launch blocker) |
| Webhooks | `POST /v1/webhooks/payment` | Generalizes `webhooks/grow` — **the current stub `verifyGrowSignature()` is a critical pre-launch blocker per the migration plan and must not ship generalized or otherwise** |

The **single flow-engine Lambda** idea from migration plan §11 (one Lambda, `flowId`/`stepId`/`action` in the payload, prompt resolved server-side from the Registry) is the right shape for *both* Decision Room and Mirror Room — build it once, register two flow definitions.

---

## 5. Component build scope

### 5.1 Companion (net new)

Chat-first router per spec §Companion contract. Technically: a Bedrock Converse loop with a small tool-routing layer (open Dashboard / enter a Room / surface a Library topic / just respond) — this *is* the "harness around the LLM" concept from the digital-personality reference (Appendix B), adopted only to the extent the spec already calls for (context assembly, prompt registry, validation outside the raw model call — spec §Appendix B explicitly scopes this in, everything else in that PDF stays out).

### 5.2 Mirror Room (net new, but not from scratch)

Spec's "hidden structure" (situation → automatic reaction → trigger people → trigger situations → shape the character) is the same shape as Decision Room's hidden structure (14-step model). Build it on the same flow-engine Lambda and command contract as Decision Room; only the prompt set and step map differ. This is the highest-leverage reuse in the whole plan — **don't build a second engine.**

### 5.3 Decision Room (port, not rebuild)

This is where the existing codebase pays for itself directly:

| Existing asset | Disposition |
|---|---|
| `src/components/decision/*` (Step01–07, StepShell, WelcomeScreen, MomentScreen, CelebrationScreen, ClarityToActionScreen, CommitmentScreen, CompletionScreen, SectionSummaryScreen, SessionSummaryScreen, SummaryInsightScreen) | **Reuse as-is.** Swap their data calls from `src/lib/supabase/decisions.ts` to the `/v1` API client. UI/UX logic doesn't change. |
| `src/lib/ai/prompts.ts` (8 prompt builders) | Rewrite as Prompt Registry version records (templates + placeholders, per migration plan §8.2). Re-validate every prompt against Claude/Bedrock (migration plan flags this explicitly — GPT-4o prompts, esp. JSON-format instructions, aren't guaranteed to transfer). |
| `src/lib/ai/call.ts` | Swap OpenAI client for Bedrock Converse client. Isolated, ~1 day per migration plan §10 Phase 1. |
| `supabase/migrations/001_initial_schema.sql`, `002_consent.sql` | Source of truth for the `ROOM#DECISION#*` item shapes in §3.1 above — the schema, not the storage engine, survives. |
| `src/lib/tokens.ts`, `src/lib/tier-caps.ts` | Replaced by the Credits ledger (§5.6) — different model (per-action credit deduction vs. period token cap), not a port. |
| `src/proxy.ts` | Pattern (auth + consent gate, UX-only redirect) reused for the whole app, not just `/decision` and `/dashboard` — extend the matcher to cover Companion, Mirror Room, Library. |
| Supabase Auth, Postgres, RLS, Grow tier logic | Retired. |

### 5.4 Digital Twin / My Evolution Map (net new)

Build the **data contract** (signal model in spec §5: `pattern | trigger | value | current_focus | direction | commitment`, each with `source, confidence, status`) and the confirm/reject API. Explicitly **do not** build a fixed visualization — the spec is emphatic that the visual form is unlocked through beta (§1.1, §My Evolution Map contract, §13 Builder Instruction). A simple card-list UI backed by the real data contract is enough for MVP; swapping it for a map/graph/timeline later must not touch the data model.

### 5.5 Content Library (net new)

Config-like catalog (§3.2) + AI-generated explanation layer per topic, personalized from confirmed Digital Twin signals only (spec is explicit: "not from unsupported assumptions"). No scientific psychology graph database is required for MVP (Appendix B's graph-DB concept is explicitly optional per spec's own adoption rule) — DPNR's taxonomy + controlled prompts is sufficient.

### 5.6 Beta Trial & Credits (net new, replaces the Grow tier-cap model)

Auditable ledger (`CREDITS` + `CREDITS#TXN#<ts>` items, §3.1), atomic conditional writes (`ConditionExpression: balance >= cost`) — same DynamoDB pattern the migration plan already prescribed for token accounting (§5), just re-purposed as user-facing credits instead of an internal cap. Payment provider is abstracted behind `/v1/credits/purchase`; only provider references/entitlement state are stored (spec §8 launch blocker). Whether that provider is Grow (existing ILS billing) or something else is an open decision — see §7.

### 5.7 Daily Card, Weekly Recap, Commitments/reminders (net new)

Pure consumers of the event-driven pipeline (§6): scheduled Lambda reads the user's partition, composes from Digital Twin + session summaries, writes `DAILYCARD#<date>` / `WEEKLYRECAP#<week>`. EventBridge Scheduler handles reminders exactly as migration plan §10 Phase 4 already designed (and notes this fixes an existing known gap — scheduled downgrades in the current app are recorded but never executed).

---

## 6. Event-driven pipeline (generalized)

Migration plan §7's principle — *compute after the session, read at session start* — now applies to every room, not just Decision Room:

```
finishFlow (any room) / Companion session end
  → ticket extended to post_session (24–72h, §6.5)
  → publishes "session.completed" { userId, sessionId, roomType } — identifiers only
Pipeline (Lambda, later Step Functions):
  → unwrap ticket → decrypt session content + current Digital Twin
  → Bedrock: extract candidate signals (pattern/trigger/value/...) + session summary
  → write candidate TWIN#SIGNAL items (status: candidate) + SESSION#<id>#SUMMARY
  → roll into Roadmap only when evidence crosses the confirmation threshold (spec §5 Trust rules)
  → DELETE ticket
Scheduled (EventBridge Scheduler):
  → Daily Card composition (daily)
  → Weekly Recap composition (weekly)
  → commitment/review-date reminders
```

The one new rule the spec adds beyond the migration plan: **not every session updates the Digital Twin** (§6 Intelligence Rules: "only strong signals should update"), and confirmed vs. candidate vs. rejected status must be tracked explicitly and never silently overwritten (§5 Trust rules). This is a product rule enforced in the pipeline's write path, not a new architecture component.

---

## 7. Build sequence

The spec's own build sequence (§11, Slices 1–6) is authoritative for order. The migration plan's Decision-Room-only phases fold into it as follows — Phase 0 below is genuinely new scope the spec's slices assume exists but don't themselves describe:

| Phase | Scope | Maps to | Est. (small dedicated team*) |
|---|---|---|---|
| **0 — Platform foundation** | Cognito, `/v1` API Gateway + Lambda skeleton, DynamoDB tables (app + Registry + Tickets), Bedrock swap, Prompt Registry skeleton, `proxy.ts` extended | Migration plan Phases 1–3, generalized beyond Decision Room | 3–4 weeks |
| **1 — Slice 1: Product spine** | Account/consent/onboarding, Companion, Dashboard, Digital Twin v1 (data + confirm/reject, no fixed viz), Roadmap, Beta Trial + Credits ledger | Spec §11 Slice 1 | 2–3 weeks |
| **2 — Slice 2: Mirror Room** | Flow-engine reuse (§5.2), new prompt set, candidate Digital Twin updates | Spec §11 Slice 2 | 1–1.5 weeks (engine reused) |
| **3 — Slice 3: Content Library** | Catalog table, taxonomy, AI explanation generation, recommendations | Spec §11 Slice 3 | 1–1.5 weeks |
| **4 — Slice 4: Decision Room port** | Port existing 7-step UI + 8 prompts onto the platform (§5.3) | Spec §11 Slice 4 + Migration plan §10 Phase 3 (Decision-Room-specific parts only) | 1–2 weeks (UI mostly exists) |
| **5 — Slice 5: Continuity layer** | Daily Card, Weekly Recap, commitments/reminders, EventBridge pipeline live end-to-end | Spec §11 Slice 5 + Migration plan §10 Phase 4 | 1.5–2 weeks |
| **6 — Slice 6: Production hardening** | Client-side E2E encryption across *all* rooms (not just Decision Room), crypto contract + test vectors, recovery-code UX, security review, CloudTrail alarms, real webhook HMAC verification | Spec §11 Slice 6 + Migration plan §10 Phase 5 (§6 full) | 3–4 weeks |

**Total: ~13–18 weeks** for a small dedicated team. *The migration plan's estimates were "one developer" per task; the numbers above assume roughly 2–3 engineers working overlapping slices (platform/backend, room logic, frontend), which is why totals aren't a simple 5-phase sum. If the actual team is a single developer, multiply by roughly 2×.

**Note on phase ordering:** Phase 6 (encryption) is last per the spec's own slice order, matching the migration plan's explicit reasoning (§10 footnote): it's fine to ship Phases 1–5 with the pipeline reading plaintext directly, then encrypt everything at the end, *provided* the §6.4 encrypted/plaintext field split, the API contract shape, and the ticket model are all designed during Phase 0 — not bolted on later. Retrofitting the field split after five slices of feature work is the expensive mistake this plan is structured to avoid.

---

## 8. Enterprise-scale considerations

| Concern | How it's addressed |
|---|---|
| Scale-to-zero / scale-to-growth | Every service is pay-per-request (Lambda, API Gateway, DynamoDB on-demand, Bedrock per-token) — migration plan §9's cost model applies unchanged; extend its load presets (Start/Small/Growth/Scale) with Companion/Mirror Room/Library call volume before re-costing |
| Security posture | TLS everywhere, KMS at-rest encryption as defense-in-depth, IAM role separation (API role ≠ pipeline role ≠ release role), CloudTrail on all data/KMS access with anomaly alarms — migration plan §6.8, applied product-wide |
| Privacy-by-architecture | Client-side E2E encryption of all personal content (not just Decision Room) — the product's core differentiator per both source docs, and a spec §8 launch blocker |
| GDPR (export/delete) | One partition `Query` + `BatchWriteItem` per user, same as migration plan §5 — now covers every room's data since it's all in one partition |
| Observability | CloudWatch + CloutTrail, payload-free logs (spec §8 launch blocker: "no raw personal payloads in application logs, analytics events, or error traces") |
| Resilience | EventBridge is at-least-once; idempotency via `expectedSessionVersion` + `idempotencyKey` (already in the command contract) and DLQs on the pipeline |
| Multi-region / literal multi-tenancy | **Not scoped** — nothing in the spec calls for it. If "enterprise-scale" means white-labeling or per-organization data isolation (e.g. selling to clinics/employers), that changes the partition model (`ORG#<id>#USER#<id>` instead of `USER#<id>`) and should be decided before Phase 0, not retrofitted. |

---

## 9. Open decisions (need an answer before or during Phase 0)

1. **Payment provider for Credits.** Keep Grow (existing ILS billing, webhook already scaffolded) or switch — spec keeps this abstracted behind `/v1/credits/purchase`, but the choice affects Phase 1 estimate.
2. **Recovery/key-custody UX.** Spec explicitly blocks enabling zero-knowledge encryption until this is designed (§8) — needs a decision before Phase 6, ideally scoped during Phase 0 per the "design encryption-first" principle.
3. **Is "enterprise-scale" literal multi-tenancy?** See §8 above — assumed no; confirm before the partition-key design is locked in Phase 0.
4. **Fate of the "live" Lambdas referenced in the migration plan §11.** Nothing matching them was found. If they exist somewhere else, find them before re-estimating Phase 0 down.
5. **Team size/composition**, since it changes §7's totals directly.

---

## 10. What NOT to build for this MVP (per spec §3 "Not required")

Full calendar read/write integration, predictive personality labeling, hundreds of hand-authored Library items, gamification/streaks/engagement mechanics, every Figma concept or future Room, and — per the spec's explicit adoption rule for Appendix B — a scientific psychology knowledge-graph database, virtual-personality synthetic training data, and a portable "digital identity capsule." Those stay optional reference material unless the team explicitly decides to adopt them later.
