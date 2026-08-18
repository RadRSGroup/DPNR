# ADR 0004 — Consent claim reads from DynamoDB, not a Cognito custom attribute

**Status:** Accepted (2026-08-17, Session 3 — Phase 0 CDK work)

## Context

The migration plan describes the consent-in-JWT mechanism as "a Cognito custom attribute + pre-token-generation trigger." Implemented literally, that means consent state would exist in two places: a Cognito custom attribute (`custom:consent_version` or similar) and the app-level `PROFILE` item in the application table (which already tracks `consentedAt`/`consentVersion` per `MVP_ARCHITECTURE.md` §3.1). Two copies of the same fact is exactly the kind of drift risk this project can't afford to introduce casually.

## Decision

The `PROFILE` item in DynamoDB is the **only** source of truth for consent state. The pre-token-generation Lambda (`infra/cdk/lambda/auth/pre-token-generation.ts`) reads it directly on every token issuance/refresh and injects a `custom:consent` claim (`"true"`/`"false"`) into the JWT. No Cognito custom attribute for consent exists on the user pool schema.

## Consequences

- One write path for consent (`POST /v1/user/consent` or equivalent, once built, updates the `PROFILE` item) — no risk of the Cognito attribute and the DynamoDB record disagreeing.
- The JWT claim is only as fresh as the last token issuance/refresh (Cognito access tokens default to a 1-hour validity in `AuthStack`). This is a **fast-path optimization for the API Gateway authorizer, not the sole enforcement boundary** — any handler doing something consent-sensitive should not assume the claim is perfectly live; the same "per-handler check completes the story" principle from `MVP_ARCHITECTURE.md` §3 applies here as it does to ownership checks.
- Slightly more DynamoDB read load (one `GetItem` per token issuance) than a pure-Cognito-attribute approach, which is negligible at this scale and is the honest trade for not having two sources of truth.
