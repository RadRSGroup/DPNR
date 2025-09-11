## DPNR Course Platform

AI-first, monorepo scaffold per PRD. All demos run via Docker. This repo provides:

- Next.js apps (`apps/web`, `apps/admin`)
- Prisma schema (`packages/database`)
- Shared packages (`packages/ui`, `packages/types`)
- Agents specs (`docs/agents`)
- MCP integration plan and stub (`docs/mcp`, `mcp/`)
- Terraform skeleton (`infrastructure/terraform`)
- Task tracking (`tasks/todo.md`)

### Quick Start (Docker demos)

1. Copy envs: `cp .env.example .env`
2. Start services: `docker compose up --build`
3. Web app: http://localhost:3000
4. Admin app: http://localhost:3001
5. Postgres: localhost:5432 (see `.env.example`)

Note: Builds will install dependencies inside containers. Ensure network access for Docker.

### Local Dev (workspaces)

1. Install deps at root: `npm install`
2. Copy envs: `cp apps/web/.env.local.example apps/web/.env.local`
3. Generate Prisma client: `npx -w @dpnr/database prisma generate`
4. Run web app: `npm run dev -w @dpnr/web`

Prisma migrations (dev): `npx -w @dpnr/database prisma migrate dev --name init`

### Demo Requests

- Health: `curl http://localhost:7070/health`
- Signed URL (stub): `curl 'http://localhost:7070/signed-url?id=abc'`
- API courses: `curl http://localhost:3000/api/courses`
- API checkout (stub):
  `curl -X POST http://localhost:3000/api/shop/checkout -H 'Content-Type: application/json' -d '{"items":[{"name":"Course","price":100,"quantity":1}],"userId":"u_123"}'`

### Repository Layout

See `dpnr-course-prd.md` for the authoritative structure and specs.

### MCP Servers

We include a simple stub MCP service (`mcp/materials-stub`) for demo, plus docs on wiring common MCPs (filesystem, git, terminal, HTTP, Postgres) via your agent runner. See `docs/mcp/README.md`.

### Agent Workflow

- Read `dpnr-course-prd.md` in full
- Check `tasks/todo.md` for current status
- Execute only the current task, update `tasks/todo.md`
- Prefer simplest working solution per PRD constraints

### Credentials & AWS Config

- Never commit API keys or secrets. Use per-app `.env.local` for local, Vercel env vars for production, and AWS SSM/Secrets Manager for infra.
- Before implementing AWS-dependent features, request required values explicitly (see `docs/security/aws-config.md`). Do not create placeholders.
- See `docs/security/credentials.md` for the full policy and required secret list per feature.
 - See `docs/security/secrets-howto.md` for practical ways to provide secrets locally, in Docker, and in production.

### Protected Routes

- Dashboard is server-protected via `apps/web/app/dashboard/layout.tsx` using session cookie presence.
- Auth login endpoint sets Iron Session; add proper Cognito ID token verification server-side (see TODO in `api/auth/login`).


### Next Steps (per PRD)

- Implement auth (Cognito + Amplify) and sessions
- Flesh out API routes and Prisma ops
- Integrate Stripe and S3
- Add 3D hero and UI components as specified
