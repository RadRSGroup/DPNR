# ADR 0002 — Monorepo structure (apps/web, infra/cdk, packages/shared-types)

**Status:** Accepted (2026-08-17)

## Context

DPNR grew from a single Next.js app (Decision Room only) into a product with a standalone API-first backend (Cognito, API Gateway, Lambda, DynamoDB, Bedrock) consumed by the same web app and, per the architecture, future mobile clients. The frontend and backend need to share type definitions (API request/response shapes, DynamoDB item shapes) to avoid drift, especially since they'll likely be built in separate agent sessions that don't share context.

## Decision

Restructure the repo as an npm-workspaces monorepo:

```
apps/web/            — the existing Next.js app (moved here verbatim, history preserved via git mv)
infra/cdk/            — AWS CDK app: Cognito, API Gateway, Lambda, DynamoDB, EventBridge, KMS (not yet implemented)
packages/shared-types/ — types/schemas shared between apps/web and infra/cdk (not yet implemented)
docs/                 — AGENT_LOG.md, MVP_ARCHITECTURE.md, ADRs, AWS_SETUP.md
```

Plain npm workspaces, not Turborepo/Nx — there's no build-graph complexity yet that justifies the extra tooling, and simplicity matters more than scalability of the build system at this stage.

## Consequences

- `npm install` and lockfile management happen at the repo root, not per-package.
- Root `package.json` scripts (`dev`, `build`, `start`, `lint`) proxy to `apps/web` via `--workspace=apps/web`. Update these when `infra/cdk` gains real scripts (e.g. `cdk deploy`).
- `.gitignore` was widened from anchored (`/node_modules`) to unanchored (`node_modules`) patterns since workspaces can each get their own `node_modules`.
- Verified before committing: `npm install` succeeds at root, `npm run build` succeeds and produces the same route list as before the move, `npm audit` was also used to bump `next` to `16.3.1` (resolves 3 pre-existing high-severity advisories, unrelated to this restructuring but fixed opportunistically since the fix was a same-range-adjacent patch bump with no behavior risk).
- Known pre-existing debt, not introduced by this change: `npm run lint` currently fails with 57 problems (mostly `react/no-unescaped-entities` and a couple of `react-hooks/exhaustive-deps` warnings) inherited from the original Decision Room code. Not fixed as part of this restructuring — tracked in `docs/AGENT_LOG.md` as backlog.
