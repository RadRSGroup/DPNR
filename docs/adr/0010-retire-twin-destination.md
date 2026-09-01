# ADR 0010 — Retire `/twin` ("InnerSelf") as a dedicated destination

**Status:** Accepted (2026-09-01, Session 29 — Intelligence Spec alignment work)

## Context

`docs/DPNR_operating_spec_principles.pdf` (the new "DPNR — Product Intelligence & AI Operating Specification,"
v1.6) ranks above `MVP_ARCHITECTURE.md` in its own conflict-precedence table. Its §6, "Digital Twin Across
the Product: No Separate User-Facing Room," is explicit: *"Do not create a duplicate InnerSelf destination
for MVP... The Twin should be experienced, not operated... No dedicated Twin/InnerSelf screen is required for
MVP."* §5's "No duplicate product ownership" table lists "A user-facing destination, room or duplicate
dashboard" as something the Digital Twin explicitly does NOT own.

`/twin` ("InnerSelf") was built as exactly that in Session 16 and reskinned in Session 27 — a real, nav-
promoted page (desktop Sidebar mini-card, Companion/Dashboard mobile Explore tiles) listing every Twin
signal with Confirm/Not quite calibration actions. `docs/INTELLIGENCE_SPEC_AUDIT.md` flagged this as Critical
Finding #2: a direct, named conflict between an already-shipped feature and the new canonical spec, not
something to resolve unilaterally given it was live, deployed, real work.

Presented to the user as a three-way choice: (a) fold the content into contextual cards on Dashboard/Growth
Tracker and retire the route, (b) keep it demoted out of primary nav as a low-emphasis utility page, or (c)
keep it as-is and record a deliberate spec divergence. The user chose (a), the audit's own recommended option.

## Decision

`/twin` is retired as a dedicated destination:

- The route itself now immediately redirects to `/dashboard` (kept, not deleted outright, in case any stale
  external link still points at it — see that file's own doc comment).
- The Sidebar mini-card, and both mobile "Explore" tiles (Companion, Dashboard) that linked to it, are removed.
  The two mobile tiles were repointed to `/growth` (Growth Tracker) instead of dropped outright, since mobile's
  5-slot bottom nav doesn't reach Growth Tracker/My Evolution Map either and both are legitimate spec-approved
  homes for Twin-adjacent content (§13/§14).
- The confirm/reject calibration UI the old page owned now lives contextually on Dashboard as
  `TwinCalibrationCard` (`apps/web/src/components/shared/TwinCalibrationCard.tsx`) — per spec §9's own
  prescribed pattern ("may appear contextually in Dashboard/Main Chat... or longitudinally in Growth
  Tracker"). It shows only `status === 'candidate'` signals (capped at 3), not every signal regardless of
  status the way the old page did — already-confirmed signals surface elsewhere (Patterns Track, Life
  Domains, Leading Archetypes); already-rejected ones are deliberately not re-shown, per spec §9's "do not
  repeatedly reassert a rejected interpretation."
- The Dashboard hero card's "My InnerSelf" section title and Alignment Score display are unchanged — a
  labeled *contextual section on Dashboard* is explicitly allowed by the spec; only the separate, nav-
  promoted destination was the actual violation.

## Consequences

- `GET/POST /v1/twin/...` backend routes and Lambda handlers are untouched — this is a frontend-surface
  decision only, not a data-model or API change.
- Live-verified end to end this session with a real throwaway Cognito user and two seeded candidate Twin
  signals: `TwinCalibrationCard` renders both, Confirm/Not quite both call the real API and persist correctly
  (confirmed via a direct `dynamodb get-item` read showing `status: confirmed`), a confirmed pattern signal
  correctly flows into Patterns Track/Life Domains/Leading Archetypes, a rejected one is correctly never
  re-shown, `/twin` redirects to `/dashboard` while authenticated, and the desktop Sidebar no longer shows an
  InnerSelf entry. `tsc --noEmit`, `eslint`, `cdk synth`, and `next build` all clean (25 routes, unchanged
  count — `/twin` still exists as a route, just redirects now). Test user and all 8 DynamoDB rows deleted and
  confirmed gone afterward.
- If a future session wants a richer Twin-signal review surface again (e.g. paging through every signal, not
  just outstanding candidates), that's new product scope requiring its own decision — this ADR only resolves
  the "no separate destination" question, it doesn't forbid ever building calibration UI beyond Dashboard's
  contextual card.
