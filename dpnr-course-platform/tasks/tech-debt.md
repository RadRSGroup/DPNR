# Technical Debt Register

> Track intentional deferrals and cleanup items discovered during implementation. Keep this list concise and actionable. Move items to `/tasks/todo.md` when promoted to planned work.

## Authentication & Sessions
- [ ] Verify Cognito ID token on server using `aws-jwt-verify` in `/app/api/auth/login/route.ts` (replace TODO)
- [ ] Session hardening: rotate/renew session on privilege change; set secure, httpOnly, sameSite policies (prod)
- [ ] CSRF protection for state-changing endpoints (consider double-submit token or same-site-only POST strategy)

## API Validation & Errors
- [ ] Centralize Zod schemas and error formatting utilities
- [ ] Add structured server-side logging with redaction (no secrets, no PII)

## Database
- [ ] Add DB indexes for common queries (e.g., `Enrollment.userId`, `Enrollment.courseId`)
- [ ] Encrypt PII fields (e.g., `User.address`) at application layer before persistence

## Payments
- [ ] Implement Stripe Checkout per PRD, replace stub
- [ ] Add Stripe webhooks to update `Order` status and ensure idempotency

## Materials & S3
- [ ] Enforce enrollment checks before issuing S3 signed URLs
- [ ] Configure presigned URL TTLs and scope; restrict to correct key prefix

## Frontend
- [ ] Replace `Hero3D` placeholder with exact R3F/Drei implementation + mobile fallback
- [ ] Install and configure shadcn/ui; refactor forms to use it consistently

## GDPR & Compliance
- [ ] Flesh out GDPR export/delete implementations (query, redact, CSV/JSON)
- [ ] Add cookie consent banner and privacy policy page content

## Infrastructure
- [ ] Terraform modules, remote state, and secrets in SSM/Secrets Manager
- [ ] Vercel env sync automation across environments

