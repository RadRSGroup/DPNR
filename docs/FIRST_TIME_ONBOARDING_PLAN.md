# First-Time Onboarding — Scoping (docs/AGENT_LOG.md Session 51/52)

Scopes `DPNR_First_Time_Onboarding_MVP_Implementation_Guide_v3.pdf` (repo root,
added by the user 2026-09-15) against the real live codebase. **Research and
planning only — no code changes in this pass**, matching the same
survey-before-build discipline `HEBREW_LOCALIZATION_PLAN.md` used before its
Slice A started. Do not start building from this doc until the open decisions
in §5 are answered — several of them are genuine architectural forks, not
implementation details.

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

## 3. Proposed data model (pending §5's decisions)

If built as a genuinely new, separate concept (§5.2's "keep them separate"
answer), a natural shape — additive, no changes to existing items:

```
FirstSnapshotItem  (USER#<id> / FIRST_SNAPSHOT)
  currentState: enum (7 values, §5.2)
  activeDomains: string[]   (≤3, taxonomy per §5.3)
  desiredStates: string[]   (≤3, taxonomy per §5.3)
  interactionPreference: enum (6 values, or reuse InteractionMode per §5.3)
  currentIntention: string | null   (ENCRYPTED — free text, same as any other personal content)
  snapshotFeedback: 'yes' | 'partly' | 'not_quite' | null
  completedAt: string | null   (gates re-showing, same role as consentedAt/profileSetupCompletedAt)
```

`INSIGHT_STATUS`/`CONFIDENCE` enums from the doc's §8 already exist in spirit
as `TwinSignalStatusSchema` (`candidate|confirmed|rejected`) — reuse that
rather than inventing parallel status vocabulary, unless §5.2 concludes these
answers shouldn't become Twin signals at all.

## 4. Slice breakdown (mirrors `HEBREW_LOCALIZATION_PLAN.md`'s lettered-slice convention — proposed, not started)

- **Slice A** — data model + state machine + persistence flags (schema, one
  new DynamoDB item or `UserProfileItem` extension per §5.2, the
  `custom:onboardingComplete` claim + `proxy.ts` gate). No UI.
- **Slice B** — the four card components + progress UI, client-side only,
  reusing `Card`/existing chip-style components; wired to real persistence
  but no personalization payoff yet.
- **Slice C** — optional free-text step + skip logic on every card (per the
  doc's own "agency" principle — every step skippable).
- **Slice D** — First Coordinates summary card + Yes/Partly/Not quite feedback
  handling.
- **Slice E** — personalize the first real entry: thread `FIRST_SNAPSHOT` into
  Library recommendations and Pull-a-Card's existing ranking logic (§2's
  "fully reusable" row), and into whichever onboarding mechanism §5.1 lands on.
- **Explicitly not in MVP**: the WOW VIDEO itself (reserve a slot/player only,
  per the doc's own §12 item 9), the Living Map.

## 5. Open decisions — need the user's call before Slice A starts

**5.1 — Relationship to the existing AI-conversational onboarding.** Real
Companion code today already runs a full conversational onboarding
(`runOnboardingTurn`) the first time any user without a Roadmap sends a
message, ending in a real `RoadmapItem` + Twin signals. This doc's card
sequence is a second, deterministic mechanism aimed at similar ground. Three
defensible options, not pre-decided: **(a)** the card sequence runs first and
its answers become context fed into the existing conversational onboarding
(richer starting point, one fewer open question the model has to ask) — the
existing mechanism stays the actual "understanding" engine; **(b)** the card
sequence *replaces* the conversational onboarding entirely, and
`FIRST_SNAPSHOT` becomes the new source for whatever the Roadmap used to
capture; **(c)** both run, genuinely independent, accepting some redundancy
in exchange for not touching already-shipped, working code.

**5.2 — Does `FIRST_SNAPSHOT` become its own new data structure, or feed the
existing `RoadmapItem`?** `RoadmapItem.content` (`currentFocus`/`theme`/
`direction`) already is Dashboard's "here's what DPNR understands about you"
card. A second, separately-shaped summary risks a confusing double-first-
impression on day one. Options: keep them genuinely separate (§3's proposed
schema, as the doc's own §8 implies); or treat the card answers as the *input*
that seeds the Roadmap's first version (no new item type, `Slice A` becomes
"extend Roadmap creation," not "add a new item family").

**5.3 — Taxonomy reconciliation, or a deliberate 4th/5th one.** Following the
project's own precedent (Session 45/46 — "unifying them is real, already-
flagged product-decision tech debt... this follows that precedent rather than
inventing a fourth resolution unilaterally"): should `ACTIVE_DOMAINS`/
`DESIRED_STATES` map onto the existing 7-value `LifeDomainCategorySchema`
(smaller, already used by Dashboard/Growth Tracker) or ship as their own new,
10-value enums as the doc specifies verbatim? Same question for
`INTERACTION_PREFERENCE` vs. the existing 9-value `InteractionModeSchema`.
Reconciling now is more work; shipping new enums now is faster but adds a
4th/5th/6th taxonomy to a codebase that already has this exact debt flagged
twice.

**5.4 — Sequencing against this session's already-shipped `/profile-setup`.**
Where does gender/photo fit relative to the WOW VIDEO → card sequence? This
doc's flow doesn't mention either field. Likely answer: `/profile-setup`
keeps its current spot (right after consent, before Companion) and the new
sequence would insert *after* it, gated behind the not-yet-built WOW VIDEO —
but this is a real product call, not assumed here.

**5.5 — Build now, or wait for the WOW VIDEO?** The doc's own flow position
places this whole sequence *after* a video that doesn't exist yet ("developed
and supplied separately by Lital"). Building Slices A–E now with an inert
placeholder video slot (per the doc's own §12 item 9) is one option; waiting
until the real video exists so the full intended flow can be verified
end-to-end is the other.

**5.6 — In-chat cards vs. a dedicated route.** The reference screenshot shows
this rendered inside Main Chat's own conversation area (matching the doc's
"appear within or alongside Main Chat, then collapse naturally back into the
conversation" design direction). Building it that way is more work than a
dedicated `/onboarding`-style route (the same pattern `/consent`/
`/profile-setup` already use) but matches the reference and the doc's own
"conversation always wins" principle more naturally. Flagging since it's a
real effort/fidelity tradeoff, not a foregone conclusion.

No ADR yet — nothing above is decided; this file exists so the decision can be
made with full context, not to record one already made.
