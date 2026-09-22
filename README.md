# DPNR — The Human Operating System

A personal operating and navigation product: a persistent conversational Companion, a living Digital Twin / My Evolution Map, and focused Gate-2 workspaces (Mirror Room, Decision Room, Content Library) for working through recurring patterns and real decisions.

**This project is built entirely by Claude Code agents across sessions — there is no human development team.** Before doing anything here, read:

1. [`docs/AGENT_LOG.md`](docs/AGENT_LOG.md) — cross-session handoff, current status, standing engineering guardrails. **Read this first, every session.**
2. [`docs/MVP_ARCHITECTURE.md`](docs/MVP_ARCHITECTURE.md) — target architecture and 7-phase build plan.
3. [`docs/adr/`](docs/adr) — decisions already made; don't relitigate one without writing a new ADR explaining why.
4. [`docs/AWS_SETUP.md`](docs/AWS_SETUP.md) — AWS account setup runbook (prerequisite for Phase 0 infra work).

## Structure

```
apps/web/             Next.js app — Main Chat/Companion, Dashboard, Decision Room, Mirror Room,
                       Content Library, Growth Tracker/Digital Twin, Wallet, and more
infra/cdk/             AWS CDK app — Cognito, API Gateway, Lambda, DynamoDB, Bedrock, EventBridge, KMS
                       (deployed to a real AWS account, not a plan)
packages/shared-types/ Types/schemas shared between apps/web and infra/cdk
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

Security review 2026-09-14 (DPNR-15) — this section was still describing the pre-migration, Phase-0
snapshot (Supabase/OpenAI, AWS "planned but not started") long after both had shipped; see
`docs/AGENT_LOG.md`'s Session 6 part 3 entry for when the real AWS migration actually happened.
Rather than re-describing specifics here (which will drift again the moment they change), the durable
rule is: **`docs/AGENT_LOG.md`'s "Prompt for next agent" section, at the top of that file, is the single
current-status source of truth.** Read it before assuming anything about what's built, deployed, or in
progress — this README isn't updated every session and shouldn't be treated as authoritative for status.
The retired pre-migration Supabase/OpenAI snapshot is preserved for historical reference in `PRD.md`
and `HANDOVER.md`, both marked superseded.
