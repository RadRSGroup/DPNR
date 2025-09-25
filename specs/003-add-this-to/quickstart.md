# Quickstart Guide: DPNR Course Landing Page

## Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 14+
- AWS Account with Cognito configured
- Tranzila merchant account
- Git

## Initial Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd registration_site

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration

Create `.env` files in both backend and frontend directories:

**backend/.env**
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dpnr_dev"

# AWS
AWS_REGION=eu-west-1
AWS_COGNITO_USER_POOL_ID=your-pool-id
AWS_COGNITO_CLIENT_ID=your-client-id
AWS_SES_FROM_EMAIL=noreply@be-dpnr.com

# Tranzila
TRANZILA_TERMINAL=your-terminal
TRANZILA_API_KEY=your-api-key
TRANZILA_MODE=test

# Server
PORT=3001
NODE_ENV=development
```

**frontend/.env.local**
```env
# API
NEXT_PUBLIC_API_URL=http://localhost:3001/v1

# AWS Cognito
NEXT_PUBLIC_AWS_REGION=eu-west-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=your-pool-id
NEXT_PUBLIC_COGNITO_CLIENT_ID=your-client-id

# Analytics (optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### 3. Database Setup

```bash
# Navigate to backend
cd backend

# Run database migrations
npx prisma migrate dev

# Seed initial data (creates first cohort)
npx prisma db seed
```

### 4. Start Development Servers

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

Visit http://localhost:3000 to see the landing page.

## Testing the Implementation

### 1. Verify Page Sections

1. **Hero Section**
   - ✓ Displays "YOU ARE THE MOST VALUABLE RESOURCE IN THE WORLD"
   - ✓ Shows "Become Your 2.0 Self" subtitle
   - ✓ Hebrew CTA button "המסע שלך מתחיל עכשיו" is clickable

2. **About DPNR**
   - ✓ Program overview is visible
   - ✓ Lital Shoshan's introduction displays
   - ✓ Value proposition is clear

3. **Course Structure**
   - ✓ Shows "5 months, 20 sessions"
   - ✓ Location displays as "Mazkeret Batya"
   - ✓ Limited spots notice is visible

4. **Curriculum Modules**
   - ✓ All 6 modules are listed
   - ✓ Modules expand/collapse on click
   - ✓ Session details visible when expanded

5. **Pricing**
   - ✓ Three payment options displayed
   - ✓ Prices in ILS (₪)
   - ✓ Included items listed

### 2. Test Enrollment Flow

```bash
# Run enrollment test
npm run test:enrollment

# Manual test steps:
1. Click "המסע שלך מתחיל עכשיו" button
2. Fill enrollment form:
   - Name: Test User
   - Email: test@example.com
   - Phone: 050-1234567
   - Complete questionnaire
3. Select payment plan
4. Submit form
5. Verify redirect to payment page
```

### 3. Test Consultation Request

```bash
# Run consultation test
npm run test:consultation

# Manual test steps:
1. Navigate to enrollment section
2. Click "Schedule Consultation"
3. Fill form with:
   - Name: Test Consultant
   - Email: consult@example.com
   - Phone: 052-9876543
   - Preferred time: Evening
4. Submit form
5. Verify confirmation message
```

### 4. Test Responsive Design

```bash
# Run responsive tests
npm run test:responsive

# Manual test:
1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test these viewports:
   - Mobile: 375x667 (iPhone SE)
   - Tablet: 768x1024 (iPad)
   - Desktop: 1920x1080
4. Verify all content is readable and functional
```

### 5. Test RTL Support

```bash
# Test Hebrew content
1. Verify page direction is RTL
2. Check text alignment is right-aligned
3. Verify navigation flows right-to-left
4. Test form inputs accept Hebrew text
```

### 6. Test Authentication

```bash
# Test member portal access
1. Click "Portal" or "Login" link
2. Register new account:
   - Email: member@example.com
   - Password: TestPass123!
3. Verify email confirmation
4. Login with credentials
5. Verify personalized dashboard appears
```

## API Testing

### Test Endpoints

```bash
# Get current cohort
curl http://localhost:3001/v1/cohorts/current

# Create enrollment (POST)
curl -X POST http://localhost:3001/v1/enrollments \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "phone": "050-1234567",
    "paymentPlan": "full",
    "questionnaire": {
      "motivation": "I want to grow personally",
      "previousExperience": false,
      "expectations": "Learn new skills",
      "agreedToTerms": true,
      "agreedToPrivacy": true,
      "marketingConsent": true
    }
  }'

# Request consultation
curl -X POST http://localhost:3001/v1/consultations \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Consultant",
    "email": "consult@example.com",
    "phone": "052-9876543",
    "preferredTimeSlot": "Evening"
  }'
```

## Performance Testing

```bash
# Run Lighthouse CI
npm run lighthouse

# Performance targets:
- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Cumulative Layout Shift: <0.1
- Performance Score: >90
```

## Accessibility Testing

```bash
# Run accessibility tests
npm run test:a11y

# Manual checks:
1. Navigate using only keyboard (Tab, Enter, Arrow keys)
2. Test with screen reader (NVDA/JAWS)
3. Verify color contrast ratios
4. Check focus indicators are visible
```

## GDPR Compliance Testing

```bash
# Test data export
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/v1/users/data-export

# Test account deletion
curl -X POST -H "Authorization: Bearer <token>" \
  http://localhost:3001/v1/users/delete \
  -d '{"confirmEmail": "user@example.com"}'

# Verify cookie consent banner appears
# Verify privacy policy link works
# Test consent management
```

## Production Deployment

### 1. Environment Setup

```bash
# Set production environment variables
export NODE_ENV=production
export DATABASE_URL=<production-db-url>
export TRANZILA_MODE=production
```

### 2. Build Applications

```bash
# Build backend
cd backend
npm run build

# Build frontend
cd ../frontend
npm run build
```

### 3. Database Migration

```bash
# Run production migrations
cd backend
npx prisma migrate deploy
```

### 4. Deploy to Vercel (Frontend)

```bash
cd frontend
vercel --prod
```

### 5. Deploy to AWS Lambda (Backend)

```bash
cd backend
npm run deploy
```

## Troubleshooting

### Common Issues

1. **Database connection error**
   - Check PostgreSQL is running
   - Verify DATABASE_URL is correct
   - Run `npx prisma generate`

2. **Cognito authentication fails**
   - Verify AWS credentials
   - Check User Pool configuration
   - Ensure CORS settings allow localhost

3. **Payment processing error**
   - Verify Tranzila credentials
   - Check test mode is enabled
   - Ensure webhook URL is accessible

4. **RTL layout issues**
   - Add `dir="rtl"` to html tag
   - Use logical CSS properties
   - Test with Hebrew content

5. **Build failures**
   - Clear node_modules and reinstall
   - Check Node.js version (18+)
   - Verify all environment variables

## Support

- Documentation: `/docs`
- Email: support@be-dpnr.com
- Issue Tracker: GitHub Issues

## Production Integration (AWS Cognito + Supabase)

### Quick Production Setup (2-3 hours)

**Current Status**: Frontend deployed to Vercel, Backend ready for deployment
**Goal**: Full AWS Cognito authentication + Production PostgreSQL database

#### Phase 1: AWS Cognito Setup (45 min)
```bash
# 1. Create User Pool in AWS Console
Pool Name: dpnr-production-users
Authentication: Email + Phone (optional)
Custom Attributes:
  - custom:preferred_language (String)
  - custom:role (String)
  - custom:marketing_consent (String)

# 2. Create App Client
Name: dpnr-web-client
Auth flows: ✓ Authorization code grant
Callback URLs:
  - https://frontend-sigma-topaz-44.vercel.app/auth/callback
  - http://localhost:3000/auth/callback
Sign out URLs:
  - https://frontend-sigma-topaz-44.vercel.app/
OAuth scopes: ✓ email ✓ openid ✓ profile

# 3. Configure Hosted UI
Domain: dpnr-auth.auth.us-east-1.amazoncognito.com
Languages: English, Hebrew (עברית)
```

#### Phase 2: Supabase Database (30 min)
```bash
# 1. Create Supabase project at https://supabase.com
Project: dpnr-production
Region: Europe West (Frankfurt)
Password: [Generate strong password]

# 2. Get connection string
# Dashboard → Settings → Database → Connection pooling URL

# 3. Migrate existing schema
cd /Users/Rad/registration_site/regist_site/backend
export DATABASE_URL="postgresql://postgres.xxx:[PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
npx prisma generate
npx prisma db push
```

#### Phase 3: Environment Configuration (15 min)
```bash
# Backend .env
DATABASE_URL="postgresql://postgres.xxx:[PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
AWS_REGION="us-east-1"
COGNITO_USER_POOL_ID="us-east-1_XXXXXXXXX"
COGNITO_CLIENT_ID="xxxxxxxxxxxxxxxxxxxxxxxxxx"
COGNITO_DOMAIN="dpnr-auth.auth.us-east-1.amazoncognito.com"

# Vercel Environment Variables
NEXT_PUBLIC_API_URL="https://your-backend-url.com/v1"
NEXT_PUBLIC_COGNITO_USER_POOL_ID="us-east-1_XXXXXXXXX"
NEXT_PUBLIC_COGNITO_CLIENT_ID="xxxxxxxxxxxxxxxxxxxxxxxxxx"
NEXT_PUBLIC_COGNITO_DOMAIN="dpnr-auth.auth.us-east-1.amazoncognito.com"
```

#### Phase 4: Authentication Testing (30 min)
```bash
# Test complete flow:
1. Visit https://frontend-sigma-topaz-44.vercel.app
2. Click "Login" or "Enroll"
3. Complete Cognito authentication
4. Verify user created in Supabase
5. Test Hebrew/English language switching
6. Verify JWT token validation
```

#### Phase 5: Production Validation (30 min)
```bash
# End-to-end validation checklist:
✓ User registration via Cognito hosted UI
✓ Authentication redirects work correctly
✓ User data syncs to Supabase database
✓ JWT tokens validate on protected routes
✓ Language preference persists
✓ Course enrollment creates database records
✓ HTTPS enforced everywhere
✓ Performance targets met (<2s load, <500ms API)
```

### Quick Troubleshooting
```bash
# Authentication redirect loops
- Check callback URLs match exactly in Cognito
- Verify CORS configuration allows frontend domain

# Database connection failures
- Confirm connection string includes ?pgbouncer=true
- Check Supabase project is not paused
- Verify SSL mode is require

# JWT validation errors
- Check issuer URL matches User Pool
- Verify client ID matches app client
- Confirm token hasn't expired

# Hebrew text issues
- Verify UTF-8 encoding in database
- Check RTL CSS properties
- Confirm Hebrew fonts loading correctly
```

### Production Success Criteria
- ✅ Users can register/login via AWS Cognito
- ✅ Database stores user and enrollment data in Supabase
- ✅ Frontend deployed with custom domain
- ✅ Backend validates JWT tokens
- ✅ Hebrew/English bilingual support working
- ✅ Performance targets achieved
- ✅ GDPR compliance features active

## Next Steps

After successful production integration:
1. Configure custom domain for Cognito hosted UI
2. Set up monitoring and alerting (CloudWatch, Supabase alerts)
3. Configure backup and disaster recovery
4. Plan content updates workflow
5. Set up CI/CD pipeline for future updates
6. Implement analytics and user tracking