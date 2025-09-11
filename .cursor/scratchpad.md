# Project: DPNR Course Platform

## SUPERVISOR RECOMMENDATION TO AI CODER

### Critical Context
You are joining a greenfield project to build a market validation website for DPNR's in-person course offerings. This is an AI-first development project where 100% of code must be written by AI agents, with zero context assumption between sessions.

### Primary Documents to Read FIRST
1. **MANDATORY**: `/Users/Rad/dpnr_course_site/dpnr-course-prd.md` - This is the bible for this project. DO NOT MODIFY without explicit permission.
2. **CHECK**: `/Users/Rad/dpnr_course_site/dpnr-course-platform/tasks/todo.md` - Current task tracking
3. **REVIEW**: This scratchpad file for ongoing work status

### Project Philosophy & Constraints
- **Simplicity Over Complexity**: Always choose the simplest working solution
- **No Scope Drift**: If it's not in the PRD, don't add it
- **Fixed Tech Stack**: DO NOT substitute technologies listed in PRD
- **Test Everything**: Each component must work before moving forward
- **Document Progress**: Update todo.md after every task completion

### Current Project State
- **Status**: Initial setup phase
- **Directory**: `/Users/Rad/dpnr_course_site/dpnr-course-platform/`
- **Structure**: Basic monorepo structure created with apps/, packages/, docs/, tasks/ directories
- **Next Steps**: Need to initialize Next.js project and set up development environment

### Tech Stack (FIXED - NO SUBSTITUTIONS)
**Frontend:**
- Next.js 14 (App Router)
- Tailwind CSS
- React Three Fiber + Drei (3D elements - landing page only)
- Shadcn/ui (UI components)
- React Hook Form + Zod (forms)
- Zustand (state management)
- AWS Amplify Auth

**Backend:**
- PostgreSQL with Prisma ORM
- Next.js API Routes (NOT separate backend)
- AWS S3 (file storage)
- Iron Session
- Stripe (payments)

### Implementation Priorities
1. **Phase 1 Foundation** (Current):
   - Initialize Next.js project with TypeScript
   - Set up Prisma with PostgreSQL
   - Configure Tailwind CSS
   - Create basic page structure

2. **Phase 2 Authentication**:
   - AWS Cognito setup
   - Registration/login flows
   - Session management

3. **Phase 3 Core Features**:
   - Video library
   - Course information
   - Materials download

4. **Phase 4 E-commerce**:
   - Stripe integration
   - Product catalog
   - Checkout flow

5. **Phase 5 Polish**:
   - 3D hero section
   - GDPR compliance
   - Deployment

### Critical Warnings
1. **NEVER modify dpnr-course-prd.md** - It's the single source of truth
2. **NEVER add features not in PRD** - No matter how "helpful" they seem
3. **NEVER change the tech stack** - Use exactly what's specified
4. **ALWAYS test before marking complete** - Broken code blocks progress
5. **ALWAYS update todo.md** - It's how we track progress across sessions

### Recommended First Actions
1. Read the entire PRD document thoroughly
2. Check current todo.md status
3. Initialize Next.js 14 project in `/apps/web` if not done
4. Set up the development environment with all required dependencies
5. Configure TypeScript, Tailwind, and Prisma
6. Create the basic folder structure as specified in PRD
7. Test that development server runs without errors

### Success Criteria for MVP
- Working authentication system (GDPR compliant)
- Video content delivery functional
- Payment processing operational
- Calendar integration working
- 3D elements load without performance issues
- Data structure ready for future migration

### Communication with Human User
- Be concise and direct
- Show progress visually when possible
- Ask for clarification if requirements are unclear
- Report blockers immediately
- Confirm successful completions with evidence (screenshots, test outputs)

### Quality Standards
- Mobile responsive (test on multiple viewports)
- Page load under 3 seconds
- Zero console errors in production
- All forms have proper validation
- User-friendly error messages
- Accessibility standards (WCAG 2.1 AA)

Remember: This is a real project for a real business. Quality matters, deadlines matter, and the code must be maintainable by future AI agents with zero context.

---

## Background and Motivation
Building a market validation website for DPNR's in-person course offerings. This platform serves as a bridge between current course operations and a future full web application. The emphasis is on simplicity, security, and data portability with 100% AI-first development approach.

## Key Challenges and Analysis
1. **Zero Context Development**: Each AI session starts fresh - documentation must be exhaustive
2. **Tech Stack Discipline**: Preventing AI hallucination by enforcing strict tech constraints
3. **GDPR Compliance**: European data protection requirements must be built-in from start
4. **Performance with 3D**: Balancing visual appeal with load times on landing page
5. **Data Migration Ready**: Structure must support future transition to full application

## High-level Task Breakdown
[To be filled by Planner after initial assessment]

## Project Status Board
[To be populated based on current todo.md]

## Current Status / Progress Tracking
- Project directory structure created
- Basic monorepo setup initialized
- PRD document finalized and locked
- Ready for Phase 1: Foundation implementation

## Executor's Feedback or Assistance Requests
[None at this time - awaiting initial task assignment]

## Supervisor Review Log
### Plan Reviews
- Date: 2025-09-11, Status: Initial Setup, Comments: Project structure created, PRD locked, ready for development

### Code Review Checkpoints
[To be filled as code is written]

### Quality Metrics
- Test Coverage: N/A (no code yet)
- Performance: N/A
- Security: N/A

## Quality Standards Checklist
- [ ] Code follows established patterns
- [ ] Adequate test coverage (>80%)
- [ ] No security vulnerabilities
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] Error handling comprehensive

## Architecture Decisions Record (ADR)
[To be filled as decisions are made]

## Lessons
- Always read PRD first before any development work
- Check todo.md for current task status
- Update tracking documents after each task
- Test every component before marking complete
- Use exact tech stack specified - no substitutions