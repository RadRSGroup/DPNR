# DPNR — The Human Operating System

A personal operating and navigation product: a persistent conversational Companion, a living Digital Twin / My Evolution Map, and focused Gate-2 workspaces (Mirror Room, Decision Room, Content Library) for working through recurring patterns and real decisions.

**This project is built entirely by Claude Code agents across sessions — there is no human development team.** Before doing anything here, read:

1. [`docs/AGENT_LOG.md`](docs/AGENT_LOG.md) — cross-session handoff, current status, standing engineering guardrails. **Read this first, every session.**
2. [`docs/MVP_ARCHITECTURE.md`](docs/MVP_ARCHITECTURE.md) — target architecture and 7-phase build plan.
3. [`docs/adr/`](docs/adr) — decisions already made; don't relitigate one without writing a new ADR explaining why.
4. [`docs/AWS_SETUP.md`](docs/AWS_SETUP.md) — AWS account setup runbook (prerequisite for Phase 0 infra work).

## Structure

```
apps/web/             Next.js app (Decision Room today; grows to host Companion, Dashboard, other rooms)
infra/cdk/             AWS CDK app — Cognito, API Gateway, Lambda, DynamoDB, Bedrock, EventBridge (not yet built)
packages/shared-types/ Types/schemas shared between apps/web and infra/cdk (not yet built)
docs/                  Architecture, agent log, ADRs, setup runbooks
```

npm workspaces. Root scripts proxy to `apps/web`:

```bash
npm install   # from repo root
npm run dev
npm run build
npm run lint
```

## Current state

Pre-migration: Next.js 16 + Supabase (Postgres/Auth/RLS) + OpenAI GPT-4o, implementing Decision Room's 7-step flow only. See `apps/web/HANDOVER.md` for the current data model. The AWS migration (Cognito, DynamoDB, Bedrock, client-side encryption) is planned but not started — see `docs/AGENT_LOG.md` for exact status.
