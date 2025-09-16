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

**3D Framework Integration**: Implementing RS Group-inspired responsive 3D elements to enhance user engagement and create a premium, modern feel for the course platform while maintaining performance and accessibility.

## Key Challenges and Analysis
1. **Zero Context Development**: Each AI session starts fresh - documentation must be exhaustive
2. **Tech Stack Discipline**: Preventing AI hallucination by enforcing strict tech constraints
3. **GDPR Compliance**: European data protection requirements must be built-in from start
4. **Performance with 3D**: Balancing visual appeal with load times on landing page
5. **Data Migration Ready**: Structure must support future transition to full application

### 3D Framework Integration Challenges:
6. **Existing 3D Setup**: Platform already has Three.js, R3F, and Drei installed with a basic Hero3D component - need to enhance without breaking existing functionality
7. **Performance Optimization**: Must implement adaptive quality settings for mobile/tablet/desktop with automatic fallbacks
8. **Progressive Enhancement**: 3D features should enhance, not hinder, core functionality - graceful degradation required
9. **Bundle Size Management**: Adding advanced 3D features without significantly impacting initial load times
10. **Cross-browser Compatibility**: Ensuring WebGL support detection and appropriate fallbacks

## High-level Task Breakdown

### REPOSITORY REORGANIZATION PLAN (2025-09-15)

#### Phase 1: Create Proper Structure
1. **Establish Documentation Hierarchy**
   - Keep `.claude/` at root for Claude-specific configs
   - Move all project docs to `dpnr-course-platform/docs/`
   - Create proper agent specifications in platform docs
   - Success Criteria: Clear separation of tool config vs project docs

2. **Organize Project Documentation**
   - Move PRD to `dpnr-course-platform/docs/requirements/dpnr-course-prd.md`
   - Move 3D docs to `dpnr-course-platform/docs/3d/`
   - Ensure all agents have specs in `dpnr-course-platform/docs/agents/`
   - Success Criteria: All docs in correct locations per PRD structure

3. **Clean Root Directory**
   - Move example components to `dpnr-course-platform/examples/`
   - Remove duplicate images
   - Keep only git, tool configs at root
   - Success Criteria: Clean root with only config files

#### Phase 2: Consolidate Agent Specifications
4. **Merge Agent Documentation**
   - Compare `.claude/agents/` with intended `/docs/agents/`
   - Create complete set in `dpnr-course-platform/docs/agents/`
   - Update references in PRD if needed
   - Success Criteria: Single source of truth for agents

5. **Update Command Structure**
   - Keep `.claude/commands/` for Claude-specific commands
   - Document usage in platform README
   - Success Criteria: Clear command organization

#### Phase 3: Update References
6. **Fix All Path References**
   - Update PRD references to new locations
   - Update scratchpad references
   - Update any imports/links
   - Success Criteria: No broken references

### REVISED PLAN - LANDING PAGE PROOF OF CONCEPT

### Phase 1: Foundation & AWS S3 Setup (Day 1)
1. **Audit & Document Current Hero3D**
   - Document existing Hero3D implementation for reference
   - Measure baseline performance (FPS, load time)
   - Prepare for complete replacement
   - Success Criteria: Baseline metrics documented

2. **AWS S3 Configuration**
   - Set up S3 bucket for 3D assets
   - Configure CORS for asset delivery
   - Create CDN distribution if needed
   - Success Criteria: S3 bucket ready for asset storage

3. **Dependency Installation**
   - Install framer-motion for animations
   - Install @use-gesture/react for interactions
   - Install leva for development debugging (dev only)
   - Success Criteria: All dependencies installed, no conflicts

4. **Create Core Framework Structure**
   - Set up `/components/3d-framework/` directory
   - Create only necessary subdirectories for landing page
   - Success Criteria: Minimal structure for POC created

### Phase 2: Core Components for Landing (Day 1-2)
5. **Build ResponsiveCanvas Wrapper**
   - Implement device detection utility
   - Create adaptive quality settings
   - Add WebGL fallback for unsupported devices
   - Success Criteria: Canvas adapts to all devices

6. **Implement Performance Monitor**
   - Create FPS monitoring system
   - Build automatic quality adjustment
   - Success Criteria: Maintains 30 FPS mobile, 60 FPS desktop

7. **Build Enhanced HeroScene Component**
   - Create new hero to replace Hero3D
   - Add particle effects and floating animation
   - Implement Framer Motion entrance animations
   - Success Criteria: Smooth, engaging hero animation

### Phase 3: Landing Page Integration (Day 2)
8. **Replace Hero3D Component**
   - Remove old Hero3D implementation
   - Integrate new HeroScene
   - Ensure backward compatibility with existing styles
   - Success Criteria: New hero fully replaces old one

9. **Add Scroll-Triggered Elements**
   - Implement basic ScrollScene for landing sections
   - Add 2-3 scroll-triggered animations
   - Success Criteria: Smooth scroll interactions

10. **AWS S3 Asset Integration**
    - Upload any 3D models/textures to S3
    - Configure asset loading from S3
    - Implement loading states
    - Success Criteria: Assets load from S3 CDN

### Phase 4: Testing & Optimization (Day 3)
11. **Performance Optimization**
    - Optimize bundle size (<3MB total)
    - Ensure <1MB initial load
    - Test on real devices
    - Success Criteria: Meets all performance targets

12. **Functional Testing**
    - Test hero animation functionality
    - Verify scroll interactions work
    - Test fallbacks on non-WebGL devices
    - Success Criteria: All features functional

13. **Cross-Browser Verification**
    - Test in Chrome, Firefox, Safari, Edge
    - Verify mobile touch interactions
    - Success Criteria: Works in all major browsers

### Phase 5: Documentation & Technical Debt (Day 3)
14. **Documentation**
    - Document new component usage
    - Create migration guide from Hero3D
    - Update implementation notes
    - Success Criteria: Clear documentation for future AI agents

15. **Technical Debt Documentation**
    - Document plan for extending to other pages
    - List E2E testing requirements
    - Note performance optimization opportunities
    - Success Criteria: Clear roadmap for future work

## Project Status Board

### Repository Reorganization (PRIORITY - 2025-09-15)
- [ ] Task 1: Create docs/requirements directory - Success Criteria: Directory structure ready
- [ ] Task 2: Move PRD to platform docs - Success Criteria: PRD in docs/requirements/
- [ ] Task 3: Create docs/agents directory - Success Criteria: All agent specs consolidated
- [ ] Task 4: Move 3D documentation - Success Criteria: 3D docs in proper location
- [ ] Task 5: Create examples directory - Success Criteria: Example components organized
- [ ] Task 6: Clean root directory - Success Criteria: Only configs at root
- [ ] Task 7: Update all path references - Success Criteria: No broken links
- [ ] Task 8: Document new structure - Success Criteria: Clear README with structure

### 3D Framework POC - Landing Page Only (DEFERRED)
- [ ] Task 1: Audit current Hero3D - Success Criteria: Baseline metrics documented
- [ ] Task 2: Configure AWS S3 bucket - Success Criteria: S3 ready for assets
- [ ] Task 3: Install dependencies - Success Criteria: framer-motion, @use-gesture/react installed
- [ ] Task 4: Create framework structure - Success Criteria: /components/3d-framework/ created
- [ ] Task 5: Build ResponsiveCanvas - Success Criteria: Device adaptation working
- [ ] Task 6: Implement Performance Monitor - Success Criteria: FPS monitoring active
- [ ] Task 7: Build new HeroScene - Success Criteria: Particles & animations working
- [ ] Task 8: Replace Hero3D component - Success Criteria: Old component removed
- [ ] Task 9: Add scroll animations - Success Criteria: 2-3 scroll triggers working
- [ ] Task 10: Integrate S3 assets - Success Criteria: Assets loading from CDN
- [ ] Task 11: Performance optimization - Success Criteria: <3MB total, 30/60 FPS
- [ ] Task 12: Functional testing - Success Criteria: All features work
- [ ] Task 13: Browser testing - Success Criteria: Chrome, Firefox, Safari, Edge OK
- [ ] Task 14: Documentation - Success Criteria: Usage guide complete
- [ ] Task 15: Document tech debt - Success Criteria: Future roadmap clear

## Current Status / Progress Tracking
- Project directory structure created
- Basic monorepo setup initialized
- PRD document finalized and locked
- Next.js 14 app initialized with TypeScript
- Three.js, R3F, Drei already installed and working
- Basic Hero3D component implemented
- Authentication system (AWS Cognito) implemented
- Database schema (Prisma) configured
- Ready for 3D Framework Enhancement

## Executor's Feedback or Assistance Requests

### Tranzila Payment Callback Implementation Plan (2025-09-15)

## ANALYSIS SUMMARY

After thorough analysis of the current Tranzila integration, I've identified both strengths and areas for improvement. The system has a solid foundation but needs enhancement in several critical areas.

### CURRENT STATE ANALYSIS

**✅ What's Already Working:**
1. **Checkout Flow**: Complete implementation in `/Users/Rad/dpnr_course_site/dpnr-course-platform/apps/web/app/api/shop/checkout/route.ts`
   - Proper inventory validation
   - Order creation with PENDING status
   - Tranzila payment session creation
   - Secure redirect to payment gateway

2. **Basic Callback Handler**: Exists at `/Users/Rad/dpnr_course_site/dpnr-course-platform/apps/web/app/api/payment/callback/route.ts`
   - Handles both POST (Tranzila callbacks) and GET (manual verification) requests
   - Basic payment verification using TranzilaClient
   - Order status updates (PAID/CANCELLED)
   - Redirects to success/failure pages

3. **User Experience Pages**: Success and failure pages exist with proper error handling
   - `/Users/Rad/dpnr_course_site/dpnr-course-platform/apps/web/app/payment/success/page.tsx`
   - `/Users/Rad/dpnr_course_site/dpnr-course-platform/apps/web/app/payment/failure/page.tsx`

4. **Database Schema**: Well-designed Order/OrderItem models with proper payment tracking fields
   - `paymentId`, `paymentProvider`, `paymentStatus` fields available
   - Proper user/product relationships

5. **Tranzila Client**: Comprehensive implementation with verification and query capabilities

**🔧 Critical Gaps Identified:**

1. **Inventory Management**: No inventory reduction on successful payment
2. **Webhook Validation**: Missing signature validation from Tranzila
3. **Order Fulfillment**: No automated processing (enrollments, material access)
4. **Email Notifications**: No confirmation emails
5. **Idempotency**: No protection against duplicate callbacks
6. **Error Recovery**: No retry mechanism for failed fulfillment
7. **Logging & Monitoring**: Minimal logging for production debugging
8. **Security Headers**: Missing proper CORS and security headers
9. **Rate Limiting**: No protection against callback abuse
10. **Testing Infrastructure**: No mechanism to test callbacks locally

## DETAILED IMPLEMENTATION PLAN

### Phase 1: Enhanced Security & Validation (Priority: CRITICAL)

**Task 1.1: Implement Webhook Signature Validation**
- Location: `/Users/Rad/dpnr_course_site/dpnr-course-platform/apps/web/lib/tranzila.ts`
- Add method to validate Tranzila callbacks using terminal secret
- Prevent unauthorized callback manipulation
- Success Criteria: All callbacks validated before processing

**Task 1.2: Add Idempotency Protection**
- Location: `/Users/Rad/dpnr_course_site/dpnr-course-platform/apps/web/app/api/payment/callback/route.ts`
- Check for duplicate transaction processing
- Add `processedAt` timestamp to orders
- Success Criteria: Duplicate callbacks ignored safely

**Task 1.3: Enhance CSRF Protection**
- Extend existing CSRF implementation for payment flows
- Add additional headers for callback endpoint security
- Success Criteria: All payment endpoints properly protected

### Phase 2: Order Fulfillment Automation (Priority: HIGH)

**Task 2.1: Inventory Management**
- Location: `/Users/Rad/dpnr_course_site/dpnr-course-platform/apps/web/app/api/payment/callback/route.ts`
- Reduce product inventory on successful payment
- Add inventory restoration on payment failure (with timeout)
- Success Criteria: Inventory properly managed for all scenarios

**Task 2.2: Course Enrollment Processing**
- Create enrollment records for course products
- Update enrollment status based on payment success
- Handle enrollment failures gracefully
- Success Criteria: Automatic course access on payment success

**Task 2.3: Digital Product Delivery**
- Grant access to digital materials/resources
- Update user permissions for purchased content
- Success Criteria: Immediate access to purchased digital products

### Phase 3: Communication & Notifications (Priority: HIGH)

**Task 3.1: Email Notification System**
- Location: Create `/Users/Rad/dpnr_course_site/dpnr-course-platform/apps/web/lib/email.ts`
- Send payment confirmation emails
- Send failure notification emails
- Include order details and next steps
- Success Criteria: All payment outcomes trigger appropriate emails

**Task 3.2: Admin Notifications**
- Notify administrators of high-value transactions
- Alert on payment failures requiring investigation
- Success Criteria: Admin visibility into payment processing

### Phase 4: Error Handling & Recovery (Priority: HIGH)

**Task 4.1: Implement Transaction Retry Logic**
- Location: `/Users/Rad/dpnr_course_site/dpnr-course-platform/apps/web/lib/payment-processor.ts`
- Retry failed fulfillment operations
- Exponential backoff for transient failures
- Success Criteria: Resilient processing of edge cases

**Task 4.2: Enhanced Error Logging**
- Comprehensive logging for all payment operations
- Structured logs for monitoring and debugging
- Success Criteria: Complete audit trail of payment processing

**Task 4.3: Fallback Mechanisms**
- Manual review queue for failed automation
- Admin interface for processing stuck orders
- Success Criteria: No orders permanently stuck in processing

### Phase 5: User Experience Enhancements (Priority: MEDIUM)

**Task 5.1: Enhanced Success/Failure Pages**
- Add order details to success page
- Show purchased items and access instructions
- Provide clear next steps for users
- Success Criteria: Users understand what they purchased and how to access it

**Task 5.2: Order Status API**
- Location: `/Users/Rad/dpnr_course_site/dpnr-course-platform/apps/web/app/api/orders/[id]/route.ts`
- Allow users to check order status
- Provide order history in dashboard
- Success Criteria: Users can track their order status

**Task 5.3: Mobile-Optimized Experience**
- Ensure callback redirects work properly on mobile
- Test payment flow on mobile devices
- Success Criteria: Seamless mobile payment experience

### Phase 6: Testing & Monitoring (Priority: MEDIUM)

**Task 6.1: Callback Testing Infrastructure**
- Location: `/Users/Rad/dpnr_course_site/dpnr-course-platform/apps/web/app/api/payment/test-callback/route.ts`
- Create test endpoints for simulating callbacks
- Add development tools for testing scenarios
- Success Criteria: Easy testing of all payment scenarios

**Task 6.2: Monitoring & Analytics**
- Add payment success/failure metrics
- Monitor callback processing times
- Success Criteria: Visibility into payment system performance

**Task 6.3: Integration Testing**
- End-to-end testing of complete payment flow
- Test edge cases and error conditions
- Success Criteria: Comprehensive test coverage

## IMPLEMENTATION PRIORITY MATRIX

**MUST HAVE (Week 1):**
- Webhook signature validation
- Idempotency protection
- Inventory management
- Email notifications
- Enhanced error logging

**SHOULD HAVE (Week 2):**
- Order fulfillment automation
- Retry logic for failed operations
- Enhanced user experience pages
- Order status API

**NICE TO HAVE (Future):**
- Advanced monitoring and analytics
- Admin interface for manual processing
- Comprehensive integration testing
- Performance optimizations

## TECHNICAL SPECIFICATIONS

### Database Schema Updates Required:
```sql
-- Add to Order model
processedAt DateTime?
fulfillmentStatus String? -- "PENDING", "PROCESSING", "COMPLETED", "FAILED"
retryCount Int @default(0)
lastRetryAt DateTime?
```

### New Environment Variables:
```env
TRANZILA_WEBHOOK_SECRET=  # For signature validation
EMAIL_SMTP_HOST=          # For notifications
EMAIL_SMTP_USER=          # Email credentials
EMAIL_SMTP_PASS=          # Email credentials
EMAIL_FROM=               # Sender email address
ADMIN_EMAIL=              # Admin notifications
```

### API Endpoints to Create/Enhance:
1. `/api/payment/callback` - Enhanced with validation and fulfillment
2. `/api/orders/[id]` - Order status checking
3. `/api/payment/test-callback` - Testing utilities
4. `/api/admin/orders` - Admin order management

## TESTING STRATEGY

**Unit Tests:**
- TranzilaClient verification methods
- Payment callback processing logic
- Email notification system
- Inventory management functions

**Integration Tests:**
- Complete checkout to fulfillment flow
- Error handling scenarios
- Email delivery verification
- Database consistency checks

**End-to-End Tests:**
- Full payment flow with test cards
- Mobile device testing
- Browser compatibility testing
- Performance testing under load

## SECURITY CONSIDERATIONS

1. **Webhook Security**: Validate all Tranzila callbacks with signature verification
2. **Rate Limiting**: Implement rate limits on callback endpoints
3. **Input Validation**: Strict validation of all payment data
4. **Audit Logging**: Complete audit trail of all payment operations
5. **PCI Compliance**: Ensure no sensitive card data is stored
6. **Data Encryption**: Encrypt sensitive order data at rest

## SUCCESS METRICS

- **Payment Success Rate**: >95% successful payment processing
- **Callback Processing Time**: <2 seconds average
- **Error Recovery Rate**: >90% of failed operations recovered automatically
- **User Satisfaction**: Clear success/failure messaging, immediate access to purchased content
- **Admin Efficiency**: Minimal manual intervention required

This plan provides a comprehensive roadmap for enhancing the Tranzila payment integration with proper error handling, security, and user experience while maintaining the existing working functionality.

### Repository Reorganization Analysis (2025-09-15)

**Current Issues Identified:**
1. **Duplicate Agent Specifications**: Agents exist in both `.claude/agents/` (root) and `dpnr-course-platform/docs/agents/` (should be canonical location per PRD)
2. **Misplaced Documentation**: Critical PRD and 3D framework docs in root instead of project folder
3. **Scattered 3D Assets**: `.tsx` files and images in root that belong in project
4. **Commands in Wrong Location**: `.claude/commands/` should be in project structure
5. **Missing Agent Specifications**: PRD references `/docs/agents/` but most agents missing from platform docs

**Files That Need Moving:**
- Root level: `dpnr-course-prd.md` → Should be project reference doc
- Root level: `3d-framework-dpnr.md`, `3d-framework-implementation-plan.md` → Project docs
- Root level: `forest_stream_3d.tsx`, `smooth_tree_scene.tsx` → Component examples
- Root level: `Treephoto copy.jpeg` → Duplicate of platform asset
- `.claude/` directory → Contains agent specs that should be in platform

### Supervisor Decisions (2025-09-11):

1. **Scope**: Proof of concept for hero/landing page only. Extended implementation to be added to technical debt for future phases.

2. **Performance Targets - CONFIRMED**:
   - Mobile: 30 FPS minimum
   - Desktop: 60 FPS target
   - Load time budget: <1MB initial, <3MB total

3. **Hero3D Migration**: REPLACE existing Hero3D component entirely with new framework implementation.

4. **Asset Management**: Use AWS S3 for all 3D models and textures.

5. **Testing Requirements**: Functional tests only for now. Complete E2E testing to be added to technical debt.

### Updated Implementation Focus:
- Landing page hero section only (proof of concept)
- Replace existing Hero3D with enhanced version
- AWS S3 integration for assets
- Functional testing to verify components work
- Document technical debt for future expansion

## Supervisor Review Log
### Plan Reviews
- Date: 2025-09-11, Status: Initial Setup, Comments: Project structure created, PRD locked, ready for development
- Date: 2025-09-11, Status: 3D Framework Plan APPROVED, Comments: Scope reduced to landing page POC, AWS S3 for assets, replace Hero3D, functional tests only

### Supervisor Approval Notes:
- **Approved Scope**: Landing page proof of concept only
- **Key Decision**: Complete replacement of Hero3D component
- **Asset Strategy**: AWS S3 for all 3D assets
- **Testing Level**: Functional tests for POC, E2E deferred
- **Performance Targets**: 30 FPS mobile, 60 FPS desktop, <3MB total
- **Timeline**: 3 days for complete POC implementation
- **Future Work**: Extension to other pages added to technical debt

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

### Decision 1: Repository Structure Reorganization (2025-09-15)
- **Context**: Project files scattered across root and subdirectories, making it difficult for AI agents to locate resources
- **Decision**: Reorganize to follow PRD structure with all project files under dpnr-course-platform/
- **Alternatives Considered**: 
  1. Keep current structure with better documentation
  2. Create symlinks to maintain backward compatibility
  3. Full reorganization with proper hierarchy
- **Rationale**: Clean structure essential for AI-first development where agents start with zero context

### File Movement Strategy (2025-09-15)

#### Immediate Moves (Priority 1):
```bash
# Create required directories
mkdir -p dpnr-course-platform/docs/requirements
mkdir -p dpnr-course-platform/docs/agents  
mkdir -p dpnr-course-platform/examples/3d-components

# Move core documentation
mv dpnr-course-prd.md dpnr-course-platform/docs/requirements/
mv 3d-framework-*.md dpnr-course-platform/docs/3d/

# Move example components
mv forest_stream_3d.tsx dpnr-course-platform/examples/3d-components/
mv smooth_tree_scene.tsx dpnr-course-platform/examples/3d-components/

# Copy agent specs (merge from .claude/agents/)
cp .claude/agents/*.md dpnr-course-platform/docs/agents/

# Remove duplicate image
rm "Treephoto copy.jpeg"
```

#### Configuration Updates (Priority 2):
1. Update scratchpad to reference new PRD location
2. Update any imports in existing code
3. Create README at root explaining structure
4. Update .gitignore if needed

#### Documentation Structure (Final):
```
/dpnr_course_site/
├── .claude/              # Claude-specific configs (keep at root)
├── .cursor/              # Cursor configs (keep at root)
├── .git/                 # Git repository
├── dpnr-course-platform/ # Main project directory
│   ├── apps/
│   │   └── web/         # Next.js application
│   ├── docs/
│   │   ├── requirements/
│   │   │   └── dpnr-course-prd.md
│   │   ├── agents/      # All agent specifications
│   │   ├── 3d/          # 3D framework docs
│   │   └── security/    # Security docs
│   ├── examples/
│   │   └── 3d-components/
│   ├── packages/
│   ├── tasks/
│   │   ├── todo.md
│   │   └── tech-debt.md
│   └── README.md
└── README.md            # Root readme explaining structure
```

## Lessons
- Always read PRD first before any development work
- Check todo.md for current task status
- Update tracking documents after each task
- Test every component before marking complete
- Use exact tech stack specified - no substitutions

---

# NEW PROJECT: Language Toggle for Modern Hebrew Translation

## Background and Motivation
Implementing a language toggle feature to support Modern Hebrew translation across the DPNR course platform. This will enhance accessibility for Hebrew-speaking users and expand the platform's reach. The implementation will use React hooks for state management and a delegation pattern for translation services.

## Key Challenges and Analysis

### Technical Challenges:
1. **State Management**: Managing language preference across the entire application with proper persistence
2. **Translation Architecture**: Implementing a scalable translation system using hooks and delegation patterns
3. **RTL Support**: Hebrew requires right-to-left (RTL) text direction and layout adjustments
4. **Dynamic Content**: Handling translations for both static UI text and dynamic content from the database
5. **Performance**: Ensuring translations don't impact page load times or user experience
6. **SEO Considerations**: Maintaining proper SEO with multiple languages
7. **Component Updates**: Updating all existing components to support translations without breaking functionality

### Implementation Considerations:
- Use React Context for global language state management
- Implement custom hooks for translation access (useTranslation)
- Create delegation pattern for translation services
- Support lazy loading of translation files
- Ensure proper caching of translations
- Handle pluralization and interpolation
- Support date/time/number formatting for Hebrew locale

## High-level Task Breakdown

### Phase 1: Core Infrastructure Setup
1. **Create Translation Architecture**
   - Set up translation file structure (JSON-based)
   - Create translation service with delegation pattern
   - Implement caching mechanism
   - Success Criteria: Translation service can load and serve translations

2. **Implement Language Context & Provider**
   - Create LanguageContext using React Context API
   - Build LanguageProvider component
   - Add localStorage persistence for language preference
   - Success Criteria: Global language state accessible throughout app

3. **Create useTranslation Hook**
   - Build custom hook for component translation access
   - Implement namespace support for organized translations
   - Add interpolation support for dynamic values
   - Success Criteria: Components can easily access translations

4. **Build Language Toggle Component**
   - Create toggle UI component (dropdown or switch)
   - Integrate with LanguageContext
   - Add visual feedback for current language
   - Success Criteria: Users can switch between English and Hebrew

### Phase 2: RTL Support Implementation
5. **Configure RTL Styles**
   - Update Tailwind configuration for RTL support
   - Create RTL-aware utility classes
   - Implement direction switching logic
   - Success Criteria: Layout properly mirrors for Hebrew

6. **Update Document Direction**
   - Add dynamic dir attribute to HTML element
   - Update meta tags for language
   - Implement font switching for Hebrew
   - Success Criteria: Entire page direction changes with language

### Phase 3: Translation Content Creation
7. **Create Translation Files**
   - Set up English translation file (en.json)
   - Create Hebrew translation file (he.json)
   - Organize translations by namespace/module
   - Success Criteria: All UI text has translations

8. **Implement Translation Keys**
   - Define consistent key naming convention
   - Create nested structure for organization
   - Add common translations (buttons, labels, messages)
   - Success Criteria: Logical translation key structure

### Phase 4: Component Integration
9. **Update Navigation Components**
   - Integrate translations in Header component
   - Update navigation menu items
   - Translate authentication UI elements
   - Success Criteria: All navigation elements translated

10. **Update Page Components**
    - Add translations to landing page
    - Update dashboard pages
    - Translate course-related pages
    - Success Criteria: All pages display in selected language

11. **Update Form Components**
    - Translate form labels and placeholders
    - Localize validation messages
    - Update error messages
    - Success Criteria: Forms fully functional in both languages

### Phase 5: Advanced Features
12. **Implement Date/Time Localization**
    - Configure date formatting for Hebrew
    - Update calendar components
    - Localize time displays
    - Success Criteria: Dates/times display in Hebrew format

13. **Add Number Formatting**
    - Configure number formatting for Hebrew locale
    - Update price displays
    - Localize currency formatting
    - Success Criteria: Numbers formatted correctly for Hebrew

14. **Handle Dynamic Content**
    - Create strategy for database content translation
    - Implement content field mapping
    - Add fallback for untranslated content
    - Success Criteria: Dynamic content displays appropriately

### Phase 6: Testing & Optimization
15. **Test RTL Layout**
    - Verify all components display correctly in RTL
    - Test responsive behavior
    - Check for layout breaking issues
    - Success Criteria: No visual bugs in Hebrew mode

16. **Performance Optimization**
    - Implement lazy loading for translation files
    - Add translation caching
    - Optimize bundle size
    - Success Criteria: No performance degradation

17. **Cross-Browser Testing**
    - Test in all major browsers
    - Verify mobile experience
    - Check RTL support across browsers
    - Success Criteria: Consistent experience across platforms

## Technical Specifications

### File Structure:
```
dpnr-course-platform/apps/web/
├── lib/
│   ├── i18n/
│   │   ├── translations/
│   │   │   ├── en.json
│   │   │   └── he.json
│   │   ├── TranslationService.ts
│   │   ├── LanguageContext.tsx
│   │   └── hooks/
│   │       └── useTranslation.ts
├── components/
│   └── LanguageToggle.tsx
```

### Translation File Format:
```json
{
  "common": {
    "buttons": {
      "submit": "Submit",
      "cancel": "Cancel"
    },
    "navigation": {
      "home": "Home",
      "about": "About"
    }
  },
  "auth": {
    "login": "Sign In",
    "register": "Sign Up"
  }
}
```

### Hook Usage Example:
```typescript
function MyComponent() {
  const { t, language, setLanguage } = useTranslation('common');

  return <button>{t('buttons.submit')}</button>;
}
```

### Delegation Pattern:
- TranslationService delegates to specific translation providers
- Supports multiple translation sources (static files, API, database)
- Extensible for future translation services

## Success Metrics
- All UI text available in both English and Hebrew
- Seamless language switching without page reload
- Proper RTL layout for Hebrew
- No performance impact from translation system
- User language preference persisted across sessions
- Accessibility standards maintained in both languages