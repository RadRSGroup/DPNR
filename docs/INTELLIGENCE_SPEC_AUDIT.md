# DPNR — Product Intelligence & AI Operating Specification: Alignment Audit

**Written:** 2026-09-01, dedicated audit session (no feature code changed). Source document:
`docs/DPNR_operating_spec_principles.pdf` v1.6, 30 August 2026, 40 pages, 33 sections + 4 appendices — new
this session, previously unreviewed by any agent. Full text extracted to prose and read in full before writing
this document (`pdftoppm` isn't installed on this machine; used `pymupdf`'s `get_text()` with
`PYTHONIOENCODING=utf-8` instead — plain bullet characters (``) need that encoding fix or extraction
throws).

**Purpose.** The spec places itself explicitly at **priority 2** in its own conflict-precedence table — below
only privacy/safety/healthy-use rules, and above the Product Logic & Data Definitions Addendum, the MVP
Product & Build Specification, and Figma. It calls itself "IMPLEMENTATION TRUTH FOR RAD + CLAUDE CODE."
That makes it a new top-tier source of truth this project has never been checked against. This document is
that check: what the spec requires, section by section, versus what the live code actually does — not a
restatement of the spec (read the PDF itself for the full text) and not a build plan (see "What this means for
the next session" at the bottom for that). This is a sibling document to `docs/PHASE_AUDIT.md`, not a
replacement — `PHASE_AUDIT.md` tracks the older 7-phase build framework (build-complete/not-built); this
document tracks conceptual/behavioral compliance with the new intelligence spec, which is a different axis
(a feature can be 100% "built" per `PHASE_AUDIT.md` and still violate this spec's rules about what it may
display or persist).

**Register this document going forward:** `docs/MVP_ARCHITECTURE.md` §0 has been updated to list this spec
in the doc-authority chain. Read this audit (or the spec itself) before touching Digital Twin, signals,
scoring, Growth Tracker, Evolution Map, safety/crisis language, rewards, or Companion routing logic.

---

## Critical findings — need the user's explicit decision, not unilateral action

These three were flagged rather than fixed inline, per the spec's own §31 escalation rule ("the decision would
change what becomes persistent... or how user identity is represented," "a new safety scenario... must not be
invented ad hoc"). Precedence formally resolves all three in the spec's favor (it outranks the older build
spec that authorized what's currently built), but un-shipping or restructuring live, deployed, user-facing
product surfaces is a real product call, not a reversible implementation detail — consistent with how every
prior scope decision in this project has been handled.

**Update, 2026-09-01, same-day follow-up session:** the user chose for #2 and #3 (both the audit's own
recommended options), and both are now **built, live-verified, and resolved** — see ADR 0010 and ADR 0011.
#1 (safety/crisis system) remains open and is the natural next priority — it's real design + engineering
work, not a quick decision the way #2/#3 were.

### 1. No safety/crisis system exists at all (spec §30, §33's safety acceptance tests)
Grepped the entire codebase for `safety_state`, `crisis`, `immediate_danger`, `SAFETY_CONCERN` — zero
matches anywhere in `infra/cdk/lambda` or `apps/web/src`. The spec is explicit that safety is "a product-level
contract, not a conversational style choice" and sits **above this spec itself** in the precedence table (priority
1). There is currently:
- No `safety_state` classification anywhere in the Companion/Mirror/Decision pipelines (§30's minimum
  contract: `normal | deep_reflection | overload | high_stakes | safety_concern | immediate_danger`).
- No routing suspension when a safety concern is detected — Companion (`infra/cdk/lambda/companion/message.ts`)
  calls the model and returns a reply with no safety-layer classification step at all.
- No distinction between ordinary distress and a credible safety concern — nothing prevents (or is even aware
  of) the difference the spec requires.
- The soft-stop-cue mechanism that *does* exist (Session 22's real ~20-minute session timer in
  `StepShell.tsx`/`MirrorStepShell.tsx`) is healthy-use pacing only (§26/§30's *OVERLOAD* state), not a
  safety-concern detector — a real but narrower piece of what §30 asks for.

This is the single highest-priority gap in the whole spec, by the spec's own stated priority order. It needs a
scoped design session (model/provider safety capabilities + DPNR-defined rules, per §30's own
"independent guardrail layer" framing) before Companion, Mirror Room or Decision Room can be said to meet
this spec at all. Flag to the user before starting: this is real design and engineering work, not a quick prompt
tweak, and touches the "any change touching auth, encryption, payments, or webhook signature verification
gets a security-review pass" guardrail's spirit even though it's not literally one of those four things.

### 2. `/twin` ("InnerSelf") is a dedicated destination — spec explicitly forbids this for MVP — **RESOLVED, see ADR 0010**
Session 16 built, and Session 27 reskinned, a real `/twin` route under the "InnerSelf" name — confirmed still
present (`apps/web/src/app/(app)/twin/page.tsx`). Spec §6 header is literally "Digital Twin Across the
Product: No Separate User-Facing Room," and body text says: **"Do not create a duplicate InnerSelf
destination for MVP... The Twin should be experienced, not operated... No dedicated Twin/InnerSelf screen is
required for MVP."** §5's "No duplicate product ownership" table lists "A user-facing destination, room or
duplicate dashboard" as something the Digital Twin explicitly does NOT own.

This is a direct, named conflict between an already-shipped feature and the new canonical spec. Precedence
says the spec wins, but removing or repurposing a built, deployed, live-verified page is a real product
decision (what happens to its content — confirm/reject signal review, archetype/pattern list — some of which
has no other home today) that the user should make explicitly, not something to silently delete. Options worth
presenting: (a) fold its content into contextual Current Reflection cards on Dashboard/Growth Tracker per
§6's own prescribed pattern and retire the route, (b) keep it as a low-emphasis settings-style page (not nav-
promoted as a primary destination) if the confirm/reject signal-review UI genuinely needs *some* home, or (c)
get an explicit product ruling that this MVP intentionally diverges from the spec here. Do not pick one
unilaterally.

### 3. The Dashboard/My Evolution "Alignment Score" is exactly the kind of global index the spec calls
unresolved backlog, not an approved number — **RESOLVED, see ADR 0011**
`infra/cdk/lambda/lib/alignment-score.ts` computes a single 0–100 number — `0.6 * commitment
follow-through rate + 0.4 * values clarity` — shown on Dashboard and charted daily on My Evolution Map. Its
own code comment already says "First pass, not product-reviewed." The spec's §11 "When a number must NOT
appear" list includes "The number would imply 'how good' the user is at a life domain" and requires, before
any number ships: an operationally-defined construct, defined evidence sources per component, **minimum
evidence/source/time thresholds**, and **confidence above a configured threshold** — none of which
`computeAlignmentScore()` implements (it returns a number the moment there's a single resolved commitment
or a single confirmed value signal; no confidence gating, no "still learning this part of you" fallback state at
all). Appendix D's Product-Definition Backlog literally lists **"Decision on whether any global
Alignment/Evolution index provides enough value to justify keeping it"** as an open, unresolved question —
this project already built and shipped exactly the artifact the spec's own authors haven't yet decided should
exist.

Same category of issue, smaller: `docs/AGENT_LOG.md` Session 27's `EARN_COMMITMENT_COMPLETED_CREDITS`/
`EARN_REFLECTION_COMPLETED_CREDITS` reward amounts were already flagged there as "Session 27's own
first-draft numbers, no product review yet" — §25's reward catalog (Meaningful Cycle / Consistency Cycle /
Integration Milestone / Evolution Milestone / Monthly Growth Cycle) doesn't map cleanly onto the two ad hoc
reward types actually built. Lower urgency than the Alignment Score (the *principle* — no reward for login/
streak/message-volume — is already correctly followed; it's the taxonomy and amounts that don't match), but
worth reconciling in the same pass since both are Wallet/rewards surface.

---

## Section-by-section alignment

Legend: ✅ already matches the spec's rule in spirit · ⚠️ partial / real gap, no conflict · ❌ built and shipped
against what the spec now says · 🔶 needs a product decision before it can be built (spec deliberately leaves
it open, e.g. Appendix D).

| Spec section | Topic | Status | Note |
|---|---|---|---|
| 0 | How to use / precedence | — | This document IS the response to §0's own instruction. |
| 1 | Product Intelligence Principles | ✅ | "Reflect, don't declare," user-correctable interpretations, honest-empty-state culture are already this project's default posture (every session's "honest empty state, not fabricated data" convention predates this spec and already matches it). |
| 2 | Methodology (MBT/ACT/IFS/Kabbalah/etc., dynamic lens selection) | ⚠️ | No prompt currently references a methodology lens explicitly, dynamically-selected or otherwise — Companion/Mirror/Decision prompts (Prompt Registry) were written pre-spec and don't implement the `intent → emotional state → context → evidence → safety → lens → response` sequence in §2. Not a conflict (nothing contradicts it), just unimplemented. Needs prompt-engineering work once safety (finding #1) exists to sit underneath it. |
| 3 | Canonical Product Glossary | ✅/⚠️ | Most terms (Signal, Pattern, Trigger, Value, Need, Commitment, Progress) already exist as real schema concepts with compatible meaning. `Current Reflection` as a *named, contextual, non-room* concept doesn't exist as its own UI element yet — Dashboard's `continuityCue`/Growth Tracker's "Current Inner State" are close in spirit but not built as the single reusable `CurrentReflectionSynthesis` object Appendix A defines. |
| 4 | Life Domains taxonomy | ⚠️ | `LifeDomainCategorySchema` (7 values: self_inner_world, relationships, career_purpose, health_body, money_abundance, creativity_expression, spirituality) vs. spec's 8 domains (adds "Home & Lifestyle" as its own domain; spec's "Work, Purpose & Contribution" and "Growth & Expansion" are also two domains where the current taxonomy has one "career_purpose" bucket doing double duty). A real, mechanical taxonomy mismatch — affects every signal ever classified so far (small volume, only real/throwaway test users exist today, so a migration is cheap right now and gets more expensive the longer it's deferred). |
| 5–6 | Digital Twin definition & no-separate-room rule | ✅ (resolved 2026-09-01) | See Critical Finding #2 / ADR 0010 — `/twin` retired, calibration UI moved to Dashboard's contextual `TwinCalibrationCard`, live-verified. |
| 7 | Evidence & Signal Model | ⚠️ (partially resolved 2026-09-04) | `TwinSignalItemSchema` now has `signalType` (split from `source`, per this row's own original finding), `direction`, `strength` (distinct from `confidence`, derived by comparing against up to 5 prior confirmed signals in the same domain), and `promptRef`/`modelRef` traceability — see Session 35 / ADR 0015. Still missing: `subdimension`, `reason_code`, `goal_id` (deliberately deferred — `goal_id` has no first-class goal entity to reference yet, `reason_code`'s exact spec taxonomy wasn't independently re-verified against the PDF that session). |
| 8 | AI Reasoning Pipeline / Five AI Roles | ⚠️ | The nine-stage pipeline (`session summary → candidate signals → dedup → confidence/contradiction check → aggregated state → reflection → recommendation → real-life action → follow-up → Twin update`) isn't implemented as a named pipeline anywhere — pieces exist (session summaries, candidate signals via `twin/classify_signal`, recommendations in Library) but there's no explicit "confidence/contradiction check" or "evidence deduplication" stage against prior signals before persistence. The five-role separation (Facilitator/Extractor/Synthesizer/Recommender/Narrator) isn't modeled in the Prompt Registry's structure — prompts are per-room, not per-role. |
| 9 | Persistence, Confirmation & Correction | ✅ | This is a genuinely strong match: `candidate/confirmed/rejected` status already exists on `TwinSignalItem`, the confirm/reject UI already exists (`/twin`, or wherever its content moves per Finding #2), and rejected signals already stop being asserted (no "argue with the user" behavior exists to begin with). This is the best-aligned major section in the whole spec. |
| 10 | Progress definition | ✅ | Nothing in the current product frames progress as "more usage" — no daily-login rewards, no message-count gamification (Session 27 explicitly rejected "Daily Check-in"/"Practice Streak" tiles on exactly this principle, pre-dating this spec's own reading). |
| 11 | Numbers, Scores & Reflection Indices | ✅ (resolved 2026-09-01) for the Alignment Score | See Critical Finding #3 / ADR 0011 — `computeAlignmentScore()` now confidence-gated (insufficient/developing/eligible), live-verified. `insightsGained`/`patternsShifting` counts (Growth Tracker, Session 25) were always fine as-is — factual metrics (§11's "Factual metrics" class). |
| 12 | Confidence, Contradictions & Weird Signals | ⚠️ (partially resolved 2026-09-01) | The Alignment Score now has real threshold/confidence gating (ADR 0011) — the first place in the codebase this exists. Still no general-purpose confidence-gating for other numbers/reflections, and `TwinSignalItem.confidence` still isn't read anywhere else to decide insufficient/developing/eligible/mixed/stale. No contradiction detection between signals exists at all. |
| 13 | Growth Tracker Data Semantics | ✅ | Slice 4/5 built this well — "Current Inner State," "Areas Growing," "Patterns Shifting," honest empty-state Core Pillars/Emotional Landscape (explicitly, by design, per that session's own doc comment) all match the spec's widget-by-widget rules closely, including "no roadmap-progress percentages here" (Growth Tracker doesn't show them; My Evolution Map does). One gap: "Recommended Next Step" as a real, explained, evidence-backed single suggestion isn't built on this page today. |
| 14 | My Evolution Map & Roadmap Logic | ✅/⚠️ | Domain-first structure, Goals & Dreams over real `CommitmentItem`s, and the "percentage only with a real denominator" rule are already followed (Slice 5's own build notes explicitly reference this exact rule). The 4-stage band is correctly built as a fixed illustration, not fabricated per-user progress (per that session's own account). Gap: no `LifeDomainRoadmap` object with `aspirations[]`/`dreams[]`/`stages[]`/`milestones[]` as Appendix A/§14 defines it — today's Roadmap (`RoadmapItem`) is a flatter `{currentFocus, theme, direction, suggestedSpaces}` shape without per-domain stages/milestones structure. |
| 15 | Dashboard / Home Semantics | ✅ | Component-by-component match is close: Current Reflection-equivalent card, Roadmap, Life Domains, Patterns, Leading Archetypes, Daily Card, Suggested Next Step all already exist roughly as described. |
| 16 | Main Chat / Companion Orchestration | ⚠️ | Companion exists and does route to rooms/learning, but the specific "Three Levels of Support" framing (Stay with me / Learn beside me / Go deeper) and explicit "Routing Decision Rule" (never route merely because a pattern was recognized — only when structure adds clear value) aren't modeled as an explicit decision gate; today's routing is closer to "the model decides in free text." Context handoff (topic/pattern/domain/triggering situation/active goal/signals/session ID moving with the user into a room) is partially true via `sourceSessionId` on signals but isn't a formalized handoff object. |
| 17 | Living System Behavior (interaction mode, Open Threads, Roadmap lifecycle) | ✅ (built, deployed, live-verified — Session 34) | Current Interaction Mode: `lib/interaction-mode.ts`, a per-turn Bedrock classifier structurally identical to the safety classifier, wired into `companion/message.ts` and persisted on `CompanionActiveSessionPointerItem.currentInteractionMode`; live-verified classifying `decide`/`explore_pattern`/`be_heard` correctly across real turns. Roadmap Lifecycle: `RoadmapItem.lifecycleState` (`emerging/proposed/confirmed/active/evolving/paused/archived`), a new `POST /v1/roadmap/lifecycle` pause/resume/archive endpoint with a validated transition table, and `roadmap-revision.ts`/`accept.ts`/`reject.ts` all now label the transitions that already happen; live-verified including the negative-path 409 on an invalid transition. Open Threads: new `OpenThreadItem` entity, extraction embedded in `companion/respond`/`onboard`'s existing forced tool-use output (no extra Bedrock call), `GET /v1/open-threads` + close/pause actions, fed back into Companion via `gatherContinuityContext`; live-verified with two real model-extracted threads from real conversation. "Do nothing is a valid recommendation": `library/recommendations.ts` gained `noActionReason: 'integration_space'` — live-verified structurally correct, but honestly not reachable through any real signal domain today (every current `TwinSignalDomain` maps to a covered Library taxonomy category), only forced via a deliberately out-of-schema test write; flagged as a known limitation of the first-pass heuristic, not a false claim of coverage. Full detail: `docs/AGENT_LOG.md` Session 34. |
| 17A | Relational Presence & Progressive Inner Language | ⚠️ (unverified) | This is entirely prompt-text-level — would need the actual `companion` Prompt Registry prompt bodies read and compared against the CONTAIN→REFLECT→CLARIFY→MENTALIZE→EXPLORE→INTEGRATE sequence and the "early/developing/established/longitudinal relationship" language-progression rules. Not evaluated in this pass (out of this session's time budget) — flagged as the natural next step once safety (Finding #1) and methodology lenses (§2) are being redesigned anyway, since all three touch the same prompt files. |
| 18 | Contextual Learning & Side-Panel Behavior | ⚠️ | Companion's "offer a side panel" trigger for a Library topic isn't built — Library today is a separate destination the user navigates to, not a contextual card that can open beside an active Main Chat conversation without losing chat state. |
| 19–20 | Knowledge System & Canonical Learning Topic Structure | ⚠️ | Library topics exist (`GET /v1/library/topics`) with real authored content, but haven't been checked against the exact 7-part structure (Understand → Recognize → Possible Roots → Personal Reflection → Work With It → Go Deeper → Integration) or the `KnowledgeTopic{}` schema's `methodology_sources[]`/`clinical_boundaries[]`/`allowed_ai_inferences[]`/`prohibited_ai_inferences[]` provenance fields — worth a follow-up pass once the founder-authored "DPNR Methodology & Source Manual" (§19's own flagged prerequisite, Appendix D backlog item) exists, since topic content can't really be graded against source provenance that doesn't exist yet. |
| 21 | Mirror Room Intelligence Contract | ✅/⚠️ | The 5-step structure (situation → automatic reaction → pattern → life impact → synthesis, plus commitment) is compatible with the spec's step table in spirit. Explicitly flagged in `AGENT_LOG.md` since Session 5 as "a draft, not final" — this spec is a legitimate trigger to finally product-review it, now against real written criteria instead of just "does it feel reasonable." |
| 22 | Decision Room Intelligence Contract | ⚠️ | Current Decision Room is **11–14 structural steps** (ported from the original OpenAI-era app) where the spec describes a **6-phase UX** (Define/Explore/Feel/Align/Decide/Act) with richer *internal* coverage per phase. This isn't necessarily wrong — the spec explicitly separates "user sees a simplified six-phase experience" from "internal DPNR model preserves the full decision process," so today's many small steps could map onto internal coverage within 6 user-facing phases rather than needing a step-count reduction. Worth a deliberate design pass (grouping today's steps under 6 phase headers) rather than a rebuild — flagging as ⚠️ not ❌ since nothing here actively contradicts the spec, it's just unstructured against it. |
| 23 | Recommendations & Cross-Room Routing | ⚠️ | Library recommendations (Slice 3) have real reason text ("Related to N confirmed X signals") — good spirit-match to "explainable personalization," but not built against the specific `reason_code` enum (`current_focus`/`recent_pattern`/`decision_followup`/`roadmap_goal`/`saved_interest`/`integration_opportunity`). No cross-surface recommendation engine exists outside Library — Companion doesn't recommend rooms via a structured `Recommendation{}` object today, it's free-text model output. |
| 24 | Archetypes/Patterns/Values/Needs/Emotions | ✅/⚠️ | `ArchetypeSchema` (healer/seeker/visionary/protector) exists and is populated via real classification (Session 19's `twin/classify_signal`), shown as "Leading Archetypes" (prominence-based, not a personality-composition claim) — matches spec's "do not" column well. Values/Needs/Patterns exist narrowly as `TwinSignalDomain` enum values but don't yet have the richer per-object shape (recurrence/context/trigger/response/direction for patterns; frequently-present/emerging/currently-unmet states for needs) the spec's table describes — same underlying gap as §7's Signal Model finding. |
| 25 | Wallet, Credits & Ethical Growth Rewards | ⚠️ | See Critical Finding #3's second half. Principle-aligned (no login/streak/message-count rewards — actively, deliberately rejected per Session 27's own notes), taxonomy-misaligned (2 ad hoc reward types vs. the spec's 5 named ones with different eligibility windows). |
| 26 | Healthy Engagement & Non-Manipulation | ✅ | The ~20-30 minute soft-stop cue (Session 22, live-verified), "no broken streaks/guilt," and absence of any "N more actions to unlock"-style mechanic are all already true. This section's "Ethical Test" (would we want this if no credits existed / would it still be good if it reduced time-on-platform / are we acknowledging vs. manufacturing behavior) is a good gut-check for the reward-taxonomy reconciliation flagged in §25/Finding #3. |
| 27 | Claude Roles & Structured Output Contracts | ✅ | "Hard authority boundaries" already hold structurally: Claude/the model never directly sets Wallet balance (deterministic `grantCredits`/`consumeCredits` functions own that), never directly mutates `RoadmapItem` (goes through the propose→confirm flow), and Prompt Registry outputs are schema-validated (forced tool-use, ADR 0005) rather than free prose parsed as fact. |
| 28 | Privacy, Provenance & Traceability | ⚠️ (traceability gap resolved 2026-09-04) | Compact encrypted summaries over raw transcripts: true (Phase 6 crypto is now fully complete, not just in progress — see ADR 0007's Resolution; "no raw payloads in logs" guardrail already exists in this file's own standing rules). Traceability: `TwinSignalItem.promptRef`/`modelRef` now record which prompt/model version produced each signal (Session 35, ADR 0015, ties to §7's finding) — "what prompt version generated this signal" is now answerable for every signal created since. |
| 29 | MVP vs Later Intelligence Scope | ✅ | This section's own framing ("real where possible, honest empty state elsewhere... do not fabricate precision") is already this project's working default, independent of this spec — good news, since it means most of the *culture* here is already right; the gaps above are specific unimplemented mechanisms, not a wrong instinct. |
| 30 | Safety, Crisis, Boundaries | ❌ | See Critical Finding #1. |
| 31 | Claude Product-Decision & Escalation Protocol | — | Procedural, not code — adopted as this project's own working process starting this session (see "What this means for the next session" below). No prior session had a formal escalation-vs-decide-yourself framework this explicit; `AGENT_LOG.md`'s existing "ADR for irreversible decisions" convention already does something similar in spirit and stays fully compatible with this. |
| 32 | Failure States & Recovery | ✅ | "Loading skeleton, never fake prior data," "no data → explain what will populate," honest empty states throughout — already this project's convention in every slice built since Session 21's mockup-parity work, predating this spec. |
| 33 | Acceptance Tests | 🔶 | A genuinely useful checklist for any future session closing gaps above — most items map directly onto one of the findings/gaps in this table (e.g. "A new user with two interactions never sees a fabricated... score" directly indicts the Alignment Score finding). Worth running literally, item by item, once the safety system (Finding #1) exists, since ~9 of the ~40 acceptance-test lines are safety/healthy-use specific and can't be truthfully checked off before that's built. |
| App. A | Canonical Data Objects | — | Reference schemas for the gaps above (`AggregateDimensionState`, `CurrentReflectionSynthesis`, `KnowledgeRecommendation`, `RewardCandidate`) — none exist as named types in `packages/shared-types` today; would be authored alongside whichever gap above gets picked up first. |
| App. B | Example End-to-End Flows | — | Useful acceptance-test material once §7/§17/§23 gaps are closed enough to run them for real (e.g. Flow 1's Main Chat → Learning side panel → Mirror handoff needs §18's side-panel mechanism, which doesn't exist yet). |
| App. C | Master Claude Code Instruction | — | A condensed restatement of the whole document aimed at future Claude Code sessions specifically — worth re-reading directly (not just this audit) immediately before any future session touches Digital Twin/signals/scoring/safety/rooms. |
| App. D | Product-Definition Backlog | 🔶 | The spec's own authors already flag: a founder-authored Methodology & Source Manual (referenced by §2/§19, doesn't exist yet), the Alignment/Evolution global-index question (Finding #3), empirical calibration of any index weights, a validated archetype model, and a prompt regression/red-team suite for "fixed labels, causal overreach, score fabrication and manipulation." None of these are this project's to resolve unilaterally — they're explicitly the user's/founder's open questions. |

---

## What this means for the next session

**Update, 2026-09-03 (Session 34):** Item 3 below (Living System behaviors — §17) is now done, deployed, and
live-verified — see the table row above and `docs/AGENT_LOG.md` Session 34 for full detail. The safety/crisis
system (item 1) was already done in an earlier session. **Remaining, in the order below**: item 2 (signal
model enrichment) and item 4 (everything else in the table).

**Update, 2026-09-01:** Findings #2 (`/twin` retirement, ADR 0010) and #3 (Alignment Score gating, ADR 0011)
are done, live-verified, and closed the same day this audit was written — both were quick user decisions
followed by a same-session build, not deferred work. **Do not re-litigate either** — they're settled ADRs.

**Do not attempt to close everything else in the table above in one pass.** Per this project's own standing
protocol ("prefer finishing one vertical slice cleanly over starting two") and the spec's own §31 instruction
to build "one complete vertical slice... before expanding," the right next move is Finding #1 — the
safety/crisis system — since the spec places safety above itself in precedence and several other gaps (§2
methodology lenses, §17A relational voice) are naturally designed *around* whatever safety-state contract
gets built, not before it.

**Suggested order, pending the user's actual priorities:**
1. **Safety/crisis system (§30) — the one remaining critical finding.** Design + build. Highest priority by
   the spec's own stated precedence; touches Companion, Mirror Room and Decision Room's shared model-call
   path. This is real design work (what detection mechanism, what thresholds, how it plugs into the existing
   Bedrock call path), not a quick prompt tweak — scope it as its own session before starting.
2. ~~Signal model enrichment~~ — **partially resolved 2026-09-04, Session 35, ADR 0015.** `signal_type` and
   `prompt_ref`/`model_ref` traceability are done; `direction`/`strength` are done via a new confirm-time
   comparison against up to 5 prior confirmed signals in the same domain (live-verified: a second, similar
   signal correctly came back `recurring`, not `emerging`). **Still open**: `subdimension`, `reason_code`,
   `goal_id` (deferred by explicit scope choice — see ADR 0015's Context for why each one specifically).
3. Living System behaviors (§17: Open Threads, full Roadmap lifecycle states, interaction-mode inference) —
   the biggest net-new build in the spec, and the one with the least overlap against anything already built.
4. Everything else in the table above, roughly in the order it's listed, once 1–3 establish the underlying
   primitives (safety state, enriched signals) the rest depend on.

Per this project's own protocol, write an ADR for any of the above that becomes an irreversible or hard-to-
reverse call, and update this document's own findings to "resolved" inline rather than leaving them to
silently go stale, the same discipline `docs/PHASE_AUDIT.md` already follows.
