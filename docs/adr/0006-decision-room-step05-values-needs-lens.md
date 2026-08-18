# ADR 0006 — Step05 `values_needs` lens gets fear/desire AI suggestions

**Status:** Accepted (2026-08-18, Session 5 — Decision Room steps 3–7)

## Context

Session 5 mapped the original Decision Room UI's exact step behavior in full before porting it to the flow-engine backend (see `docs/AGENT_LOG.md`'s Session 5 part 3 entry). That mapping surfaced a real ambiguity in `apps/web/src/components/decision/Step05.tsx` ("Deep Exploration"):

- The section shown is chosen by `lens === 'pros_cons' ? [Pros, Cons] : [Desires, Fears]` — a working, clearly deliberate ternary. Both `fears_desires` and `values_needs` lenses render the identical Desires/Fears section. This part is not ambiguous.
- The AI-suggestion fetch, however, is `if (lens === 'pros_cons') { pros_cons_tags(...) } else if (lens === 'fears_desires') { fear_desire_tags(...) }` — an `if`/`else if` chain with no final `else`. `values_needs` matches neither branch, so a user on that lens sees the Desires/Fears section but gets **zero AI-suggested tags**, unlike every other lens. This looks like an oversight (a third lens option added to Step04 without the matching fetch branch being extended to cover it), not a deliberate design choice — there's no product rationale anywhere in the available source material for why `values_needs` alone should get a worse experience than `fears_desires` despite rendering the exact same UI.

Step06 ("Values & Needs") is unaffected either way — it runs unconditionally for every lens in the original, with no branching at all.

The user explicitly asked this session to decide the ambiguity and proceed, rather than leave it open.

## Decision

When porting Step05 to the flow-engine's `DEEP_EXPLORATION` step (`infra/cdk/lambda/rooms/decision-steps/deep-exploration.ts`):

- **Preserve the section choice exactly**: `values_needs` and `fears_desires` both use the Desires/Fears tag categories, matching the original ternary.
- **Extend the AI-suggestion call to also fire for `values_needs`**: both `fears_desires` and `values_needs` now trigger `fear_desire_tags`, completing what reads as an incomplete `if`/`else if` chain rather than perpetuating an asymmetry with no product rationale behind it.

This is implemented as a single `tagKindForLens()` mapping (`pros_cons` → `pros_cons`, anything else → `fears_desires`) rather than a three-way branch, since the original's actual two-way UI split (Pros/Cons vs. Desires/Fears) doesn't change — only the previously-missing suggestion call for the third lens is added.

## Consequences

- This is a genuine, if small, behavior change from what's currently shipped in `apps/web` (a `values_needs`-lens user will now get AI-suggested desire/fear tags they didn't get before). It is **not** a change to any persisted data shape — `DecisionTagItem`'s schema and the Desires/Fears categories are unchanged; only whether the suggestion fetch fires differs.
- If the user later decides `values_needs` should have gotten a genuinely distinct treatment in Step05 (not just "the same as `fears_desires`, but working"), that's a new product decision requiring a new ADR — this one only closes the "AI help silently missing for no reason" gap, it doesn't redesign the lens's Step05 experience.
- Verified end-to-end (uncommitted integration test, see Session 5 part 4 in `docs/AGENT_LOG.md`): running the full 7-step flow with `lens: 'values_needs'` confirms `DEEP_EXPLORATION`'s `REFINE` action returns a `{desires, fears}`-shaped result (via the stubbed model call) rather than nothing, and `SUBMIT_STEP` persists `desire`/`fear` tags exactly as it would for the `fears_desires` lens.
