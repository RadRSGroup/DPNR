# First-Time Onboarding — Scoping (docs/AGENT_LOG.md Session 51/52)

Scopes `DPNR_First_Time_Onboarding_MVP_Implementation_Guide_v3.pdf` (repo root,
added by the user 2026-09-15) against the real live codebase. **Research and
planning only — no code changes in this pass**, matching the same
survey-before-build discipline `HEBREW_LOCALIZATION_PLAN.md` used before its
Slice A started.

**All five architectural forks below (§5) are now settled — answered by the
user directly, 2026-09-15, same session.** §3/§4 reflect the settled shape.
Slice A can start from this doc without re-litigating any of them.

## 1. What the reference doc actually specifies

A five-screen, mostly-deterministic (not AI-conversation-driven) sequence that
runs once, right after a not-yet-built "WOW VIDEO":

```
First Login → WOW VIDEO → Interactive Onboarding → First Coordinates → Personalized DPNR Experience
```

**Interactive Onboarding** = four tap-to-choose cards (`CURRENT_STATE` single
choice from 7 options, `ACTIVE_DOMAINS` up to 3 of 10, `DESIRED_STATES` up to 3
of 10, `INTERACTION_PREFERENCE` single choice from 6) + one optional free-text
question (`CURRENT_INTENTION`, "Skip for now" available) → a `FIRST_SNAPSHOT`
summary card ("First Coordinates") the user confirms with Yes/Partly/Not quite.
The reference screenshot (`Onboarding reference.png`) shows this rendered
**inside the Main Chat conversation area itself** — a Companion message bubble
introduces it, then a numbered progress bar ("1/4") and an image-tile card
grid, composer still visible below — not a separate full-screen route the way
`/consent`/`/profile-setup` are.

Explicitly out of scope for this doc: the WOW VIDEO itself (a ~1min creative
asset "developed and supplied separately by Lital"), any Living Map / 3D /
graph visualization (explicitly deferred to a future concept — this MVP only
needs the data stored so a Living Map *could* read it later).

**Separate, adjacent doc — not scoped here**: `DPNR_Main_Chat_UX_Update_MVP.pdf`
+ `CHAT UX.png`/`CHAT UX 2.png` describe unrelated Main Chat visual polish
(a customizable chat background, the top-right profile photo — already shipped
this session's `/profile-setup` + Account/Sidebar work — a visual Pull-a-Card
reskin, a Focus Mode/music widget, a single "12 min today" indicator). Flagged
for its own separate scoping pass if/when the user wants it; not part of this
plan.

## 2. Current-state audit — what's reusable vs. genuinely new

| Doc concept | Real equivalent today | Verdict |
|---|---|---|
| Card-based, in-chat structured UI | `CompanionDirective` + `DirectiveCard`, rendered inline under a chat message (`companion/page.tsx`) | **Close but not identical** — directives are model-issued per-reply; onboarding cards need a client-driven, fixed 4-step sequence that runs before any real AI turn. See §5.1. |
| "Interactive Onboarding" (deterministic card taps) | The **existing** AI-conversational onboarding (`runOnboardingTurn`, `infra/cdk/lambda/companion/message.ts`, Session 15, spec's "Golden Path A steps 5–8") — free-text back-and-forth, model decides `readyForRoadmap`, writes the real `RoadmapItem` + first Twin signals | **Real overlap, not a gap.** A working, AI-driven onboarding already exists and already produces the same kind of "first understanding" output this doc calls `FIRST_SNAPSHOT`. See §5.1 — this is the single biggest open question. |
| `FIRST_SNAPSHOT` (`current_state`, `focus_domains[]`, `desired_states[]`, `interaction_style`, `current_intention`) | `RoadmapItem.content` (`currentFocus`, `theme`, `direction`, `suggestedSpaces`) — already built, already the thing Dashboard shows as the user's first real personalization | **Semantic overlap.** Shipping both as separate, differently-shaped "here's what DPNR understands about you" summaries risks a confusing double-first-impression. See §5.2. |
| `ACTIVE_DOMAINS` (10: Me/Love/Family/Friends/Work/Money/Body/Growth/Purpose/Fun), `DESIRED_STATES` (10: Clarity/Peace/Energy/Connection/Confidence/Freedom/Direction/Fun/Courage/Space) | Three separate "life domain"-shaped taxonomies already exist and are already flagged as unreconciled tech debt (`INTELLIGENCE_SPEC_AUDIT.md` §4, `docs/AGENT_LOG.md` Sessions 45/46): `LifeDomainCategorySchema` (7 values, Growth Tracker/Dashboard), Library's `lifeDomains` (free-form array), `GuidanceCardItemSchema.lifeDomain` (Pull-a-Card's own enum) | **Would be a 4th/5th independent taxonomy if built as literally specified.** See §5.3. |
| `INTERACTION_PREFERENCE` (6 options: understand it / give me perspective / ask the right question / help me make a move / space to talk / depends) | `InteractionModeSchema` (9 values: share/be_heard/understand/explore_pattern/decide/learn/act/regulate/unknown) — already computed **per-message** by `classify_interaction_mode` and threaded into every Companion reply | **Overlapping purpose, different mechanism** (one-time user choice vs. per-turn AI classification). See §5.3. |
| "Something to Explore" (Library topic), "Reflection for Today" (Pull-a-Card) on first entry | `GET /v1/library/recommendations` (Session 24, ranks by confirmed Twin-signal domain) and Companion's context-aware Pull-a-Card selection (Session 46, ranks by the same signals) — **both already exist and already do exactly this** | **Fully reusable as-is** — the gap is only that a first-session user has zero confirmed Twin signals yet, so both currently fall back to their already-built zero-signal defaults (uniform pick / no ranking). Feeding `FIRST_SNAPSHOT` answers into these rankings on day one is genuinely new wiring, not a new engine. |
| Profile photo / gender pre-step | This session's own `/profile-setup` screen (gender + optional S3-backed photo, gated by `proxy.ts` exactly like `/consent`) | **Already shipped, deployed, live-verified** (see this file's neighbor entries in `docs/AGENT_LOG.md`, Session 51). This doc's flow doesn't mention either field — needs a decision on where `/profile-setup` sits relative to this new sequence. See §5.4. |
| One-time, skippable, deterministic sequence | The exact same shape `/consent` and `/profile-setup` already are: a `dpnr_*` cookie mirroring a `custom:*` JWT claim (`proxy.ts`/`pre-token-generation.ts`), never shown again once complete | **Directly reusable pattern** — a fourth cookie/claim (`custom:onboardingComplete` or similar) is a mechanical extension of an already-proven mechanism, not new architecture. |

## 3. Data model (settled shape)

**No new item type.** Per §5.2, card answers seed the *existing*
`RoadmapItem` rather than a parallel `FIRST_SNAPSHOT` structure — Dashboard
keeps exactly one "here's what DPNR understands about you" card, not two. The
new persisted state is a small, additive `OnboardingSnapshotItem` — plain
inputs only, not itself a second personalization summary — plus a claim/cookie
gate identical to consent/profile-setup's:

```
OnboardingSnapshotItem  (USER#<id> / ONBOARDING_SNAPSHOT — plaintext, disposable
                          card inputs, not personal-content-bearing the way a
                          Mirror/Decision session is; ENCRYPTED only where noted)
  currentState: enum (7 values, verbatim from the doc — no existing equivalent, see below)
  activeDomains: LifeDomainCategory[]   (≤3 — reused, see mapping below, not the doc's own 10-value list)
  desiredStates: string[]   (≤3 — small new enum, see below; no existing equivalent found)
  interactionPreference: InteractionMode   (reused directly — see mapping below, not a new 6-value enum)
  currentIntention: EncryptedBlob | null   (ENCRYPTED — free text is personal content like any other)
  snapshotFeedback: 'yes' | 'partly' | 'not_quite' | null
  completedAt: string | null   (gates proxy.ts's redirect, same role as consentedAt/profileSetupCompletedAt)

// On completion (or skip): resolveOnboardingSnapshot() feeds
// activeDomains/desiredStates/interactionPreference/currentIntention into
// the *existing* runOnboardingTurn/RoadmapItem-creation path as richer
// starting context, per §5.1 — it does not create the Roadmap itself.
```

**Taxonomy mapping (§5.3 — reuse where reasonable, new only where nothing fits):**
- `activeDomains` → **reuse `LifeDomainCategorySchema`** (7 values:
  `self_inner_world`/`relationships`/`career_purpose`/`health_body`/
  `money_abundance`/`creativity_expression`/`spirituality`). The doc's 10
  options (Me/Love/Family/Friends/Work/Money/Body/Growth/Purpose/Fun) need an
  explicit reduction, not a 1:1 rename — a real small design task for
  whoever builds Slice B, sketched here as a starting point, not finalized:
  `Me→self_inner_world`, `Love/Family/Friends→relationships`,
  `Work/Purpose→career_purpose`, `Money→money_abundance`, `Body→health_body`,
  `Growth→self_inner_world` or `spirituality` (ambiguous, needs a real call),
  `Fun` has no clean home in any of the 7 — resolve during Slice B, not here.
- `interactionPreference` → **reuse `InteractionModeSchema`** (9 values).
  The doc's 6 options map more directly:
  `"Help me understand it"→understand`, `"Give me perspective"→explore_pattern`,
  `"Ask me the right question"→learn` (closest fit, imperfect),
  `"Help me make a move"→act`, `"Just give me space to talk"→be_heard`,
  `"Depends on the moment"→unknown`. `share`/`decide`/`regulate` are simply
  never chosen directly at onboarding — fine, they're still reachable via the
  existing per-turn classifier later.
- `currentState` and `desiredStates` → **no existing equivalent found**
  anywhere in the schema (checked `TwinSignalDomainSchema`, Decision Room's
  free-text `values_needs_tags`/`fear_desire_tags` prompts — neither is a
  fixed enum). Ship these two as new, small, literally-as-specified enums;
  reuse only applies where something real already exists to reuse.

## 4. Slice breakdown (mirrors `HEBREW_LOCALIZATION_PLAN.md`'s lettered-slice convention — settled shape, not started)

- **Slice A** — `OnboardingSnapshotItem` schema + the domain/interaction-mode
  mapping tables from §3 (finalize the ambiguous cases) + `custom:onboardingComplete`
  claim + `proxy.ts` gate (inserted right after `/profile-setup`, per §5.4 — no
  question asked on this one, it's the natural default given where
  `/profile-setup` already sits) + a new `/onboarding` route (per §5.6, a
  dedicated route, not inline in Main Chat). No UI polish yet.
- **Slice B** — the four card screens (`CURRENT_STATE`, `ACTIVE_DOMAINS`,
  `DESIRED_STATES`, `INTERACTION_PREFERENCE`) as steps within `/onboarding`,
  each backed by `PUT`-style persistence against the new item; finalize the
  domain-mapping ambiguities from §3 here.
- **Slice C** — optional free-text step + skip logic on every card (every
  step skippable, per the doc's own "agency" principle) — `currentIntention`,
  encrypted like any other free-text content.
- **Slice D** — First Coordinates summary screen (reads back the snapshot,
  not a new data shape) + Yes/Partly/Not quite feedback, then hands off into
  the *existing* Companion onboarding conversation with the snapshot as seed
  context (§5.1) — this is the one genuinely new integration point in
  `runOnboardingTurn`/Roadmap-creation code.
- **Slice E** — thread the snapshot into Library recommendations and
  Pull-a-Card's existing ranking logic for a non-empty first Companion
  entry (§2's "fully reusable" row — no new ranking engine, just an earlier
  signal to rank against).
- **Placeholder-only, not real integration**: a video slot/player at the top
  of `/onboarding`'s first screen (§5.5 — build now, integrate the real WOW
  VIDEO whenever Lital delivers it).
- **Explicitly not in MVP**: the Living Map.

## 5. Settled decisions (answered by the user, 2026-09-15)

- **5.1 Relationship to the existing AI-conversational onboarding**: cards
  run first and feed the existing `runOnboardingTurn` conversation as richer
  starting context — that mechanism stays the real "understanding" engine,
  not replaced or duplicated.
- **5.2 First Coordinates data shape**: feeds the existing `RoadmapItem`:
  no new `FIRST_SNAPSHOT`-as-a-second-summary item.
- **5.3 Taxonomy reconciliation**: reuse existing enums where something real
  already fits (`LifeDomainCategorySchema`, `InteractionModeSchema`); ship new,
  small enums only where nothing does (`currentState`, `desiredStates`) — see
  §3's mapping.
- **5.4 Sequencing against `/profile-setup`**: not separately asked — the
  natural default given where `/profile-setup` already sits (right after
  consent) is for the new `/onboarding` sequence to insert immediately after
  it, before Companion. Revisit if this turns out wrong once built.
- **5.5 Build timing**: build Slices A–E now, with an inert placeholder
  video slot — do not wait for the real WOW VIDEO.
- **5.6 In-chat cards vs. dedicated route**: a dedicated `/onboarding` route,
  same pattern as `/consent`/`/profile-setup` — not inline inside Main Chat's
  conversation area (a real, deliberate fidelity tradeoff against the
  reference screenshot, accepted for lower build effort).
  **Reversed 2026-09-16 (Session 58), at the user's explicit request**: the
  reference screenshot always showed this rendered inside Main Chat's own
  conversation area, and the dedicated-route shape's "lower build effort"
  tradeoff no longer held once the user asked for the real thing. The
  `/onboarding` route was deleted; `apps/web/src/components/companion/onboarding/`
  (`useOnboardingFlow.ts` + two presentational components) now render the
  same four cards + First Coordinates summary inline under a greeting bubble
  in `(app)/companion/page.tsx`, and `proxy.ts`'s onboarding gate redirects to
  `/companion` instead. The free-text `CURRENT_INTENTION` step no longer has
  its own textarea card — it's answered through Main Chat's own composer
  (the source doc's own framing: that answer "naturally becomes the first
  conversation"). No data-model or backend change; see `docs/AGENT_LOG.md`
  Session 58 for the full detail, including a real client-router-cache bug
  found and fixed along the way.

No ADR — none of the above is irreversible in the ADR sense (a route/schema
this narrow can be revised cleanly later), and every call here was the user's
own explicit choice, not a unilateral architectural decision.
