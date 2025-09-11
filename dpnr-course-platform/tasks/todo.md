# /tasks/todo.md

## Phase 1: Foundation ⏳
- [ ] Initialize Next.js project with TypeScript
- [ ] Install required dependencies
- [ ] Set up Prisma with PostgreSQL
- [ ] Create database schema
- [ ] Configure environment variables
- [ ] Set up basic routing
- [ ] Create layout components

## Phase 2: Authentication 🔒
- [ ] Set up AWS Cognito user pool
- [ ] Configure Amplify Auth
- [ ] Collect AWS Cognito config (region, user pool ID, client ID, callback URLs) — do not proceed without values
- [ ] Create registration page
- [ ] Create login page
- [ ] Implement session management
- [ ] Add protected route middleware
- [ ] Test auth flow end-to-end
- [ ] Verify Cognito ID token server-side (aws-jwt-verify)
- [ ] Add CSRF protection for state-changing API routes

## Phase 3: Core Features 📚
- [ ] Create landing page
- [ ] Add YouTube embed component
- [ ] Build video library page
- [ ] Create course info page
- [ ] Implement materials download
- [ ] Collect AWS S3 config (region, bucket, IAM principal, key prefix policy) — do not proceed without values
- [ ] Add calendar component
- [ ] Create user dashboard
- [ ] Implement GDPR export endpoint
- [ ] Implement GDPR deletion endpoint
 - [ ] Enforce enrollment checks before S3 signed URLs
 - [ ] Configure presigned URL TTLs and key scope restrictions

## Phase 4: E-commerce 💳
- [ ] Set up Stripe account
- [ ] Collect Stripe config (secret key, publishable key) — do not proceed without values
- [ ] Create product database
- [ ] Build product catalog
- [ ] Implement shopping cart
- [ ] Create checkout flow
- [ ] Add order history
- [ ] Test payment flow

## Phase 5: Polish & Deploy 🚀
- [ ] Add 3D hero to landing
- [ ] Create feedback forms
- [ ] Add GDPR features
- [ ] Run all tests
- [ ] Deploy to Vercel
- [ ] Configure production env
- [ ] Final testing

## Completed ✅
(Move items here when done)

---

## Technical Debt

See `tasks/tech-debt.md` for the running register of deferred items and cleanup work. Promote items into the phase lists above when prioritizing.
