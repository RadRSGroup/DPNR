# ADR 0003 — Payment provider, "enterprise-scale" scope, and commit policy

**Status:** Accepted (2026-08-17)

Three smaller decisions bundled into one ADR since none needed a long write-up on its own.

## Payment provider for Credits

**Decision:** Keep Grow (existing ILS billing integration) as the payment provider behind `/v1/credits/purchase`, rather than switching providers. The existing `src/lib/grow.ts` and `webhooks/grow` route (now at `apps/web/src/lib/grow.ts`, `apps/web/src/app/api/webhooks/grow/route.ts`) are the starting point for the Credits ledger's purchase flow, not a throwaway.

**Consequence — carried over as a pre-existing, still-unresolved blocker:** `verifyGrowSignature()` is a stub that accepts any request bearing the `x-grow-signature` header (flagged in the original migration plan as a critical pre-launch blocker — forged payment events could grant credits or entitlements to arbitrary users). This must be implemented properly before Credits/webhooks go live in any environment real users touch, generalized model or not.

## "Enterprise-scale" scope

**Decision:** Interpreted as production-grade and scalable (serverless, pay-per-use, secure, observable, resilient), **not** literal multi-tenancy (e.g. white-labeling DPNR per organization/clinic/employer). The DynamoDB partition model in `MVP_ARCHITECTURE.md` §3 uses `USER#<id>` as the top-level partition key, not `ORG#<id>#USER#<id>`.

**Consequence:** if literal multi-tenancy is ever required, the partition-key design needs to change before significant data exists — this is exactly the kind of retrofit `MVP_ARCHITECTURE.md` §10 warns against for the encryption field-split, and the same logic applies here. Revisit explicitly via a new ADR if this assumption turns out wrong; don't quietly bolt an org layer on top of a `USER#<id>`-rooted design.

## Commit policy across sessions

**Decision:** Agents commit autonomously as normal engineering workflow (clear messages, at the end of each coherent unit of work) — this is required for `AGENT_LOG.md`'s cross-session handoff to mean anything, since a future session needs committed state, not a pile of uncommitted changes to guess about. Agents do **not** force-push, rewrite history, or push to the `origin` remote without asking the user explicitly first — local commits are pre-authorized, remote/shared-state changes are not.
