##DO NOT EVER MODIFY THIS DOCUMENT WITHOUT EXPLICIT PERMISSION!!!##
# DPNR Course Platform - Product Requirements Document
## Market Validation Website with AI-First Development

---

## 🎯 EXECUTIVE SUMMARY

### Project Context
Building a market validation website for DPNR's in-person course offerings. This platform will serve as a bridge between current course operations and the future full web application, with emphasis on simplicity, security, and data portability.

### Development Philosophy
- **AI-First Development**: 100% of code written by AI agents (Cursor, Codex, Claude Code)
- **Zero Context Assumption**: Documentation must be self-contained and exhaustive
- **Simplicity Over Complexity**: Choose proven, simple solutions
- **Strong Guardrails**: Explicit constraints to prevent hallucination and scope drift

### Success Criteria
1. Working authentication system (GDPR compliant)
2. Video content delivery
3. Payment processing for courses and materials
4. Calendar integration functioning
5. 3D elements loading without performance issues
6. Data structure ready for migration to full app

---

## 📁 PROJECT STRUCTURE

```
/dpnr-course-platform
├── /apps
│   ├── /web                 # Next.js 14 main website
│   └── /admin               # Admin dashboard 
├── /packages
│   ├── /database           # Prisma schema & migrations
│   ├── /ui                 # Shared UI components
│   └── /types              # TypeScript types
├── /infrastructure
│   └── /terraform          # AWS infrastructure
├── /docs
│   ├── /agents            # Agent specifications
│   ├── /api               # API documentation
│   └── /deployment        # Deployment guides
└── /tasks
    └── todo.md             # Task tracking
```

---

## 🤖 SPECIALIZED SUB-AGENTS

### Agent Directory
```
/docs/agents/
├── project-coordinator.md      # Orchestrates all development
├── frontend-developer.md       # Next.js & React
├── backend-developer.md        # API & database
├── auth-specialist.md          # Cognito & security
├── payment-specialist.md       # Stripe integration
├── 3d-specialist.md            # Three.js elements
├── testing-engineer.md        # Testing & QA
└── deployment-engineer.md      # AWS & deployment
```

---

## 📋 AGENT: PROJECT COORDINATOR

### Role
Orchestrate all development activities and maintain project coherence.

### Primary Responsibilities
1. Check `/tasks/todo.md` before any work
2. Assign tasks to appropriate specialist agents
3. Ensure no scope drift beyond PRD specifications
4. Validate each component works before moving forward
5. Update documentation after each milestone

### Guardrails
- **NEVER** add features not in this PRD
- **ALWAYS** choose simplest working solution
- **VERIFY** each component works before proceeding
- **UPDATE** todo.md after every task

### Task Assignment Protocol
```markdown
When starting work:
1. Read current task from todo.md
2. Identify required agent(s)
3. Execute task with explicit constraints
4. Test functionality
5. Update todo.md
6. Move to next task
```

---

## 📋 AGENT: FRONTEND DEVELOPER

### Tech Stack (FIXED - NO SUBSTITUTIONS)
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **3D**: React Three Fiber + Drei
- **UI Components**: Shadcn/ui
- **Forms**: React Hook Form + Zod
- **State**: Zustand (simpler than Redux)
- **Authentication**: AWS Amplify Auth

### Page Structure
```typescript
/app
├── /page.tsx                  # Landing with 3D hero
├── /about/page.tsx           # About with YouTube embed
├── /course/page.tsx          # Course information
├── /library/page.tsx         # Video library
├── /auth
│   ├── /login/page.tsx      # Login page
│   └── /register/page.tsx   # Registration
├── /dashboard              # Protected area
│   ├── /page.tsx           # User dashboard
│   ├── /materials/page.tsx # Downloads
│   ├── /calendar/page.tsx  # Schedule
│   └── /shop/page.tsx      # Merchandise
└── /api                    # API routes
```

### Component Implementation Rules
1. Use Shadcn/ui for ALL form elements
2. Implement 3D ONLY on landing page hero
3. YouTube embeds use iframe with privacy mode
4. Mobile-first responsive design
5. Accessibility standards (WCAG 2.1 AA)

### 3D Implementation (Landing Page Only)
```tsx
// EXACT implementation - no variations
import { Canvas } from '@react-three/fiber'
import { Float, Text3D, MeshDistortMaterial } from '@react-three/drei'

export function Hero3D() {
  return (
    <div className="h-screen relative">
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.5} />
        <Float speed={2} rotationIntensity={0.5}>
          <mesh>
            <sphereGeometry args={[1, 32, 32]} />
            <MeshDistortMaterial 
              color="#8b5cf6" 
              distort={0.3} 
              speed={2} 
            />
          </mesh>
        </Float>
      </Canvas>
    </div>
  )
}
```

---

## 📋 AGENT: BACKEND DEVELOPER

### Tech Stack (FIXED)
- **Database**: PostgreSQL with Prisma ORM
- **API**: Next.js API Routes (not separate backend)
- **File Storage**: AWS S3
- **Session**: Iron Session
- **Validation**: Zod

### Database Schema (Prisma)
```prisma
model User {
  id            String   @id @default(cuid())
  cognitoId     String   @unique
  email         String   @unique
  firstName     String
  lastName      String
  phone         String?
  address       Json?    // GDPR: encrypted
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  enrollments   Enrollment[]
  orders        Order[]
  feedbacks     Feedback[]
}

model Course {
  id            String   @id @default(cuid())
  title         String
  description   String
  price         Decimal
  startDate     DateTime
  endDate       DateTime
  capacity      Int
  
  enrollments   Enrollment[]
  materials     Material[]
}

model Enrollment {
  id            String   @id @default(cuid())
  userId        String
  courseId      String
  status        EnrollmentStatus
  paymentId     String?
  createdAt     DateTime @default(now())
  
  user          User     @relation(fields: [userId], references: [id])
  course        Course   @relation(fields: [courseId], references: [id])
}

model Material {
  id            String   @id @default(cuid())
  courseId      String
  title         String
  type          MaterialType // VIDEO, PDF, LINK
  url           String
  isPublic      Boolean  @default(false)
  
  course        Course   @relation(fields: [courseId], references: [id])
}

model Product {
  id            String   @id @default(cuid())
  sku           String   @unique
  name          String
  description   String
  price         Decimal
  inventory     Int
  category      ProductCategory // TEXTBOOK, WORKBOOK, MERCHANDISE
  
  orderItems    OrderItem[]
}

model Order {
  id            String   @id @default(cuid())
  userId        String
  total         Decimal
  status        OrderStatus
  stripeId      String?
  createdAt     DateTime @default(now())
  
  user          User     @relation(fields: [userId], references: [id])
  items         OrderItem[]
}

model OrderItem {
  id            String   @id @default(cuid())
  orderId       String
  productId     String
  quantity      Int
  price         Decimal
  
  order         Order    @relation(fields: [orderId], references: [id])
  product       Product  @relation(fields: [productId], references: [id])
}

model Feedback {
  id            String   @id @default(cuid())
  userId        String
  type          FeedbackType // SUPPORT, FEEDBACK, BUG
  subject       String
  message       String
  status        FeedbackStatus
  createdAt     DateTime @default(now())
  
  user          User     @relation(fields: [userId], references: [id])
}

enum EnrollmentStatus {
  PENDING
  CONFIRMED
  CANCELLED
}

enum MaterialType {
  VIDEO
  PDF
  LINK
}

enum ProductCategory {
  TEXTBOOK
  WORKBOOK
  MERCHANDISE
}

enum OrderStatus {
  PENDING
  PAID
  SHIPPED
  DELIVERED
  CANCELLED
}

enum FeedbackType {
  SUPPORT
  FEEDBACK
  BUG
}

enum FeedbackStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
}
```

### API Endpoints (Next.js API Routes)
```typescript
// ALL endpoints in /app/api/

/api/auth/
  POST   /register     # Create account
  POST   /login        # Cognito login
  POST   /logout       # Clear session
  GET    /me           # Current user

/api/courses/
  GET    /             # List courses
  GET    /[id]         # Course details
  POST   /[id]/enroll  # Enroll in course

/api/materials/
  GET    /[courseId]   # List materials for course
  GET    /download/[id] # Get S3 signed URL

/api/shop/
  GET    /products     # List products
  POST   /cart         # Add to cart
  POST   /checkout     # Create Stripe session

/api/calendar/
  GET    /events       # User's calendar events
  POST   /reminder     # Set reminder

/api/feedback/
  POST   /             # Submit feedback
  GET    /[id]         # Get feedback status
```

---

## 📋 AGENT: AUTH SPECIALIST

### Implementation: AWS Cognito with Amplify
```typescript
// /lib/auth.ts - EXACT implementation
import { Amplify } from 'aws-amplify';
import { signUp, signIn, signOut, getCurrentUser } from 'aws-amplify/auth';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID,
      userPoolClientId: process.env.NEXT_PUBLIC_CLIENT_ID,
    }
  }
});

export async function register(email: string, password: string, firstName: string, lastName: string) {
  const { userId } = await signUp({
    username: email,
    password,
    options: {
      userAttributes: {
        email,
        given_name: firstName,
        family_name: lastName
      }
    }
  });
  
  // Create user in database
  await fetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ cognitoId: userId, email, firstName, lastName })
  });
  
  return userId;
}

export async function login(email: string, password: string) {
  const { isSignedIn } = await signIn({ username: email, password });
  return isSignedIn;
}

export async function logout() {
  await signOut();
}
```

### GDPR Compliance Checklist
- [ ] Explicit consent checkbox on registration
- [ ] Data processing agreement text
- [ ] Right to deletion endpoint
- [ ] Data export endpoint
- [ ] Cookie consent banner
- [ ] Privacy policy page
- [ ] Encrypted PII in database

---

## 📋 AGENT: PAYMENT SPECIALIST

### Stripe Integration (Simple Checkout)
```typescript
// /app/api/shop/checkout/route.ts
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request: Request) {
  const { items, userId } = await request.json();
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
        },
        unit_amount: item.price * 100,
      },
      quantity: item.quantity,
    })),
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/shop?cancelled=true`,
    metadata: { userId }
  });
  
  return Response.json({ sessionId: session.id });
}
```

### Products to Support
1. Course enrollment (one-time payment)
2. Physical textbooks (shipping required)
3. Workbooks (downloadable + physical)
4. Merchandise (t-shirts, etc.)

---

## 📋 AGENT: 3D SPECIALIST

### Constraints
- **ONLY** on landing page hero section
- **MAXIMUM** 2MB for all 3D assets
- **MUST** have 2D fallback for mobile
- **USE** React Three Fiber + Drei only

### Implementation
```tsx
// /components/Hero3D.tsx - COMPLETE IMPLEMENTATION
'use client';

import { Canvas } from '@react-three/fiber';
import { Float, Text, OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';

function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
        <Text
          font="/fonts/inter-bold.woff"
          fontSize={1}
          color="#8b5cf6"
          anchorX="center"
          anchorY="middle"
        >
          DPNR
        </Text>
      </Float>
      <OrbitControls enableZoom={false} />
    </>
  );
}

export function Hero3D() {
  return (
    <div className="h-screen w-full">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}
```

---

## 📋 AGENT: TESTING ENGINEER

### Testing Requirements
```typescript
// Minimum viable tests only

// 1. Auth flow test
test('user can register and login', async () => {
  // Register
  // Verify email
  // Login
  // Check session
});

// 2. Payment flow test
test('user can purchase course', async () => {
  // Add to cart
  // Checkout
  // Verify enrollment
});

// 3. Material access test
test('enrolled user can download materials', async () => {
  // Login
  // Access material
  // Get download URL
});
```

---

## 📋 AGENT: DEPLOYMENT ENGINEER

### Infrastructure (Terraform)
```hcl
# /infrastructure/terraform/main.tf

resource "aws_rds_cluster" "postgres" {
  cluster_identifier = "dpnr-course-db"
  engine            = "aurora-postgresql"
  engine_version    = "15.3"
  database_name     = "dpnr"
  master_username   = var.db_username
  master_password   = var.db_password
  
  serverlessv2_scaling_configuration {
    max_capacity = 1
    min_capacity = 0.5
  }
}

resource "aws_s3_bucket" "materials" {
  bucket = "dpnr-course-materials"
  
  tags = {
    Environment = "production"
  }
}

resource "aws_cognito_user_pool" "main" {
  name = "dpnr-course-users"
  
  password_policy {
    minimum_length = 8
  }
  
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
}
```

### Deployment Steps
1. `npm run build`
2. Deploy to Vercel (simplest)
3. Set environment variables
4. Run database migrations
5. Test all endpoints

---

## 🚀 IMPLEMENTATION PHASES

### Phase 1: Foundation (Days 1-3)
```markdown
- [ ] Initialize Next.js project
- [ ] Set up Prisma with PostgreSQL
- [ ] Configure Tailwind CSS
- [ ] Create basic page structure
- [ ] Set up environment variables
```

### Phase 2: Authentication (Days 4-5)
```markdown
- [ ] Configure AWS Cognito
- [ ] Implement registration flow
- [ ] Implement login/logout
- [ ] Add session management
- [ ] Create protected routes
```

### Phase 3: Core Features (Days 6-10)
```markdown
- [ ] YouTube video embedding
- [ ] Video library page
- [ ] Course information page
- [ ] Materials download system
- [ ] Calendar integration
```

### Phase 4: E-commerce (Days 11-13)
```markdown
- [ ] Stripe integration
- [ ] Product catalog
- [ ] Shopping cart
- [ ] Checkout flow
- [ ] Order management
```

### Phase 5: 3D & Polish (Days 14-15)
```markdown
- [ ] Landing page 3D hero
- [ ] Feedback forms
- [ ] GDPR compliance features
- [ ] Testing
- [ ] Deployment
```

---

## 🔒 CRITICAL CONSTRAINTS

### MUST HAVE
1. Working authentication
2. Video content delivery
3. Payment processing
4. GDPR compliance
5. Mobile responsive

### MUST NOT HAVE
1. Complex animations beyond hero
2. Real-time features (chat, etc.)
3. Advanced analytics
4. Social features
5. Multi-language support

### Technology Constraints
- **NO** microservices (use Next.js API routes)
- **NO** GraphQL (use REST)
- **NO** complex state management (use Zustand)
- **NO** custom CSS (use Tailwind only)
- **NO** experimental features

---

## 📝 TASK TRACKING TEMPLATE

```markdown
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
- [ ] Create registration page
- [ ] Create login page
- [ ] Implement session management
- [ ] Add protected route middleware
- [ ] Test auth flow end-to-end

## Phase 3: Core Features 📚
- [ ] Create landing page
- [ ] Add YouTube embed component
- [ ] Build video library page
- [ ] Create course info page
- [ ] Implement materials download
- [ ] Add calendar component
- [ ] Create user dashboard

## Phase 4: E-commerce 💳
- [ ] Set up Stripe account
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
```

---

## 🎯 CODING INSTRUCTIONS FOR AI AGENTS

### Starting a New Session
```markdown
1. ALWAYS read this entire PRD first
2. Check /tasks/todo.md for current status
3. Identify your role from the agents list
4. Execute ONLY the current task
5. Test your implementation
6. Update todo.md
7. Commit with descriptive message
```

### Example Task Execution
```markdown
AGENT: Frontend Developer
TASK: Create landing page

STEPS:
1. Read landing page requirements from PRD
2. Create /app/page.tsx
3. Add Hero3D component EXACTLY as specified
4. Add content sections with Tailwind
5. Test responsive design
6. Update todo.md: "- [x] Create landing page"
7. Commit: "feat: Add landing page with 3D hero"
```

### Preventing Hallucination
- **NEVER** add features not in PRD
- **NEVER** change the tech stack
- **ALWAYS** use provided code examples
- **ALWAYS** test before marking complete
- **NEVER** skip updating todo.md

---

## 🔄 CONTEXT RESTORATION PROTOCOL

When starting a new session with zero context:

```markdown
1. Open this PRD document
2. Read your assigned agent role
3. Check /tasks/todo.md for progress
4. Review last 3 git commits
5. Continue from last incomplete task
```

---

## 📊 SUCCESS METRICS

### Minimum Viable Product
- [ ] Users can register and login
- [ ] Users can view course information
- [ ] Users can watch videos
- [ ] Users can purchase courses
- [ ] Users can download materials
- [ ] Data exports to CSV for migration

### Quality Standards
- [ ] Mobile responsive (tested on iPhone/Android)
- [ ] Page load under 3 seconds
- [ ] Zero console errors
- [ ] All forms validate input
- [ ] Error messages user-friendly

---

## 🚨 EMERGENCY PROCEDURES

### If Build Fails
```bash
# Reset and start clean
rm -rf node_modules
rm package-lock.json
npm install
npm run dev
```

### If Database Issues
```bash
# Reset database
npx prisma migrate reset
npx prisma migrate dev
npx prisma generate
```

### If Auth Not Working
1. Verify Cognito pool exists
2. Check environment variables
3. Test with AWS CLI
4. Review Amplify configuration

---

## END OF PRD

This document contains ALL specifications needed to build the DPNR Course Platform. No additional features should be added. When in doubt, choose the simpler solution.