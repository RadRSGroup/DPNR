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
- **Correction (same session, caught before this ADR's first draft was even a day old): an earlier draft of
  this section wrongly claimed the Dashboard test proved this change live.** `Dpnr-Api` hadn't been redeployed
  since 2026-08-28 (Session 27's Slice 6 deploy) at the time that test ran, so it actually exercised the OLD,
  still-deployed `dashboard/handler.ts`/`alignment-score.ts`. It happened to show "Still learning this part of
  you" either way given that test's specific data (0 confirmed value signals, 0 resolved commitments — the old
  ungated formula also returns `null` there), so the mistake wasn't obvious at the time. That earlier draft
  also got its own hypothetical old-code example wrong (claimed `round(0.4 * 20) = 8`; the actual old formula
  for 1 confirmed value signal and 0 commitments is `Math.round(valuesClarity)` since `followThroughRate` is
  `null`, i.e. `round(20) = 20`, not 8) — worth noting since it shows why a real live test beats a hand-worked
  example, below.
- **Real live verification, same day, after the user approved deploying `Dpnr-Api`.** Deployed cleanly (34/34
  resources `UPDATE_COMPLETE`, `DashboardFn`/`SnapshotAlignmentScoreFn` both rebundled with the new code).
  Verified with a fresh throwaway Cognito user and a direct authenticated `fetch()` against the real API (not
  just the rendered page) for an unambiguous read of the actual response body:
  - **Insufficient**: seeded exactly 1 confirmed value signal. `GET /v1/dashboard` returned
    `{alignmentScore: null, alignmentScoreState: "insufficient"}` — proof the new gating is live (the field
    didn't exist in the old response shape at all, and the old code would have returned a bare `20`, not
    `null`, for this exact data). Dashboard UI correctly rendered "Still learning this part of you," no ring.
  - **Eligible**: seeded 5 more confirmed value signals (6 total), 2 distinct `source` values, backdated
    `createdAt` spanning 32 days. `GET /v1/dashboard` returned `{alignmentScore: 100, alignmentScoreState:
    "eligible"}` — an exact match for the hand-computed prediction (`valuesClarity = min(100, 6/5*100) = 100`,
    `confidence = 0.5·(6/10) + 0.3·min(1, 32/30) + 0.2·(2/3) ≈ 0.733 ≥ 0.65`). Dashboard UI correctly rendered
    a "100%" ring.
  - **Snapshot job**: manually invoked `SnapshotAlignmentScoreFn` directly (`aws lambda invoke`) against the
    eligible test user and confirmed via `dynamodb get-item` that it wrote a real `ALIGNMENT#SNAPSHOT#<date>`
    item with `score: 100` — the daily-history writer respects the new gating too, not just the read path.
  - Test user and all 13 resulting DynamoDB rows deleted and confirmed gone (`Count: 0`); Cognito user deleted;
    Browser-pane `localStorage`/cookies cleared.
  - **The `developing` state remains the one state not directly observed** — reaching it needs evidence that
    meets the count/source/time thresholds but keeps the confidence proxy below 0.65 (e.g. fewer sources or a
    shorter time span than the eligible test above); the formula was exercised and matched by hand for the
    eligible case, which is the same formula `developing` falls out of, so this is a real but low-risk gap, not
    an unverified code path.
- If a future session wants to empirically calibrate the confidence formula, weights, or thresholds against
  real usage data (Appendix D's own recommendation), that's a separate, later decision — this ADR only
  establishes that gating exists and roughly matches spec §12's shape, not that the specific numbers in it are
  final.
