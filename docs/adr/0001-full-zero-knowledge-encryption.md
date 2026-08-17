# ADR 0001 — Full zero-knowledge encryption from day one

**Status:** Accepted (2026-08-17)

## Context

The migration plan's encryption design (client-held DEK/KEK, KMS-wrapped session tickets, mandatory recovery code) means the backend never holds a key capable of decrypting user content on its own. The trade-off: a user who loses both their password and their one-time recovery code loses their data **permanently and unrecoverably** — no support process can help. This was flagged explicitly as a risk for a beta consumer wellness product, where users forget passwords routinely, and a lighter alternative was proposed (server-side KMS encryption, backend retains decrypt capability, normal password reset works, upgrade to zero-knowledge later once the recovery UX is validated).

## Decision

Ship full zero-knowledge encryption from day one, as originally designed in `aws-migration-plan.html` §6, not a lighter interim model.

## Consequences

- The recovery-code UX (shown once at signup, explicit "if you lose this, your data is gone forever" acknowledgment) is **not optional polish** — it is a launch blocker, not a nice-to-have, and must ship correctly before any real user data is stored under this model. Do not let this slip to "later" once other features feel more urgent.
- No backend "reset and recover" support flow can ever be built for lost credentials — don't accidentally imply one exists in support copy, onboarding UI, or privacy policy language.
- This decision should be revisited only via a new ADR if real beta usage shows unacceptable support/retention cost from unrecoverable data loss — do not silently weaken it in code without writing that ADR first.
