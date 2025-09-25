# Implementation Plan: DPNR Platform - Full AWS Production Integration

**Branch**: `003-add-this-to` | **Date**: 2025-09-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-add-this-to/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✅ Feature spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✅ Project Type: web (frontend + backend)
   → ✅ Structure Decision: Option 2 (Web application)
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → ✅ Constitution reviewed - template constitution found
   → ✅ Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → ✅ Technical context resolved with current deployment status
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
7. Re-evaluate Constitution Check section
   → ✅ Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. ✅ STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
**Primary Requirement**: Take the DPNR course registration platform fully operational with complete AWS Cognito authentication and production PostgreSQL database integration, including step-by-step user instructions and validation procedures.

**Technical Approach**: The platform is already deployed with frontend on Vercel and backend infrastructure ready. This implementation will complete the production setup by integrating AWS Cognito User Pool with the frontend authentication flow, connecting the backend to a production PostgreSQL database (Supabase), and creating comprehensive user onboarding with validation processes.

## Technical Context
**Language/Version**: TypeScript 5.x, Node.js 18+, Next.js 14.2.32
**Primary Dependencies**: AWS Cognito SDK, Prisma ORM, Express.js, next-intl, Tailwind CSS
**Storage**: PostgreSQL 15+ (Supabase), AWS Cognito User Pool
**Testing**: Jest, Cypress E2E, Playwright, API contract testing
**Target Platform**: Vercel (frontend), AWS Lambda/Railway (backend), Supabase (database)
**Project Type**: web - full-stack application with frontend and backend
**Performance Goals**: <2s page load, <500ms API response, 99.9% uptime
**Constraints**: GDPR compliance, Hebrew RTL support, mobile-first responsive
**Scale/Scope**: 1000+ concurrent users, multi-cohort management, bilingual support

**Current Deployment Status**:
- ✅ Frontend deployed to Vercel: https://frontend-sigma-topaz-44.vercel.app
- ✅ Backend TypeScript compilation working locally
- ✅ Database schema ready with Prisma
- ⏳ Need AWS Cognito User Pool setup
- ⏳ Need production database connection
- ⏳ Need authentication flow integration

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitution Status**: Template constitution found - no specific project constitution defined
**Assessment**: No constitutional violations detected for this implementation:
- Following web application best practices
- Maintaining existing project structure
- Adding production integrations without architectural changes
- Preserving security and compliance requirements

✅ **PASS**: No constitutional violations for production integration tasks

## Project Structure

### Documentation (this feature)
```
specs/003-add-this-to/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 2: Web application (current structure)
backend/
├── src/
│   ├── models/          # ✅ Prisma models with AWS Cognito integration
│   ├── services/        # ✅ Business logic services
│   ├── api/             # ✅ Express API routes
│   ├── utils/           # ✅ JWT verification, middleware
│   └── types/           # ✅ TypeScript definitions
├── prisma/              # ✅ Database schema and migrations
├── tests/               # ⏳ Contract and integration tests needed
└── scripts/             # ✅ Database setup and deployment scripts

frontend/
├── src/
│   ├── components/      # ✅ React components with Auth provider
│   ├── app/             # ✅ Next.js 14 App Router pages
│   ├── lib/             # ✅ AWS Cognito client configuration
│   ├── i18n/            # ✅ Hebrew/English internationalization
│   └── types/           # ✅ TypeScript definitions
├── public/              # ✅ Static assets
└── tests/               # ⏳ E2E tests for auth flow needed
```

**Structure Decision**: Option 2 (Web application) - matches current project structure

## Phase 0: Outline & Research

**Research Status**: ✅ COMPLETE - All technical contexts resolved based on current deployment

### Key Research Findings:

1. **AWS Cognito Integration**:
   - Decision: Use AWS Cognito User Pool with hosted UI
   - Rationale: Fully managed, GDPR compliant, supports Hebrew/English
   - Implementation: @aws-amplify/auth for frontend, aws-jwt-verify for backend

2. **Database Selection**:
   - Decision: Supabase PostgreSQL
   - Rationale: Fast setup, excellent Prisma integration, free tier available
   - Connection: Connection pooling for serverless deployment

3. **Authentication Flow**:
   - Decision: OAuth 2.0 with Cognito hosted UI + custom integration
   - Rationale: Reduces frontend complexity, professional appearance
   - Localization: Cognito supports Hebrew UI localization

4. **Deployment Strategy**:
   - Frontend: Already on Vercel ✅
   - Backend: Railway/AWS Lambda with environment variables
   - Database: Supabase with automated backups

**Output**: ✅ research.md complete - all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts

### 1. Data Model Enhancement
**Status**: ✅ COMPLETE - Enhanced existing Prisma schema with Cognito integration

Key entities updated:
- User model: Added cognitoId field for AWS Cognito integration
- Enhanced authentication state management
- Privacy consent tracking for GDPR compliance

### 2. API Contracts
**Status**: ✅ COMPLETE - Generated OpenAPI contracts for:

Authentication endpoints:
- `POST /auth/login` - Cognito OAuth initiation
- `POST /auth/callback` - OAuth callback handling
- `GET /auth/profile` - User profile with JWT verification
- `POST /auth/logout` - Session termination

Enhanced existing endpoints with JWT middleware:
- All `/v1/enrollments/*` routes require authentication
- User-specific data filtering
- Role-based access control

### 3. Contract Tests
**Status**: ✅ COMPLETE - Generated failing contract tests for:
- JWT token validation
- User session management
- Protected route access
- Cognito integration points

### 4. User Stories Validation
**Status**: ✅ COMPLETE - Integration test scenarios for:
- User registration and email verification
- Course enrollment with authentication
- Multi-language authentication flow
- GDPR data export/deletion requests

### 5. Agent Context Update
**Status**: ✅ COMPLETE - Updated CLAUDE.md with:
- AWS Cognito configuration requirements
- Production database connection steps
- Authentication flow implementation
- Testing and validation procedures

**Output**: ✅ data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md complete

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. **Infrastructure Setup Tasks** (Priority 1):
   - AWS Cognito User Pool creation and configuration
   - Supabase database setup and connection
   - Environment variables configuration
   - SSL/Domain setup

2. **Authentication Integration Tasks** (Priority 2):
   - Frontend Cognito client implementation
   - Backend JWT verification middleware
   - User registration and login flows
   - Session management and logout

3. **Database Integration Tasks** (Priority 3):
   - Production database migration
   - User data synchronization
   - GDPR compliance features
   - Backup and monitoring setup

4. **Testing and Validation Tasks** (Priority 4):
   - End-to-end authentication testing
   - Load testing with production data
   - Security penetration testing
   - User acceptance testing

**Ordering Strategy**:
- Infrastructure first (parallel setup possible)
- Authentication integration (depends on infrastructure)
- Database integration (can parallel with auth)
- Testing and validation (final verification)

**Estimated Output**: 35-40 numbered, ordered tasks in tasks.md with detailed user instructions

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*No constitutional violations detected - no complexity justification needed*

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none needed)

---
*Based on Constitution v2.1.1 - See `.specify/memory/constitution.md`*