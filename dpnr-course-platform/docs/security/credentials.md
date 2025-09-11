# Credentials & Secrets Policy

- Never commit API keys, secrets, or credentials to the repo.
- Do not create fake/guess placeholders for AWS configuration. Ask explicitly for required values before implementing features that depend on them.
- For local development, use per-app `.env.local` files (ignored) or a secrets CLI (1Password, AWS SSM, Doppler) to inject envs at runtime.
- For production, store secrets in a managed secret store and inject at deploy time.

## Recommended Secret Stores
- Vercel Project Environment Variables (for the Next.js app)
- AWS Systems Manager Parameter Store / AWS Secrets Manager (for AWS-side infra)
- GitHub Actions Secrets (if CI is added later)

## Required Secrets (By Feature)

### Authentication (Cognito)
- `NEXT_PUBLIC_USER_POOL_ID` (not secret, but controlled)
- `NEXT_PUBLIC_CLIENT_ID` (not secret, but controlled)
- `AWS_REGION` (shared)

### Database (PostgreSQL/Aurora or local Postgres)
- `DATABASE_URL`

### S3 Materials
- `AWS_ACCESS_KEY_ID` (secret)
- `AWS_SECRET_ACCESS_KEY` (secret)
- `AWS_S3_BUCKET` (controlled)
- `AWS_REGION` (shared)

### Stripe
- `STRIPE_SECRET_KEY` (secret)

### Sessions
- `IRON_SESSION_PASSWORD` (secret)
- `IRON_SESSION_COOKIE_NAME` (controlled)

## Secure Injection Plan
- Local dev: populate `apps/web/.env.local`; keep it uncommitted.
- Docker demos: use root `.env` only on your machine; never commit real values.
- Production deploy: set Vercel environment variables and use AWS SSM/Secrets Manager for infra/Terraform.

