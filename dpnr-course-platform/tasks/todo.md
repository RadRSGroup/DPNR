# /tasks/todo.md

## Phase 1: Foundation ⏳
- [x] Initialize Next.js project with TypeScript
- [x] Install required dependencies
- [x] Set up Prisma with PostgreSQL
- [x] Create database schema
- [x] Configure environment variables
- [x] Set up basic routing
- [x] Create layout components

## Phase 2: Authentication 🔒
- [ ] Set up AWS Cognito user pool
- [ ] Configure Amplify Auth
- [x] Collect AWS Cognito config (region, user pool ID, client ID, callback URLs) — do not proceed without values
- [x] Create registration page
- [x] Create login page
- [x] Implement session management
- [x] Add protected route middleware
- [ ] Test auth flow end-to-end
- [x] Verify Cognito ID token server-side (aws-jwt-verify)
- [x] Add CSRF protection for state-changing API routes

## Phase 3: Core Features 📚
- [ ] Create landing page
- [x] Add YouTube embed component
- [x] Build video library page
- [x] Create course info page (basic list)
- [ ] Implement materials download (S3 presign pending)
- [ ] Collect AWS S3 config (region, bucket, IAM principal, key prefix policy) — do not proceed without values
- [x] Add calendar component (basic UI)
- [x] Create user dashboard (skeleton)
- [x] Implement GDPR export endpoint
- [x] Implement GDPR deletion endpoint
 - [x] Enforce enrollment checks before S3 signed URLs
 - [ ] Configure presigned URL TTLs and key scope restrictions
 - [ ] Replace fallback URL with real S3 presign
 - [x] Add Account page with GDPR actions

## Phase 4: E-commerce 💳
- [x] ~~Select non-Stripe PSP for Israel~~ **COMPLETED**: Tranzila selected and integrated
- [x] ~~Collect provider config/keys~~ **COMPLETED**: Tranzila test configuration active
- [x] ~~Create product database~~ **COMPLETED**: Products table with textbooks and workbooks
- [ ] Build product catalog
- [ ] Implement shopping cart
- [x] ~~Create checkout flow~~ **COMPLETED**: Full Tranzila checkout integration
- [ ] Add order history
- [x] ~~Test payment flow~~ **COMPLETED**: End-to-end testing verified

### Production Payment Readiness
- [ ] **CRITICAL**: Update Tranzila environment variables to production configuration
- [ ] **CRITICAL**: Implement payment callback handlers (`/api/payment/callback`)
- [ ] **CRITICAL**: Add inventory reduction on successful payment
- [ ] **HIGH**: Implement webhook signature validation for security
- [ ] **HIGH**: Add order tracking and payment status monitoring
- [ ] **MEDIUM**: Create refund functionality for cancellations

## Phase 5: Polish & Deploy 🚀
 - [x] Replace 3D hero with lightweight hero
- [x] Implement dark/light theme and palette
- [ ] Verify accessible contrast across themes
- [ ] Verify no 3D assets > 2MB total
- [ ] Cross-browser 3D sanity (Safari/iOS)
- [ ] Create feedback forms
- [ ] Add GDPR features
- [ ] Run all tests
- [ ] Deploy to Vercel
- [ ] Configure production env
- [ ] Final testing

## Completed ✅
- Initialize Next.js project with TypeScript
- Install required dependencies
- Set up Prisma with PostgreSQL
- Create database schema
- Configure environment variables
- Set up basic routing
- Create layout components

---

## Technical Debt

See `tasks/tech-debt.md` for the running register of deferred items and cleanup work. Promote items into the phase lists above when prioritizing.
