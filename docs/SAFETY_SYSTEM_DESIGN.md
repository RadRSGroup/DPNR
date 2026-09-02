# DPNR — Safety/Crisis System Design Scope

**Written:** 2026-09-02, Session 29 part 4 (scoping only — no code changes this session). Source:
`docs/DPNR_operating_spec_principles.pdf` §30 ("Safety, Crisis, Boundaries & Respectful Interaction Contract"),
§31 ("Claude Product-Decision & Escalation Protocol"), §33's safety acceptance tests, and Appendix A/C. This
is `docs/INTELLIGENCE_SPEC_AUDIT.md`'s Critical Finding #1 — the one remaining critical finding from that
audit, and "the single highest-priority gap in the whole spec" by the spec's own stated precedence (safety
ranks above the Intelligence Spec itself, which ranks above `MVP_ARCHITECTURE.md`).

**Purpose of this document.** Per spec §31's own decision protocol, Claude must apply the source-of-truth
hierarchy and decide reversible implementation details itself, but must escalate "a new safety scenario,"
anything that "would change what becomes persistent... or how user identity is represented," and anything
requiring "a user-facing promise that is not defined anywhere." A safety/crisis system is *entirely* built out
of exactly those things — this document works through the architecture and technical approach (which mostly
resolve without escalation, since the spec already defines the required behavior precisely), then isolates
the small number of genuine open questions that need the user's explicit decision before any code gets
written, per §31's own structured-blocker format rather than an open-ended "what should I do?"

---

## 1. Where this needs to plug in (grounded in the actual codebase, not assumed)

Investigated `infra/cdk/lambda/companion/message.ts`, `lib/model-call.ts`, `rooms/command.ts`, and two step
handlers before writing anything below. Two categories of user input exist, and they need different treatment:

**A. Input that reaches the model.** Every domain (Companion, Rooms, Library, Twin extraction, Continuity)
funnels through one shared helper, `callPromptModel()` in `infra/cdk/lambda/lib/model-call.ts`, which calls
Bedrock's `ConverseCommand` and returns either a structured tool-call result or plain text. This is the single
choke point for "did this text reach a model" coverage.

**B. Input that never reaches the model at all.** Not every Room step calls the model. `mirror-steps/pattern.ts`
writes a user's free-text `copingResponse`/`recurringPattern` directly to DynamoDB with zero AI touchpoint —
by design, per that file's own doc comment ("this session's first-pass design keeps to one reflection
moment"). This is exactly the kind of raw disclosure (a coping response right after an emotionally-loaded
reaction step) a safety layer needs to see, and a design that only wraps `callPromptModel()` would silently
miss it. Coverage for this category has to sit somewhere every Room command passes through regardless of
whether that step calls the model — the natural point is `rooms/command.ts`'s dispatcher, before
`step.handle(ctx)` is invoked, checking whatever free-text fields are present in `ctx.input`.

**Companion's own path** (`message.ts`) already has one central point every chat turn passes through: right
after the raw user message is decrypted/captured (currently written to Dynamo immediately, before any model
call) and before either `callCompanionModel` or `runOnboardingTurn` is invoked. That's where classification
belongs for Companion.

**No Bedrock Guardrails resource exists today**, and the model is invoked via `ConverseCommand` (not
`InvokeModelCommand`), which means native Guardrails (via a `guardrailConfig` param on the same call) is at
least technically attachable later without a protocol migration — noted for §3 below, not part of the MVP
recommendation.

## 2. What each safety state actually requires (from spec §30, condensed to what's technically new)

| State | Trigger (per spec) | Required system behavior | Net-new work |
|---|---|---|---|
| `normal` | Ordinary reflection/conversation | No change | None |
| `deep_reflection` | Emotionally meaningful but no safety concern | Continue, monitor pacing, preserve natural stopping points | Mostly already true (existing UX); classification just needs to *not* over-trigger anything stronger here |
| `overload` | Sustained intensive reflection, fatigue signals | Offer grounding/pause/save-and-return; don't reward more intensity | **Partially exists already** — Session 22's ~20-30 min session timer + soft-stop-cue modal is this state's *time-based* trigger. A content-based trigger (explicit "I'm exhausted," "I need a break") doesn't exist yet and is genuinely new |
| `high_stakes` | Medical/psychiatric/legal/financial decisions | Limited reflective support, clarify scope, encourage qualified professional input — no diagnosis/prescription | New: detection + a bounded response pattern (prompt-level, lower risk than crisis content) |
| `safety_concern` | Credible possibility of harm to self/others, abuse, exploitation, severe disorientation | Suspend deep-work routing, clarify immediacy with minimal questions, encourage human support | New: detection + suspend-routing mechanism + human-support-routing content (**needs product input**, see §5) |
| `immediate_danger` | Imminent/immediate danger indicated | Prioritize immediate human/emergency help; stop all interpretive work until safety addressed | New: same as above, higher urgency, possibly a human-in-the-loop alert (**needs product input**, see §5) |

The minimum safety-state contract the spec defines (Appendix C) is a direct, ready-to-use schema:

```
{
  "safety_state": "normal | deep_reflection | overload | high_stakes | safety_concern | immediate_danger",
  "confidence": 0.0,
  "reason_codes": [],
  "requires_human_support": false,
  "suspend_deep_work": false,
  "locale_support_needed": false
}
```

## 3. Technical approach for detection

**Recommendation: a dedicated classification prompt, not (only) native Bedrock Guardrails.** Reasoning:

- Bedrock Guardrails' built-in content filters are tuned for generic harmful-content categories, not this
  spec's specific six-state product model (`overload` vs. `high_stakes` vs. `deep_reflection` are DPNR-specific
  distinctions no generic filter knows about).
- Guardrails only attaches at the point a model is actually called — it wouldn't cover category B above
  (Mirror Room steps that never call the model at all).
- A dedicated prompt reuses 100% of this project's existing, working machinery: a new `safety` Prompt Registry
  domain (one `classify_safety_state` prompt), forced tool-use structured output matching the schema above
  (same convention as every other structured prompt since ADR 0005), called through the same
  `callPromptModel()` helper everything else already uses. No new infrastructure pattern to invent.
- It runs uniformly regardless of whether the "main" step/turn calls a model — for category B inputs, this
  classification call *is* the only model call that turn, standing in on its own.

**Native Bedrock Guardrails is a reasonable later addition** (defense-in-depth alongside the classification
prompt, or a cheaper/faster first-pass filter before the full classification call) but isn't necessary for a
correct MVP and adds a second thing to configure/maintain — flagged in §6's staged plan as a later stage, not
blocking.

**Must run synchronously, before the main response is generated** — spec's "suspend ordinary deep reflective
routing" language only makes sense if classification happens *before* the room/companion logic proceeds, not
as a retroactive check on an already-generated reply. This roughly doubles the Bedrock calls on every
Companion turn and every Room command that touches free text — an accepted cost given the alternative is no
safety coverage at all, but worth naming as a real tradeoff (see §5, item 5).

## 4. API/data model changes this implies

**New `SafetyEventItem` schema** (`packages/shared-types`, new file e.g. `dynamo/safety.ts`):

```ts
export const SafetyEventItemSchema = z.object({
  pk: z.string(),              // USER#<id>
  sk: z.string(),              // Sk.safetyEvent(eventId) — new key helper
  eventId: z.string(),
  sourceSurface: z.enum(['companion', 'decision_room', 'mirror_room']),
  sourceSessionId: z.string(),
  safetyState: z.enum(['normal', 'deep_reflection', 'overload', 'high_stakes', 'safety_concern', 'immediate_danger']),
  confidence: z.number().min(0).max(1),
  reasonCodes: z.array(z.string()),
  requiresHumanSupport: z.boolean(),
  suspendDeepWork: z.boolean(),
  createdAt: z.string().datetime(),
})
```

**Hard rule, must be written into this schema's own doc comment (matching this project's convention of
putting spec-compliance callouts directly in code, e.g. `mirrorFlow`'s draft-status comment):** per spec §30,
*"Safety data is not identity data... must not become a Core Pillar score, archetype, personality trait,
Roadmap theme."* `SafetyEventItem` must stay structurally separate from `TwinSignalItem` — never fed into
`aggregateLifeDomains`/`aggregateArchetypes`, never classified via `twin/classify_signal`, never contributes to
the Alignment Score. This needs to be true by construction (a different item family, never queried by any of
those aggregate functions), not just by convention.

**Companion (`message.ts`)**: after classification, a `safety_concern`/`immediate_danger` result short-circuits
the normal `callCompanionModel`/`runOnboardingTurn` call and instead runs a dedicated safety-response prompt
(new `safety/respond_concern` / `safety/respond_danger` prompts) whose output replaces the normal `reply`. No
`CompanionDirective`, no reward/credit language, no room-suggestion routing — per spec's explicit "Do not use
reward language... during a safety flow."

**Rooms (`command.ts`)**: a `safety_concern`/`immediate_danger` result on a command's free-text input needs a
new response shape, since today `command.ts` always returns a `StepResult` from `step.handle()`. This is a
real, if small, API contract change — `RoomCommandResponseSchema` needs a variant (e.g. a `safetyIntervention`
branch) so the frontend can render a safety-first screen instead of continuing the room's normal step flow.
`StepShell.tsx`/`MirrorStepShell.tsx` need a new render branch for this, parallel to (but distinct from) the
existing soft-stop-cue modal.

**`high_stakes` is lower-risk and simpler**: no suspend-routing needed, no crisis-content sourcing needed —
just a bounded response pattern (acknowledge, clarify scope, encourage professional input, no diagnosis) that
can ship as ordinary prompt work once the classification pipeline exists.

## 5. Decisions — resolved 2026-09-02, same session, via structured questions (see ADR 0012)

Per spec §31, these were exactly the categories that must escalate — a new user-facing promise, a decision
that changes persistence/privacy scope, or a business/ops call. Presented as structured choices with a
recommended option each; the user chose the recommended option in all three cases.

1. **Human-support routing content for `safety_concern`/`immediate_danger`: generic, locale-agnostic message
   for now.** No specific hotline numbers ("please reach out to a trusted person, a qualified professional, or
   local emergency services") — avoids the real harm of a wrong/outdated number, appropriate given no real
   users exist yet (ADR 0007: internal/founder testing only). **Revisit with real locale-aware crisis-line
   content before any real user is ever invited past internal testing** — this generic message is explicitly
   not launch-ready, same class of time-boxed exception as ADR 0007's plaintext-crypto-stub scope.
2. **Retention policy for `SafetyEventItem`: 90-day TTL.** Matches spec's "minimum necessary retention"
   language; auto-expires via DynamoDB TTL, the same mechanism session tickets already use — no manual cleanup
   Lambda needed.
3. **Human-in-the-loop alerting: yes, alert on `immediate_danger`.** During founder-only internal testing, the
   AI's safety response is the only thing that happens otherwise — a live alert means a human actually knows if
   this ever fires for real, not a database row nobody checks. Implementation mechanism not yet decided (see
   §7 Stage 1 note) — likely SNS → email, reusing the same pattern Session 4 already set up for AWS Budget
   alerts (`dpnr-monthly-dev-budget`), which is an implementation detail, not a product decision requiring
   further escalation.

**Cost/latency tradeoff (not escalated, noted for awareness):** classification roughly doubles Bedrock calls
on every Companion turn and free-text-bearing Room command. Accepted as a necessary cost given the
alternative is no safety coverage at all — a cheaper/faster classifier model is a possible later optimization
(§7 stage 4), not a blocker now.

## 6. What I can decide without escalating (per spec §31's "reversible implementation detail" carve-out)

- Keeping the new safety classifier separate from the existing session-timer/soft-stop-cue mechanism (Session
  22) rather than merging them — the spec's own table already treats `overload` (pacing, time-based) and
  `safety_concern` (content-based) as distinct states, so this is following an existing distinction, not making
  a new one.
- The specific schema shape/field names for `SafetyEventItem`, the new Prompt Registry `safety` domain
  structure, and where exactly in `command.ts`/`message.ts` the classification call is inserted — these are
  implementation details that don't change user-facing meaning.
- Using a dedicated classification prompt over native Guardrails for the MVP (per §3's reasoning) — a
  reversible technical choice, not a product-meaning decision.

## 7. Suggested staged build

Mirrors the staging discipline Session 28 used for the crypto contract work (small, verifiable, independently
committable stages):

1. **Stage 1 — DONE, deployed, live-verified (2026-09-02).** `SafetyEventItem` schema (90-day TTL, ADR 0012)
   in `packages/shared-types/src/dynamo/safety.ts`; new `safety` Prompt Registry domain
   (`infra/cdk/scripts/safety-prompts.seed.ts`: `classify_safety_state` forced-tool-use, plus
   `respond_concern`/`respond_danger` plain-text prompts using §5's generic locale-agnostic content);
   `classifySafety()`/`generateSafetyResponse()` in `infra/cdk/lambda/lib/safety.ts`; wired into
   `companion/message.ts` ahead of the normal reply path. `dpnr-safety-alerts` SNS topic
   (`infra/cdk/lib/api-stack.ts`) fires on `immediate_danger` specifically, per ADR 0012 — email subscription
   added post-deploy via `aws sns subscribe` (not committed into CDK source, matching the `dpnr-monthly-dev-budget`
   precedent). `dpnr-application`'s table definition gained `timeToLiveAttribute: 'ttl'` (online, non-replacing
   change) so `SafetyEventItem`'s TTL actually expires rows. **Live-verified against real deployed AWS** with a
   throwaway Cognito user: a normal message passed through unaffected (no `SafetyEventItem` written); a
   passive-ideation message correctly classified `safety_concern` (confidence 0.92, reasonCodes
   `passive_suicidal_ideation`/`hopelessness_statement`/`burden_belief`) and produced a calm, generic,
   non-alarmist reply with no specific hotline named; an active-plan message correctly classified
   `immediate_danger` (confidence 1.0) and produced an urgent-but-calm reply directing to immediate human help.
   The SNS publish itself succeeded (clean Lambda logs, no errors) but the subscribed email address hadn't
   confirmed its SNS subscription yet at verification time — real alert *delivery* end-to-end (not just
   publish) remains to be confirmed once that confirmation happens. All test data deleted and confirmed gone
   afterward. See `docs/AGENT_LOG.md` Session 29 part 5 for the full account.
2. **Stage 2 — DONE, deployed, live-verified (2026-09-02).** `rooms/command.ts`'s dispatcher now runs
   `extractFreeTextForSafetyCheck()` (`lib/safety.ts`) — a documented length-floor heuristic (≥20 chars) over
   every string value in the command's `input` bag, since Room input ranges from real free-text disclosures to
   short structural values (an option label, a lens slug) that don't need a classification call at all — before
   any credit is consumed or the step's own `handle()` runs. A `safety_concern`/`immediate_danger` result
   bypasses `step.handle()` entirely (`stepResult = {nextStepId: null, result: {}}`) and populates a new
   `RoomCommandResponse.safetyIntervention` field (`packages/shared-types/src/api/command-contract.ts`) instead.
   The session's `currentStepId` deliberately does NOT advance and `status` stays `active` — "suspend ordinary
   deep-work logic... until safety is addressed" means parking the session where it is, not silently completing
   or skipping it. New shared `apps/web/src/components/shared/SafetyInterventionScreen.tsx`, wired into both
   `decision/new/page.tsx` and `mirror/new/page.tsx`'s `renderStep()` — deliberately the opposite shape of the
   existing soft-stopping-cue modal: only a "Return to Dashboard" way out, no "keep going," since ordinary
   pacing fatigue and a real safety concern call for opposite affordances. `respond_concern`/`respond_danger`
   (Stage 1) were generalized from "You are DPNR's Companion" to "You are DPNR" so the same two prompts serve
   both surfaces without a fork. **Live-verified against real deployed AWS**: Mirror Room's `PATTERN` step
   (which has **zero AI touchpoint of its own** — exactly the "category B" gap that motivated this whole
   design) correctly classified a concerning `copingResponse` as `safety_concern` and returned the intervention
   instead of running its own handler (confirmed via the response's empty `result: {}` and the session staying
   parked at `currentStepId: PATTERN`); Decision Room's `MAP_OPTIONS` step (which does call the model normally)
   correctly classified an `immediate_danger` narrative and bypassed `MAP_OPTIONS`'s own handler the same way.
   Both `SafetyEventItem`s persisted with the correct `sourceSurface` (`mirror_room`/`decision_room`). An
   ordinary SITUATION/AUTOMATIC_REACTION exchange along the way was correctly left alone (one even correctly
   logged as `deep_reflection`, not `safety_concern` — real workplace frustration, appropriately distinguished
   from a safety concern). All test data deleted and confirmed gone afterward. See `docs/AGENT_LOG.md` Session
   29 for the full account.
3. **Stage 3 — DONE, deployed, live-verified (2026-09-02), Companion only by deliberate scope decision.** Two
   new plain-text prompts (`safety/respond_high_stakes`, `safety/respond_overload`) and
   `generateSafetyResponse()`'s prompt-name mapping widened to all four non-`normal`/non-`deep_reflection`
   states via a lookup table. `companion/message.ts`'s short-circuit condition widened from
   `safety_concern`/`immediate_danger` to also cover `high_stakes`/`overload`. **Deliberately NOT wired into
   Rooms' `command.ts`** — reasoned out and documented directly in `companion/message.ts`'s own comment: Rooms'
   only existing mechanism for a non-normal state is the Stage 2 `safetyIntervention` branch, which fully
   bypasses the step and parks the session — exactly right for `safety_concern`/`immediate_danger` ("suspend
   until safety is addressed"), but wrong for these two lower-urgency states (getting a Room session
   permanently stuck over "I'm tired" would be a real regression). Rooms still **classify and log**
   `high_stakes`/`overload` (any non-`normal` state gets a `SafetyEventItem` regardless of surface — this was
   already true, not new to Stage 3), just without acting on them yet; a real Rooms-side UI for these two softer
   states (e.g. triggering the existing time-based soft-stopping-cue modal early for `overload`, or a
   dismissible "consider a professional" banner for `high_stakes` that lets the step still proceed) is real,
   scoped-out future work, not done here. **Live-verified against real deployed AWS**: a medical-decision
   message correctly classified `high_stakes` (confidence 0.95, `suspendDeepWork: false`) with a warm reply
   that redirected to the person's own doctor without diagnosing; an explicit-fatigue message correctly
   classified `overload` (confidence 0.95) with a gentle reply confirming nothing is lost by pausing, no reward
   language; a follow-up ordinary message confirmed Companion resumes normal conversation immediately after
   either state (no lasting lock-out, unlike Rooms' Stage 2 mechanism — a real, deliberate asymmetry, not an
   oversight). Separately confirmed via a real Mirror Room `SITUATION` submission with medical-decision content
   that Rooms correctly logs `high_stakes` (`SafetyEventItem` persisted, `sourceSurface: mirror_room`) while
   the step still advances normally (`safetyIntervention: null`, `nextStepId` set) — proving the "detect only,
   don't act" scope boundary is real, not just documented intent. All test data deleted and confirmed gone
   afterward. See `docs/AGENT_LOG.md` Session 29 for the full account.
4. **Stage 4 — DONE, deployed, live-verified (2026-09-02, same day as Stages 1-3).** Native Bedrock Guardrails
   as defense-in-depth (`infra/cdk/lib/api-stack.ts`'s `SafetyGuardrail`: HATE/INSULTS/MISCONDUCT/PROMPT_ATTACK/
   SEXUAL/VIOLENCE content filters at `HIGH` strength plus a custom `self_harm_and_suicide` denied topic —
   every filter/topic action is `NONE`/detect-only, so this never blocks a request, it only feeds
   `model-call.ts`'s new `logGuardrailIntervention()`, a structural, content-free CloudWatch line (filter/topic
   type, confidence, action — never the assessed text itself, matching this project's "no raw payloads in
   logs" guardrail). Wired only into `lib/safety.ts`'s two calls (`classifySafety`/`generateSafetyResponse`),
   not the other 8 Prompt Registry domains — this is deliberately scoped to the safety pipeline itself, not a
   product-wide moderation layer. Cost optimization: `classify_safety_state` alone (not the `respond_*`
   prompts) now runs on Claude Haiku 4.5 instead of Sonnet 4.5 — validated first via a real 6-case
   side-by-side comparison against both models (one message per safety state) before switching: identical
   `safetyState` on all 6 cases, ~45% lower latency, meaningfully cheaper. One honest, documented gap from
   that comparison: Haiku set `suspendDeepWork:true` on the `overload` case where Sonnet correctly set it
   `false` — currently harmless since no caller reads that field for `overload`, flagged in
   `safety-prompts.seed.ts`'s own comment for anyone who starts reading it later. Threshold calibration itself
   is still explicitly NOT done — no real usage data exists yet (only throwaway founder-test traffic), matching
   spec Appendix D's own "adjustable after controlled testing" framing; the new Guardrail telemetry from this
   stage is what a future session would actually calibrate against, once real data exists.
   **A real production bug was found and fixed during this stage's own live-verification, not by design
   review** — the first deploy attempt authorized the Haiku model/inference-profile ARNs nowhere in IAM
   (`grantBedrockConverse` only ever covered the Sonnet resources), so every `classify_safety_state` call
   failed `AccessDenied` and silently degraded to the spec-mandated `normal` fallback
   (`lib/safety.ts`'s own documented failure behavior) — meaning **the entire safety classification pipeline
   was non-functional for the ~9 minutes between that deploy and the fix**, confirmed via real throwaway-user
   traffic during that exact window (a "safety_concern" test message got a generic, off-topic reply; a real
   "immediate_danger" message got a reply that improvised crisis language including named hotlines — 988,
   741741 — because it went through the **normal** Companion path, not the designed `respond_danger` prompt,
   purely because Sonnet's own general safety training organically surfaced US-specific hotline numbers when
   given free rein; this is what actually violated ADR 0012 decision #1's "never name a specific hotline"
   rule, not a defect in `respond_danger`/`respond_concern`'s own prompt text). Fixed with a second, narrowly-
   scoped `grantHaikuConverse` helper (mirroring `grantBedrockConverse`, applied only to
   `companionMessageFn`/`roomsCommandFn` — the two functions that actually call `classifySafety`), redeployed,
   and re-verified: zero `AccessDenied` errors afterward, real `SafetyEventItem` rows persisted with correct
   states/confidences/reason codes for `safety_concern`/`immediate_danger`, and crisis responses reverted to
   fully generic language with zero named hotlines once the intended prompt path actually ran. A second, much
   smaller deploy-time fix: Bedrock rejects `PROMPT_ATTACK`'s output side at anything but `NONE`/disabled
   (prompt injection is an input-only concept) — caught by a real `CREATE_FAILED` on the first deploy attempt,
   not by reading docs first.
   **This is the practical lesson worth carrying forward**: a model swap on a safety-critical classification
   path needs its own IAM grant verified as part of the SAME deploy, not assumed to ride along on an existing
   grant scoped to a different model — the existing `BEDROCK_INFERENCE_PROFILE_ID` comment in `api-stack.ts`
   already said "if a future prompt is seeded against a different model, extend the resources... rather than
   widening to a blanket wildcard," which is exactly the gap this session's first attempt fell into by adding
   the model swap without reading that comment's own instruction closely enough.

## 8. How to know it's actually done

Spec §33 already provides a checklist — the safety/healthy-use subset applies directly once this is built:
a 25+ minute session can surface a pause cue without lockout; repeated deep work doesn't increase reward
eligibility; ordinary sadness/anger isn't routed into a crisis state; a credible safety concern suspends
ordinary routing; immediate danger prioritizes human help and stops interpretive work; safety data never
becomes a Digital Twin trait/score; high-stakes requests get a professional boundary, not authoritative
instruction; a rude/charged user isn't shamed. Re-run these literally against the built system before calling
any stage "done," not just against this design.
