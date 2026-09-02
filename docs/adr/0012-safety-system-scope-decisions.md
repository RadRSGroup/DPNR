# ADR 0012 — Safety/crisis system: content, retention, and alerting decisions

**Status:** Accepted (2026-09-02, Session 29 part 4 — safety system design scoping)

## Context

`docs/DPNR_operating_spec_principles.pdf` §30 requires a safety/crisis contract that ranks above the spec
itself in precedence — the single highest-priority gap `docs/INTELLIGENCE_SPEC_AUDIT.md` found (Critical
Finding #1). Scoping this system (`docs/SAFETY_SYSTEM_DESIGN.md`) surfaced three questions that, per spec
§31's own escalation rule, must go to the user rather than be decided unilaterally: a new user-facing promise
(crisis-support content), a decision changing persistence/privacy scope (retention), and a business/ops call
(human alerting). All three were presented as structured choices with a recommended option each; the user
chose the recommended option in all three cases.

## Decision

1. **Crisis-support content, for now: generic and locale-agnostic.** A detected `safety_concern` or
   `immediate_danger` state gets a response encouraging the user to reach out to a trusted person, a qualified
   professional, or local emergency services — no specific hotline numbers or country-specific services. This
   is **explicitly a time-boxed exception, not a launch-ready design**, same class of scoped exception as ADR
   0007's plaintext-crypto-stub: it holds only through the current internal/founder-testing phase (per ADR
   0007's own boundary — no user outside the founding team touches a live personal-content route). **Real,
   locale-aware crisis-line content must be sourced and reviewed before any user outside the founding team is
   ever invited to a live personal-content route** — the same trigger condition ADR 0007 already uses, not a
   new one. A future session inviting a non-founder user before this is done must re-open this ADR first.

2. **`SafetyEventItem` retention: 90-day TTL.** Enforced via DynamoDB's native TTL attribute (the same
   mechanism `SessionTicketItem` already uses) — no manual cleanup job needed. Matches spec §28/§30's "minimum
   necessary retention and access" language without picking an arbitrary "forever."

3. **Human alerting: yes, on `immediate_danger`.** During the current founder-only internal-testing phase,
   there is no real crisis-response infrastructure behind this product — the AI's own safety response is the
   only thing that happens unless a human is actively notified. A live alert (mechanism to be decided at
   Stage 1 build time — likely SNS → email, reusing the pattern already set up for the `dpnr-monthly-dev-budget`
   AWS Budgets alert from Session 4) fires whenever a `SafetyEventItem` is written with
   `safetyState: 'immediate_danger'`. **This decision does not extend to `safety_concern`** (one level less
   urgent) — only `immediate_danger` triggers a live alert; `safety_concern` events are queryable but not
   actively pushed. Revisit this boundary once the system has run against real usage, per §7 of the design
   doc's staged-build framing.

## Consequences

- None of this authorizes launching the safety system to real (non-founder) users — decision 1's exception is
  explicitly bounded the same way ADR 0007's is, and ends at the same trigger point.
- `SafetyEventItem`'s schema must include a TTL attribute from the start (decision 2) — retrofitting TTL onto
  existing untagged rows later is more work than building it in from Stage 1.
- Decision 3 implies real infrastructure work (an SNS topic, IAM grant, and email subscription, or equivalent)
  as part of Stage 1 of the build, not something deferred to a later stage — flagged in
  `docs/SAFETY_SYSTEM_DESIGN.md` §7's Stage 1 description.
- No code exists yet from this ADR alone — this document records the three decisions; `SAFETY_SYSTEM_DESIGN.md`
  is the technical design they inform, and neither has been built. See that document for the full staged build
  plan and what's still a pure implementation detail (not requiring further escalation) versus what's decided
  here.
