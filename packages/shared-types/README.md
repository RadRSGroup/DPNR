# @dpnr/shared-types

Placeholder. Not implemented yet.

Purpose: once `infra/cdk`'s Lambda handlers exist, the `/v1` API contract (request/response shapes) and the DynamoDB item shapes from `docs/MVP_ARCHITECTURE.md` §3 should be defined once, here, and imported by both `apps/web` (API client) and `infra/cdk` (handler implementations) — not duplicated by hand in two places where they will drift.

Populate this alongside Phase 0's API Gateway + Lambda skeleton, not before — there's nothing to share types for yet.
