# Tasks: DPNR Platform - Full AWS Production Integration

**Input**: Design documents from `/specs/003-add-this-to/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Flow Summary
This implementation will take the DPNR platform fully operational with:
- AWS Cognito User Pool authentication with Hebrew/English support
- Supabase PostgreSQL production database integration
- JWT token validation and session management
- Enhanced user models with Cognito integration
- Production-ready authentication endpoints

**Tech Stack**: TypeScript 5.x, Next.js 14, AWS Cognito, Supabase PostgreSQL, Prisma ORM
**Structure**: Web application (backend/ and frontend/ directories)

## ⚠️ CRITICAL: Required User Information Collection

**BEFORE STARTING ANY IMPLEMENTATION**, the user must provide these credentials and configuration details:

### AWS Cognito Configuration:
- [ ] **AWS Region** (e.g., us-east-1, eu-west-1)
- [ ] **Cognito User Pool ID** (format: us-east-1_XXXXXXXXX)
- [ ] **Cognito App Client ID** (format: xxxxxxxxxxxxxxxxxxxxxxxxxx)
- [ ] **Cognito Domain** (format: your-domain.auth.region.amazoncognito.com)
- [ ] **OAuth Callback URLs** for production and development
- [ ] **OAuth Logout URLs** for production and development
- [ ] **Custom Attributes Configuration** (preferred_language, role, marketing_consent)

### Supabase Database Configuration:
- [ ] **Supabase Project URL** (from Supabase dashboard)
- [ ] **Database Password** (generated during Supabase project creation)
- [ ] **Connection Pooling URL** (from Dashboard → Settings → Database)
- [ ] **Public API Key** (anon key)
- [ ] **Service Role Key** (for server-side operations)

### Deployment URLs:
- [ ] **Production Frontend URL** (Vercel: https://frontend-sigma-topaz-44.vercel.app)
- [ ] **Production Backend URL** (where backend will be deployed)
- [ ] **Development URLs** (localhost:3000 frontend, localhost:3001 backend)

### Optional Configuration:
- [ ] **Tranzila Terminal ID** (for payment processing)
- [ ] **Tranzila API Key** (for payment processing)
- [ ] **AWS SES Configuration** (for email notifications)

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All paths are absolute from repository root

---

## Phase 3.1: Infrastructure Setup & Environment Configuration

- [ ] **T001** Create AWS Cognito User Pool with Hebrew/English localization and custom attributes
- [ ] **T002** Set up Supabase PostgreSQL database with connection pooling configuration
- [ ] **T003** [P] Configure backend environment variables for AWS Cognito in `/Users/Rad/registration_site/regist_site/backend/.env`
- [ ] **T004** [P] Configure frontend environment variables for Cognito and API URLs in `/Users/Rad/registration_site/regist_site/frontend/.env.local`
- [ ] **T005** [P] Update Vercel environment variables for production deployment
- [ ] **T006** Install AWS Cognito SDK dependencies in backend (`@aws-sdk/client-cognito-identity-provider`, `aws-jwt-verify`)
- [ ] **T007** Install Cognito dependencies in frontend (`@aws-amplify/auth`, `@aws-amplify/core`)
- [ ] **T008** [P] Update Prisma schema with enhanced Cognito integration in `/Users/Rad/registration_site/regist_site/backend/prisma/schema.prisma`

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Authentication Contract Tests
- [ ] **T009** [P] Contract test POST /auth/login in `/Users/Rad/registration_site/regist_site/backend/tests/contract/auth/login.test.ts`
- [ ] **T010** [P] Contract test POST /auth/callback in `/Users/Rad/registration_site/regist_site/backend/tests/contract/auth/callback.test.ts`
- [ ] **T011** [P] Contract test GET /auth/profile in `/Users/Rad/registration_site/regist_site/backend/tests/contract/auth/profile.test.ts`
- [ ] **T012** [P] Contract test POST /auth/refresh in `/Users/Rad/registration_site/regist_site/backend/tests/contract/auth/refresh.test.ts`
- [ ] **T013** [P] Contract test POST /auth/logout in `/Users/Rad/registration_site/regist_site/backend/tests/contract/auth/logout.test.ts`
- [ ] **T014** [P] Contract test GET /auth/verify in `/Users/Rad/registration_site/regist_site/backend/tests/contract/auth/verify.test.ts`

### Integration Tests
- [ ] **T015** [P] Integration test AWS Cognito User Pool connection in `/Users/Rad/registration_site/regist_site/backend/tests/integration/cognito-integration.test.ts`
- [ ] **T016** [P] Integration test Supabase database connection in `/Users/Rad/registration_site/regist_site/backend/tests/integration/database-connection.test.ts`
- [ ] **T017** [P] Integration test JWT token validation flow in `/Users/Rad/registration_site/regist_site/backend/tests/integration/jwt-validation.test.ts`
- [ ] **T018** [P] Integration test user registration and profile sync in `/Users/Rad/registration_site/regist_site/backend/tests/integration/user-registration.test.ts`
- [ ] **T019** [P] E2E test authentication flow with Hebrew/English in `/Users/Rad/registration_site/regist_site/frontend/tests/e2e/auth-flow.spec.ts`

---

## Phase 3.3: Enhanced Data Models (ONLY after tests are failing)

- [ ] **T020** [P] Enhanced User model with Cognito fields in `/Users/Rad/registration_site/regist_site/backend/src/models/User.ts`
- [ ] **T021** [P] UserSession model for JWT management in `/Users/Rad/registration_site/regist_site/backend/src/models/UserSession.ts`
- [ ] **T022** [P] Authentication types and interfaces in `/Users/Rad/registration_site/regist_site/backend/src/types/auth.ts`
- [ ] **T023** [P] Cognito configuration types in `/Users/Rad/registration_site/regist_site/backend/src/types/cognito.ts`
- [ ] **T024** Run Prisma database migration with enhanced User model including cognitoId field
- [ ] **T025** Create database indexes for Cognito integration performance optimization

---

## Phase 3.4: Authentication Services & JWT Handling

- [ ] **T026** [P] CognitoService for User Pool operations in `/Users/Rad/registration_site/regist_site/backend/src/services/CognitoService.ts`
- [ ] **T027** [P] JWTService for token validation in `/Users/Rad/registration_site/regist_site/backend/src/services/JWTService.ts`
- [ ] **T028** [P] Enhanced UserService with Cognito sync in `/Users/Rad/registration_site/regist_site/backend/src/services/UserService.ts`
- [ ] **T029** [P] AuthService orchestrating authentication flow in `/Users/Rad/registration_site/regist_site/backend/src/services/AuthService.ts`
- [ ] **T030** [P] SessionService for user session management in `/Users/Rad/registration_site/regist_site/backend/src/services/SessionService.ts`

---

## Phase 3.5: Backend Middleware & Utilities

- [ ] **T031** JWT authentication middleware in `/Users/Rad/registration_site/regist_site/backend/src/middleware/auth.ts`
- [ ] **T032** [P] Cognito token validation utilities in `/Users/Rad/registration_site/regist_site/backend/src/utils/cognito.ts`
- [ ] **T033** [P] Database connection utilities for Supabase in `/Users/Rad/registration_site/regist_site/backend/src/utils/database.ts`
- [ ] **T034** [P] Error handling utilities for auth errors in `/Users/Rad/registration_site/regist_site/backend/src/utils/errors.ts`
- [ ] **T035** [P] CORS configuration for production domains in `/Users/Rad/registration_site/regist_site/backend/src/middleware/cors.ts`
- [ ] **T036** [P] Rate limiting for authentication endpoints in `/Users/Rad/registration_site/regist_site/backend/src/middleware/rateLimit.ts`

---

## Phase 3.6: Authentication API Endpoints

- [ ] **T037** POST /auth/login endpoint - Cognito OAuth initiation in `/Users/Rad/registration_site/regist_site/backend/src/api/auth/login.ts`
- [ ] **T038** POST /auth/callback endpoint - OAuth token exchange in `/Users/Rad/registration_site/regist_site/backend/src/api/auth/callback.ts`
- [ ] **T039** GET /auth/profile endpoint - authenticated user profile in `/Users/Rad/registration_site/regist_site/backend/src/api/auth/profile.ts`
- [ ] **T040** POST /auth/refresh endpoint - JWT token refresh in `/Users/Rad/registration_site/regist_site/backend/src/api/auth/refresh.ts`
- [ ] **T041** POST /auth/logout endpoint - session termination in `/Users/Rad/registration_site/regist_site/backend/src/api/auth/logout.ts`
- [ ] **T042** GET /auth/verify endpoint - JWT token validation in `/Users/Rad/registration_site/regist_site/backend/src/api/auth/verify.ts`

---

## Phase 3.7: Frontend Authentication Integration

### Authentication Context & Providers
- [ ] **T043** [P] AuthContext with Cognito integration in `/Users/Rad/registration_site/regist_site/frontend/src/lib/auth/AuthContext.tsx`
- [ ] **T044** [P] AuthProvider component for app-wide auth in `/Users/Rad/registration_site/regist_site/frontend/src/lib/auth/AuthProvider.tsx`
- [ ] **T045** [P] Cognito client configuration in `/Users/Rad/registration_site/regist_site/frontend/src/lib/cognito.ts`
- [ ] **T046** [P] Authentication hooks (useAuth, useUser) in `/Users/Rad/registration_site/regist_site/frontend/src/lib/auth/hooks.ts`

### Authentication Components
- [ ] **T047** [P] Login button component with language support in `/Users/Rad/registration_site/regist_site/frontend/src/components/auth/LoginButton.tsx`
- [ ] **T048** [P] Logout component in `/Users/Rad/registration_site/regist_site/frontend/src/components/auth/LogoutButton.tsx`
- [ ] **T049** [P] Authentication callback page in `/Users/Rad/registration_site/regist_site/frontend/src/app/auth/callback/page.tsx`
- [ ] **T050** [P] Protected route wrapper component in `/Users/Rad/registration_site/regist_site/frontend/src/components/auth/ProtectedRoute.tsx`

### UI Integration
- [ ] **T051** Update landing page with authentication integration in `/Users/Rad/registration_site/regist_site/frontend/src/app/page.tsx`
- [ ] **T052** [P] User profile page with authenticated data in `/Users/Rad/registration_site/regist_site/frontend/src/app/profile/page.tsx`
- [ ] **T053** [P] Language switcher with auth persistence in `/Users/Rad/registration_site/regist_site/frontend/src/components/LanguageSwitcher.tsx`

---

## Phase 3.8: GDPR Compliance & Security

- [ ] **T054** [P] Data export functionality for authenticated users in `/Users/Rad/registration_site/regist_site/backend/src/api/users/data-export.ts`
- [ ] **T055** [P] Account deletion with soft delete in `/Users/Rad/registration_site/regist_site/backend/src/api/users/delete.ts`
- [ ] **T056** [P] Privacy consent tracking service in `/Users/Rad/registration_site/regist_site/backend/src/services/ConsentService.ts`
- [ ] **T057** [P] Security headers middleware in `/Users/Rad/registration_site/regist_site/backend/src/middleware/security.ts`
- [ ] **T058** [P] Input validation and sanitization in `/Users/Rad/registration_site/regist_site/backend/src/utils/validation.ts`

---

## Phase 3.9: Monitoring & Logging

- [ ] **T059** [P] Structured logging for authentication events in `/Users/Rad/registration_site/regist_site/backend/src/utils/logger.ts`
- [ ] **T060** [P] Authentication metrics collection in `/Users/Rad/registration_site/regist_site/backend/src/services/MetricsService.ts`
- [ ] **T061** [P] Error boundaries for frontend auth components in `/Users/Rad/registration_site/regist_site/frontend/src/components/ErrorBoundary.tsx`
- [ ] **T062** Database health monitoring setup in `/Users/Rad/registration_site/regist_site/backend/src/utils/healthCheck.ts`

---

## Phase 3.10: Testing & Validation

### Unit Tests
- [ ] **T063** [P] Unit tests for CognitoService in `/Users/Rad/registration_site/regist_site/backend/tests/unit/services/CognitoService.test.ts`
- [ ] **T064** [P] Unit tests for JWTService in `/Users/Rad/registration_site/regist_site/backend/tests/unit/services/JWTService.test.ts`
- [ ] **T065** [P] Unit tests for AuthService in `/Users/Rad/registration_site/regist_site/backend/tests/unit/services/AuthService.test.ts`
- [ ] **T066** [P] Unit tests for authentication middleware in `/Users/Rad/registration_site/regist_site/backend/tests/unit/middleware/auth.test.ts`

### Performance & Load Testing
- [ ] **T067** [P] Performance tests for authentication endpoints (<500ms response time)
- [ ] **T068** [P] Load testing for concurrent user authentication scenarios
- [ ] **T069** [P] Frontend performance testing with Lighthouse CI for authenticated flows

### Production Validation
- [ ] **T070** Execute quickstart guide production setup validation from `/Users/Rad/registration_site/regist_site/specs/003-add-this-to/quickstart.md`
- [ ] **T071** Test complete authentication flow in production environment
- [ ] **T072** Validate Hebrew/English language persistence across authentication sessions
- [ ] **T073** Test JWT token expiration and refresh functionality in production
- [ ] **T074** Validate GDPR compliance features work in production environment

---

## Dependencies & Critical Path

### Setup Dependencies
- User credential collection → T001-T002 (AWS Cognito & Supabase setup)
- T001-T008 (Infrastructure) before all other phases
- T024-T025 (Database migration) before service implementation

### TDD Dependencies
- **CRITICAL**: Contract tests (T009-T014) must FAIL before endpoint implementation (T037-T042)
- Integration tests (T015-T019) must be written before service implementation
- All tests before corresponding implementation

### Implementation Dependencies
- Models (T020-T023) → Services (T026-T030) → Middleware (T031-T036) → Endpoints (T037-T042)
- Backend auth complete → Frontend integration (T043-T053)
- Core functionality → Security & compliance (T054-T058)

---

## Parallel Execution Examples

### Phase 1: Environment Setup (T003-T007)
```bash
# Launch environment configuration tasks together:
Task: "Configure backend environment variables for AWS Cognito"
Task: "Configure frontend environment variables for Cognito and API URLs"
Task: "Update Vercel environment variables for production deployment"
Task: "Install AWS Cognito SDK dependencies in backend"
Task: "Install Cognito dependencies in frontend"
```

### Phase 2: Contract Tests (T009-T014)
```bash
# Launch all authentication contract tests together:
Task: "Contract test POST /auth/login"
Task: "Contract test POST /auth/callback"
Task: "Contract test GET /auth/profile"
Task: "Contract test POST /auth/refresh"
Task: "Contract test POST /auth/logout"
Task: "Contract test GET /auth/verify"
```

### Phase 3: Authentication Services (T026-T030)
```bash
# Launch all authentication services together:
Task: "CognitoService for User Pool operations"
Task: "JWTService for token validation"
Task: "Enhanced UserService with Cognito sync"
Task: "AuthService orchestrating authentication flow"
Task: "SessionService for user session management"
```

### Phase 4: Frontend Auth Components (T043-T050)
```bash
# Launch frontend authentication components together:
Task: "AuthContext with Cognito integration"
Task: "AuthProvider component for app-wide auth"
Task: "Cognito client configuration"
Task: "Authentication hooks (useAuth, useUser)"
Task: "Login button component with language support"
Task: "Logout component"
Task: "Authentication callback page"
Task: "Protected route wrapper component"
```

---

## Validation Checklist ✅

- [x] All authentication contracts have corresponding tests (T009-T014 → T037-T042)
- [x] All authentication models have implementation tasks (T020-T023)
- [x] All tests come before implementation (Phase 3.2 before 3.6)
- [x] Parallel tasks target different files with no dependencies
- [x] Each task specifies exact file path
- [x] TDD approach enforced with failing tests first
- [x] User credentials collection emphasized before implementation
- [x] Hebrew/English language support included throughout
- [x] GDPR compliance features included
- [x] Production validation scenarios included

---

## Execution Strategy

**Total Tasks**: 74 tasks across 10 phases
**Parallel Opportunities**: 45 tasks marked [P] can run simultaneously
**Estimated Timeline**: 2-3 hours for infrastructure setup + 2-3 weeks for full implementation
**Critical Path**: User credentials → Infrastructure → Tests → Services → Endpoints → Frontend → Validation

**Next Step**: Collect all required user credentials and configuration details before beginning any implementation tasks.

**Success Criteria**:
- ✅ Users can register/login via AWS Cognito hosted UI
- ✅ JWT tokens validate correctly on all protected routes
- ✅ User data syncs between Cognito and Supabase database
- ✅ Hebrew/English language preference persists across sessions
- ✅ GDPR compliance features work (data export, deletion)
- ✅ Performance targets met (<500ms API, <2s page load)
- ✅ Production deployment successful with all environment variables configured