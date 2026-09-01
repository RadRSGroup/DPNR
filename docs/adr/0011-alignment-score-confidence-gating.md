# ADR 0011 — Confidence-gate the Alignment Score instead of retiring it

**Status:** Accepted (2026-09-01, Session 29 — Intelligence Spec alignment work)

## Context

`docs/DPNR_operating_spec_principles.pdf` §11 ("Numbers, Scores & Reflection Indices") requires that before
any reflection-index number appears, the construct must be operationally defined, component inputs must have
defined evidence sources, minimum evidence/source/time thresholds must be met, and confidence must be above a
configured threshold. §12 gives a concrete table (`Insufficient: <5 meaningful items OR <2 sources OR <14-day
span`, `Developing: threshold met, confidence <0.65`, `Eligible: confidence ≥0.65`). Appendix D's Product-
Definition Backlog separately lists *"Decision on whether any global Alignment/Evolution index provides
enough value to justify keeping it"* as an open, unresolved question the spec's own authors haven't settled.

`infra/cdk/lambda/lib/alignment-score.ts` computes a real 0–100 "Alignment Score" (60% commitment follow-
through + 40% confirmed-values clarity), shown on Dashboard and charted daily on My Evolution Map, with no
confidence gating at all — it returns a number the moment a single resolved commitment or single confirmed
value signal exists. `docs/INTELLIGENCE_SPEC_AUDIT.md` flagged this as Critical Finding #3: the project had
already shipped exactly the kind of global index the spec's own authors flag as undecided, with none of §12's
required gating.

Presented to the user as a three-way choice: (a) keep it and add real confidence-gating, (b) retire the
number entirely in favor of qualitative language, or (c) keep it exactly as-is as a deliberate spec
divergence. The user chose (a), the audit's own recommended option.

## Decision

`computeAlignmentScore()` now returns a discriminated `{ state: 'insufficient' | 'developing' | 'eligible',
score? }` result instead of a bare `number | null`, gated as follows (adapted from spec §12's table to this
score's two actual evidence types — resolved commitments and confirmed `domain='value'` Twin signals — since
neither the spec's exact evidence/source/time formula nor a validated confidence model exists for this
specific index):

- **Insufficient** (no number, no "picture forming" language either — the honest "still learning" state) when
  evidence count < 5, source diversity < 2 (Twin-signal `source` values plus "commitment follow-through" as
  one more source type), or the evidence's time span < 14 days.
- **Developing** (thresholds met, but a composite confidence proxy — weighted from evidence count, time
  span, and source diversity — is below 0.65): shown as "Picture forming…", still no number.
- **Eligible** (confidence ≥ 0.65): the actual 0–100 score is computed and shown, exactly as before.

`DashboardResponseSchema` gained `alignmentScoreState` alongside the existing (now conditionally-null)
`alignmentScore` field, so the frontend can render the correct honest message instead of a single generic
"not enough data" fallback for every non-eligible case. `snapshot-alignment-score.ts` (the daily-history
writer behind My Evolution Map's chart) now only writes a snapshot when `state === 'eligible'` — a
`developing`-state day correctly contributes no history point, same as before this ADR, just now for the
right reason.

The **weights, thresholds, and confidence formula themselves remain exactly the "first pass, not product-
reviewed" status they already had** (`alignment-score.ts`'s own long-standing doc comment) — this ADR closes
the *gating* gap the spec requires, it does not claim the underlying formula is now validated. That stays
open per Appendix D.

## Consequences

- The score's own weighting/formula is unchanged — this is additive gating logic in front of the existing
  computation, not a rewrite of what the score means.
- **Correction (same session, caught before this ADR's first draft was even a day old): the Dashboard test
  described in an earlier draft of this section did NOT actually verify this change live.** `Dpnr-Api` was
  last deployed 2026-08-28 (Session 27's Slice 6 deploy) — before this session's Lambda code changes — and
  was never redeployed this session. The dev-server test against the real API therefore exercised the OLD,
  still-deployed `dashboard/handler.ts`/`alignment-score.ts`, not the new gating logic. It happened to show
  "Still learning this part of you" either way: with 0 confirmed value signals and 0 resolved commitments in
  that specific test, the *old* ungated code also returns `null` (`followThroughRate === null && valuesClarity
  === 0`) — so the observed result was consistent with the new code without actually being evidence of it.
  **This gating change is therefore verified by code/type inspection and the local build only
  (`packages/shared-types`, `infra/cdk`, `apps/web` all typecheck/lint/build/synth clean — see Session 29's
  `docs/AGENT_LOG.md` entry for exact commands), NOT by a live pass against deployed AWS.** Deploying
  `Dpnr-Api` and re-verifying with a test scenario that actually distinguishes old from new behavior (e.g.
  exactly 1 confirmed value signal: old code shows a number immediately — `round(0.4 * 20) = 8` — new code
  correctly shows "insufficient," since evidence count 1 < 5) is real remaining work, gated on the user's
  explicit deploy go-ahead per this project's standing AWS-deploy guardrail — not done as part of this ADR.
- The `developing` state (thresholds met, confidence still low) has not been live-verified at all yet, deployed
  or not — reaching it needs ≥5 resolved commitments/confirmed value signals spanning ≥14 days of `createdAt`
  timestamps (backdatable via direct `dynamodb put-item`, same technique used elsewhere this session).
- If a future session wants to empirically calibrate the confidence formula, weights, or thresholds against
  real usage data (Appendix D's own recommendation), that's a separate, later decision — this ADR only
  establishes that gating exists and roughly matches spec §12's shape, not that the specific numbers in it are
  final.
