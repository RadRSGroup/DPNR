# Providing Secrets (Contributors)

This guide shows safe ways to supply secrets for local dev, Docker demos, and production — without committing keys.

## Local Development
- Per-app env files (preferred):
  - Copy: `cp apps/web/.env.local.example apps/web/.env.local`
  - Paste values locally; never commit.
- 1Password CLI (alternative):
  - Sign in: `op signin`
  - Fetch and export: `export STRIPE_SECRET_KEY=$(op item get Stripe --field secret)`
  - Run dev: `npm run dev -w @dpnr/web`
- AWS SSM Parameter Store (alternative):
  - Get param: `aws ssm get-parameter --name "/dpnr/web/STRIPE_SECRET_KEY" --with-decryption --query Parameter.Value --output text`
  - Export: `export STRIPE_SECRET_KEY=$(...)`

## Docker Demos
- Root `.env` (local only): `cp .env.example .env` then fill locally (never commit real values).
- Compose reads `.env` and injects into containers (see `docker-compose.yml`).

## Production (Vercel + AWS)
- Vercel (Next.js app):
  - Add env: `vercel env add STRIPE_SECRET_KEY production`
  - Pull env for local: `vercel env pull apps/web/.env.local`
- AWS SSM / Secrets Manager (infra/Terraform):
  - Put param (SSM): `aws ssm put-parameter --name "/dpnr/web/STRIPE_SECRET_KEY" --type SecureString --value "sk_live_..." --overwrite`
  - Get param: `aws ssm get-parameter --name "/dpnr/web/STRIPE_SECRET_KEY" --with-decryption`
  - Prefer role-based access for deployments to fetch parameters at runtime.

## Naming Conventions
- SSM paths: `/dpnr/<app>/<KEY>` (e.g., `/dpnr/web/IRON_SESSION_PASSWORD`)
- Avoid `NEXT_PUBLIC_*` for secrets; only use for safe, public identifiers (e.g., Cognito IDs).

## Required Values (reference)
See `docs/security/credentials.md` and `docs/security/aws-config.md` for the complete checklist by feature and the prompts to request from the Supervisor.

