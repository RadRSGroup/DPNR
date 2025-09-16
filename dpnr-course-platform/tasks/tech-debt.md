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

## Payments - Tranzila Integration ✅
- [x] ~~Stripe not supported in Israel: select alternative PSP and update PRD~~ **COMPLETED**: Tranzila selected and implemented
- [x] ~~Implement chosen provider's Checkout; replace Stripe stub~~ **COMPLETED**: Full Tranzila checkout integration
- [ ] **PRODUCTION READINESS**: Update environment variables from test mode to production Tranzila configuration
- [ ] **SECURITY**: Implement Tranzila webhook signature validation for payment callbacks
- [ ] **CALLBACK HANDLERS**: Create `/api/payment/callback` endpoints for success/failure/cancel scenarios
- [ ] **INVENTORY MANAGEMENT**: Reduce product inventory on successful payment completion
- [ ] **ORDER TRACKING**: Add payment status monitoring and order fulfillment workflow
- [ ] **ERROR HANDLING**: Implement comprehensive error handling for payment failures and timeouts
- [ ] **REFUNDS**: Add refund functionality for order cancellations and returns
- [ ] **RECEIPTS**: Generate and email payment receipts after successful transactions
- [ ] **AUDIT LOGS**: Add payment transaction logging for compliance and debugging

## Materials & S3
- [ ] Enforce enrollment checks before issuing S3 signed URLs
- [ ] Configure presigned URL TTLs and scope; restrict to correct key prefix

## Frontend
- [ ] Replace `Hero3D` placeholder with exact R3F/Drei implementation + mobile fallback (IN PROGRESS - POC on landing page)
- [ ] Install and configure shadcn/ui; refactor auth forms (login/register) and future forms to use it consistently
- [ ] **3D Framework Extension**: Extend responsive 3D components to course and library pages after POC validation
- [ ] **3D Performance**: Implement progressive loading for 3D assets on slower connections
- [ ] **E2E Testing**: Add comprehensive end-to-end tests for 3D interactions and animations
- [ ] **Visual Regression**: Implement visual regression testing for 3D components

## Internationalization (i18n)
- [ ] Add middleware to auto-redirect `/` to preferred locale (`/he` or `/en`) based on `NEXT_LOCALE` cookie and `Accept-Language` header
- [ ] Centralize messages with next-intl and migrate header/landing to provider-based translations
- [ ] Install and configure `tailwindcss-rtl` for logical spacing utilities (ms/me/ps/pe) across RTL
- [ ] Replace ad-hoc date/currency formatting with shared helpers sitewide (he-IL: dd/MM/yyyy, ILS/₪)

## GDPR & Compliance
- [ ] Flesh out GDPR export/delete implementations (query, redact, CSV/JSON)
- [ ] Add cookie consent banner and privacy policy page content

## Infrastructure
- [ ] Terraform modules, remote state, and secrets in SSM/Secrets Manager
- [ ] Vercel env sync automation across environments
