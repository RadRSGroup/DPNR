# Research: DPNR Course Landing Page

**Date**: 2025-09-21 | **Feature**: DPNR Course Landing Page

## Technical Decisions

### 1. Payment Gateway Integration (Tranzila)
**Decision**: Tranzila Direct API Integration with server-side tokenization
**Rationale**:
- Leading payment processor in Israel with native ILS support
- Built-in installment plan handling (5 and 12 payment options)
- PCI DSS compliant tokenization reduces security scope
- Hebrew language support in checkout flow
**Alternatives Considered**:
- PayPal: Higher fees for Israeli merchants, complex installment setup
- Stripe: Limited Israeli bank support, currency conversion fees
- Manual payment processing: Security and compliance risks

### 2. RTL Support Strategy
**Decision**: CSS Logical Properties with dir="rtl" attribute
**Rationale**:
- Native browser support for bidirectional text
- Automatic margin/padding flipping with logical properties
- Clean separation of LTR/RTL stylesheets
- Works seamlessly with Tailwind CSS utilities
**Alternatives Considered**:
- RTL-specific stylesheets: Maintenance overhead
- JavaScript-based flipping: Performance impact
- CSS-in-JS solutions: Added complexity

### 3. Bilingual Content Management
**Decision**: Next.js i18n with static JSON files
**Rationale**:
- Built-in Next.js internationalization support
- Static content for landing page (no CMS needed initially)
- Easy content updates via JSON files
- SEO-friendly URL structure (/he, /en)
**Alternatives Considered**:
- Headless CMS: Overkill for single landing page
- Database-driven content: Unnecessary complexity
- Client-side only i18n: Poor SEO

### 4. Authentication Architecture
**Decision**: AWS Cognito with Amplify UI Components
**Rationale**:
- Managed authentication service reduces security burden
- Built-in MFA, password policies, account recovery
- Amplify provides ready-made React components
- Scales to thousands of users without infrastructure changes
**Alternatives Considered**:
- Auth0: Higher cost at scale
- Custom JWT implementation: Security risks, maintenance burden
- Firebase Auth: Vendor lock-in concerns

### 5. Form Handling
**Decision**: React Hook Form with Zod validation
**Rationale**:
- Lightweight, performant form library
- Built-in validation with TypeScript support
- Works well with RTL layouts
- Minimal re-renders improves performance
**Alternatives Considered**:
- Formik: Larger bundle size, slower performance
- Native form handling: Complex validation logic
- React Final Form: Less active maintenance

### 6. Email Service
**Decision**: AWS SES with Hebrew/English templates
**Rationale**:
- Cost-effective for transactional emails
- Native AWS integration with Cognito
- Support for Hebrew character encoding
- High deliverability rates
**Alternatives Considered**:
- SendGrid: Higher costs at scale
- Mailgun: Complex Hebrew encoding
- SMTP relay: Deliverability concerns

### 7. Database Schema
**Decision**: PostgreSQL with Prisma ORM
**Rationale**:
- Robust relational database for enrollment data
- Prisma provides type-safe database access
- Built-in migration system
- JSON columns for flexible questionnaire data
**Alternatives Considered**:
- MongoDB: Overkill for structured enrollment data
- DynamoDB: Complex querying for reports
- Raw SQL: Type safety concerns

### 8. Hosting Architecture
**Decision**: Vercel for frontend, AWS Lambda for backend
**Rationale**:
- Vercel optimized for Next.js deployment
- Automatic scaling for traffic spikes
- Edge network for global performance
- Serverless backend reduces costs
**Alternatives Considered**:
- Full AWS deployment: Complex configuration
- Heroku: Higher costs, slower cold starts
- Traditional VPS: Scaling challenges

## Compliance & Security Considerations

### GDPR Requirements
1. **Consent Management**: Cookie banner with granular controls
2. **Data Portability**: JSON export endpoint for user data
3. **Right to Deletion**: Soft delete with 30-day retention for recovery
4. **Privacy Policy**: Dedicated page with Hebrew/English versions
5. **Data Minimization**: Only collect required enrollment data

### Israeli Privacy Protection
1. **Database Privacy Protection Law**: Register if storing >10k records
2. **Hebrew Language Requirements**: All legal text in Hebrew
3. **Local Data Storage**: Consider Israeli data residency (optional)

### Security Best Practices
1. **HTTPS Only**: Enforce SSL/TLS for all connections
2. **Input Sanitization**: XSS protection on all form inputs
3. **Rate Limiting**: Protect enrollment API from abuse
4. **CAPTCHA**: On consultation form to prevent spam
5. **Content Security Policy**: Restrict resource loading

## Performance Optimizations

### Image Optimization
- **Next.js Image Component**: Automatic optimization and lazy loading
- **WebP Format**: With JPEG fallback for older browsers
- **Responsive Images**: Different sizes for mobile/tablet/desktop
- **CDN Delivery**: CloudFront for static assets

### Bundle Optimization
- **Code Splitting**: Per-route bundles with Next.js
- **Tree Shaking**: Remove unused code
- **Dynamic Imports**: Load heavy components on demand
- **Font Subsetting**: Only Hebrew/English characters

### Caching Strategy
- **Static Generation**: Pre-render landing page at build time
- **Browser Caching**: Long cache headers for assets
- **API Caching**: Redis for frequently accessed data
- **CDN Caching**: Edge caching for global performance

## Accessibility Requirements

### WCAG 2.1 AA Compliance
1. **Semantic HTML**: Proper heading hierarchy, landmarks
2. **Keyboard Navigation**: Full keyboard support, skip links
3. **Screen Reader Support**: ARIA labels for interactive elements
4. **Color Contrast**: Minimum 4.5:1 for normal text
5. **Focus Indicators**: Visible focus states
6. **Alt Text**: Descriptive text for all images

### RTL Accessibility
1. **Logical Tab Order**: Respect RTL reading direction
2. **Mirrored Icons**: Directional icons flip for Hebrew
3. **Mixed Direction Text**: Proper bidi algorithm handling

## Development Tools

### Testing Stack
- **Jest**: Unit testing for utilities and services
- **React Testing Library**: Component testing
- **Cypress**: E2E testing with Hebrew/English scenarios
- **Lighthouse CI**: Automated performance testing
- **Pa11y**: Automated accessibility testing

### Development Workflow
- **TypeScript**: Type safety across frontend/backend
- **ESLint**: Code quality enforcement
- **Prettier**: Consistent formatting
- **Husky**: Pre-commit hooks for quality checks
- **GitHub Actions**: CI/CD pipeline

## Resolved Clarifications

Based on research and industry standards, the following decisions were made for items marked as NEEDS CLARIFICATION:

1. **Early Bird Pricing**: Not included in initial version
2. **Questionnaire Fields**: Name, email, phone, motivation (textarea), previous experience (yes/no)
3. **Email Automation**: Confirmation email only, manual follow-up
4. **Social Media**: Facebook and WhatsApp links (popular in Israel)
5. **Legal Pages**: Terms of Service and Privacy Policy required
6. **Cookie Consent**: Basic analytics cookies only
7. **Performance Target**: 2 second load time on 3G
8. **WCAG Level**: AA compliance (industry standard)
9. **Admin Updates**: Phase 2 - CMS integration
10. **Multiple Cohorts**: Database supports it, UI shows current only
11. **Waitlist**: Simple email capture when full
12. **Instructor Media**: Static images only initially
13. **Language Toggle**: Header toggle for Hebrew/English
14. **Testimonials**: Phase 2 feature
15. **FAQ Section**: Static accordion component
16. **Live Chat**: Not included initially

### 9. Modern Component Architecture
**Decision**: Responsive expandable cards with Framer Motion animations
**Rationale**:
- Modern UX requires progressive disclosure of information
- Card-based layouts work well on mobile and desktop
- Smooth animations enhance user engagement
- Modular components enable consistent design system
**Alternatives Considered**:
- Accordion-only interface: Limited visual appeal
- Tab-based navigation: Poor mobile experience
- Single-page scroll: Information overload

### 10. World-Class Design Implementation
**Decision**: Tailwind CSS + custom components with design tokens
**Rationale**:
- Utility-first CSS enables rapid responsive development
- Design tokens ensure consistent spacing, colors, typography
- Custom components provide branded experience
- Supports both Hebrew and English typography requirements
**Alternatives Considered**:
- Component libraries (Material-UI): Generic appearance
- CSS frameworks (Bootstrap): Heavy and outdated
- Pure CSS: Development overhead

## Component Design Patterns

### Expandable Information Cards
```typescript
interface ExpandableCard {
  id: string;
  title: string;
  preview: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
  gradient?: string;
  isExpanded: boolean;
  onToggle: () => void;
}
```

### Responsive Grid System
- Mobile: Single column cards
- Tablet: Two column grid
- Desktop: Three column grid with larger featured cards
- Breakpoints: 640px (sm), 768px (md), 1024px (lg), 1280px (xl)

### Animation Strategy
- Card expansion: 300ms ease-out transition
- Scroll reveals: Intersection observer triggers
- Hover states: Subtle scale and shadow effects
- Loading states: Skeleton screens for content

## Content Structure Enhancement

### Hero Section Design
- Full-viewport height with background video/animation
- Typography hierarchy with Hebrew font support
- Animated call-to-action with conversion tracking
- Trust indicators (testimonials, certifications)

### Course Module Cards
Each of the 6 modules presented as expandable cards:
1. **Identity & Values Foundation** - Sessions 1-5
2. **Fears, Trauma & Emotional Healing** - Sessions 6-10
3. **Change, Motivation & Persistence** - Sessions 11-13
4. **Relationships & Human Connections** - Sessions 14-15
5. **Faith, Leadership & Decision Making** - Sessions 16-17
6. **Manifestation, Abundance & Purpose** - Sessions 18-20

### Interactive Elements
- Progress indicators for enrollment steps
- Real-time capacity counter with visual feedback
- Payment plan calculator with dynamic pricing
- Mobile-optimized touch interactions

## Production Integration Research (2025-09-22 Update)

### Current Deployment Status Assessment
**Research Finding**: Platform is production-ready with foundation infrastructure deployed
- ✅ Frontend: Deployed to Vercel (https://frontend-sigma-topaz-44.vercel.app)
- ✅ Backend: TypeScript compilation working, API structure complete
- ✅ Database: Prisma schema ready with comprehensive models
- ⏳ Authentication: AWS Cognito integration needed
- ⏳ Database: Production connection setup needed

### AWS Cognito Production Integration Strategy
**Decision**: Enhanced Cognito User Pool with production-grade configuration
**Rationale**: Builds on existing research but requires production-specific configuration:
- User Pool with Hebrew/English localization
- Custom attributes for DPNR user metadata
- Production domain configuration for hosted UI
- MFA settings for enhanced security
- JWT token validation in backend middleware

**Implementation Steps**:
1. Create AWS Cognito User Pool with bilingual support
2. Configure hosted UI with custom domain
3. Set up app client with appropriate OAuth flows
4. Configure Hebrew UI localization
5. Integrate JWT verification middleware in backend
6. Update frontend authentication flow

### Production Database Integration
**Decision**: Supabase PostgreSQL with production configuration
**Rationale**: Fastest path to production with existing Prisma schema:
- Connection pooling for serverless deployment
- Automated backups and monitoring
- SSL connections for security
- Environment-specific database instances
- Migration strategy from local development

**Implementation Steps**:
1. Create Supabase project and database
2. Configure connection pooling
3. Run Prisma migrations to production database
4. Set up environment variables
5. Test backend connectivity
6. Configure monitoring and alerts

### User Experience Flow Design
**Decision**: Seamless authentication with language preference persistence
**Flow Design**:
1. User browses landing page in Hebrew/English
2. User clicks enrollment → redirected to Cognito hosted UI in same language
3. After authentication → returned to course content in same language
4. User profile stores language preference for future sessions
5. Member portal access with authenticated user context

### Security and Compliance Enhancement
**Decision**: Production-grade security implementation
**Components**:
- HTTPS enforcement with proper certificates
- JWT token validation on all protected routes
- Rate limiting for authentication endpoints
- CORS configuration for production domains
- Security headers implementation
- GDPR compliance with Cognito data handling

## Next Steps

With production integration research complete and current deployment status assessed, we can proceed to Phase 1: Design & Contracts. The next phase will create:
- Enhanced data models with AWS Cognito integration
- Production API contracts with authentication
- Contract tests for JWT validation
- Production deployment contracts
- Step-by-step user implementation guide