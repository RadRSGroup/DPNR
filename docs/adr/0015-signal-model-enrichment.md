# ADR 0015 — Signal-model enrichment: signal_type, direction, strength, traceability

**Status:** Accepted (2026-09-04, Session 35 — Intelligence Spec §7/§28 alignment work)

## Context

`docs/INTELLIGENCE_SPEC_AUDIT.md` §7 flags `TwinSignalItemSchema` as missing several fields the
operating spec's `Signal{}` schema treats as required: `subdimension`, `direction`
(emerging/recurring/increasing/decreasing/stable/mixed), `strength` (distinct from `confidence`),
`reason_code`, `prompt_ref`/`model_ref` (no traceability field at all — also a §28 gap), and
`goal_id`. It also flags `signal_type` (explicit_statement/user_choice/model_inference/
real_world_followup) as conflated with the existing `source` field (mirror_room/decision_room/
companion/onboarding/explicit_user_input) — the spec treats *how a signal was derived* and *where
it came from* as two separate facts.

Presented to the user as a scope choice (AskUserQuestion): narrow (traceability + `signal_type`
only), medium (also build `direction`/`strength`), or everything including `goal_id`/`reason_code`/
`subdimension`. The user chose the medium option.

`direction`/`strength` are the harder pieces — no mechanism anywhere in the pipeline compares a
new signal against a user's history. `goal_id` has nothing to reference yet (Roadmap is freeform
`currentFocus`/`theme`/`direction` text, not discrete goals) and `reason_code`'s exact spec
taxonomy wasn't independently re-verified against `docs/DPNR_operating_spec_principles.pdf` this
session (`pdftoppm`/poppler isn't installed in this environment to re-render it — relying on the
Session 29 audit's own paraphrase for everything in this ADR). Both, plus `subdimension`, are
deliberately deferred, not silently dropped — flagged in `docs/AGENT_LOG.md`.

## Decision

**Schema** (`packages/shared-types/src/dynamo/twin.ts`): `TwinSignalItemSchema` gains five new
**optional** fields — `signalType`, `direction`, `strength`, `promptRef`, `modelRef` — same
"absent for signals created before this existed" convention `lifeDomain`/`archetype`/
`sourceSessionId` already use. Two new enums: `SignalTypeSchema` and `SignalDirectionSchema`.

**`signal_type` mapping.** Both real signal-creation paths already reduce to one of two values:

- Rooms candidate extraction (`rooms/twin-signals.ts`, from a session summary) → `model_inference`
  — genuinely inferred from indirect content, never a verbatim statement.
- Onboarding's two always-pre-confirmed signals (`companion/message.ts`'s `persistInitialRoadmap`)
  → `explicit_statement` — grounded in that function's own pre-existing doc comment ("the person is
  directly stating their own focus in conversation, not being inferred about from indirect
  behavior"), not a new interpretation invented for this ADR.

`user_choice`/`real_world_followup` have no real call site today (no direct-user-add-a-signal UI
exists) — same honest-gap treatment this codebase already gives other currently-unreachable enum
values (e.g. `noActionReason`, the Alignment Score's `developing` state).

**Traceability (`promptRef`/`modelRef`).** Both creation sites already resolve a
`PromptVersionItem` before writing a signal — stamped using the exact `promptRef(domain, name,
version)` convention `SessionSummaryItem.promptRef` already established, plus the raw
`modelParams.model` Bedrock id.

**`direction`/`strength` derivation.** Computed at confirm-time, folded into the existing
`twin/confirm.ts` → `lib/signal-classification.ts::maybeClassifySignal` trigger (same point
`lifeDomain`/`archetype` are already set, same non-fatal/never-throws convention):

- Query up to 5 other `confirmed` signals in the same domain, most-recently-updated first (same
  "query the TWIN#SIGNAL# prefix, filter in JS" approach `twin/helpers.ts`/`twin/list.ts` already
  use — no new index), decrypt their descriptions, and pass them to an extended `twin/
  classify_signal` prompt call as `{{priorSignalsInDomain}}`.
- The prompt's forced-tool-use output now also requires `direction` (the spec's 6-value enum,
  judged against that evidence — `emerging` when the list is empty) and `strength` (0–1,
  explicitly instructed as "how strong/central this pattern is in the person's life" — **distinct
  from `confidence`**, which stays "how certain the extraction accurately reflects what was
  said"). A malformed value for either is skipped independently — same tolerant handling
  `lifeDomain`/`archetype` already get, doesn't block the confirm action.
- **Onboarding's two signals bypass this entirely.** They're — by construction — always the
  first-ever signal in their domain for a brand-new user (onboarding runs once), and they're
  already `confidence: 1`, unambiguous. Rather than invoke a model call whose answer is
  predetermined, they're hardcoded `direction: 'emerging'`, `strength: 1` at creation. (These two
  signals never flow through `twin/confirm.ts` at all — a pre-existing gap, unchanged by this ADR.)

**API surface.** `GET /v1/twin`'s response (`TwinListResponseSchema`) gains `signalType`/
`direction`/`strength` — same "flat data, not presentation logic" treatment `lifeDomain`/
`archetype` already got (Session 19 added the fields; a later slice built the Dashboard
aggregates — no new UI this session either). `promptRef`/`modelRef` are deliberately **not**
exposed there — internal traceability, not user-facing product data; a real GDPR export
(`account/export.ts`) already returns raw stored item fields, so they're still available there
without any change.

## Consequences

- `subdimension`, `reason_code`, and `goal_id` remain open — tracked in `docs/AGENT_LOG.md`'s
  "Prompt for next agent", not silently dropped. `goal_id` in particular can't be built
  meaningfully until a first-class goal entity exists.
- The `twin/classify_signal` prompt template changed (new `{{priorSignalsInDomain}}` variable,
  extended output schema) — per this repo's own seeding convention (`seed-prompt-registry.ts`
  always rewrites every prompt to version 1 and repoints `prod`, it isn't an accretive versioning
  system), this is an edit-in-place + full reseed, not a new "v2" alias.
- `direction`/`strength`'s accuracy is unvalidated against real signal data — same "design-level
  first draft, needs product review before the *behavior* is treated as final" status every other
  net-new Twin/Rooms/Mirror prompt gets before its own review (see `twin-prompts.seed.ts`'s
  existing doc comment, now extended to cover this too).
- **Deployed and live-verified against real AWS, not a mock.** `Dpnr-Api` deployed clean (43/43
  resources, 27s), then `npm run seed:prompt-registry` reseeded all 30 prompts including the
  extended `twin/classify_signal`. A throwaway vitest script (`apps/web/src/lib/auth/__verify__/
  session35-live.test.ts` — written, run, deleted before session end, same convention as every
  prior session's integration script) signed up a real Cognito test user, bootstrapped real keys
  and an `active_session` ticket, then:
  - Drove onboarding through all 8 turns to a forced conclusion. Both resulting signals
    (`current_focus`, `direction` domains) confirmed via direct `aws dynamodb`-equivalent query:
    `signalType: 'explicit_statement'`, `direction: 'emerging'`, `strength: 1`, real
    `promptRef: 'companion/onboard@v1'` and a real `modelRef` — exactly as designed, no model call
    needed for these two.
  - Drove a real Mirror Room session to completion (a workplace over-apologizing-to-authority
    scenario). The extracted candidate signal (domain came out `commitment`, not `pattern` —
    a legitimate model judgment call, not a bug) carried `signalType: 'model_inference'` and a
    real `promptRef: 'twin/extract_signals@v1'`/`modelRef`, and correctly had **no** `direction`
    yet (unset until confirm). Confirming it via `POST /v1/twin/signals/{id}/confirm` correctly
    set `direction: 'emerging'` (the first confirmed signal in that domain) and a real
    `strength: 0.35`.
  - Drove a second Mirror Room session with a deliberately similar/recurring version of the same
    scenario. Its extracted candidate landed in the **same** domain as the first (confirming the
    comparison mechanism had real prior evidence to reason against, not an empty list by luck).
    Confirming it correctly returned `direction: 'recurring'` — not `'emerging'` — with
    `strength: 0.55`, proving the model genuinely used `{{priorSignalsInDomain}}` rather than
    always defaulting to `'emerging'`.
  - Full cleanup confirmed independently after the fact: 0 remaining `dpnr-application` rows for
    the test user, Cognito user deleted.
