# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DPNR Course Platform - An AI-first course platform built as a Next.js monorepo with AWS Cognito authentication, Prisma/PostgreSQL database, and Three.js 3D visualization.

## Essential Commands

### Development
```bash
# Start development server (from root)
cd dpnr-course-platform
npm run dev              # Runs Next.js on port 3000

# Start all services with Docker
docker compose up --build  # Web (3000), Admin (3001), PostgreSQL (5432)
```

### Build & Production
```bash
npm run build           # Build both web and admin apps
npm run start           # Start production server
```

### Database
```bash
# From packages/database directory
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run database migrations
```

### Code Quality
```bash
npm run lint            # Run Next.js linter
```

## Architecture Overview

### Monorepo Structure
- **apps/web**: Main Next.js 15 application with App Router
- **apps/admin**: Admin interface (separate Next.js app)
- **packages/database**: Prisma schema and database client
- **packages/types**: Shared TypeScript types
- **packages/ui**: Shared UI components

### Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **3D Graphics**: Three.js, React Three Fiber, Drei, Post-processing
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: AWS Cognito + Iron Session for server-side sessions
- **UI Components**: Radix UI primitives with Tailwind styling

### Key Patterns

#### Authentication Flow
1. AWS Cognito handles user identity (signup, login, MFA)
2. JWT tokens verified server-side with `aws-jwt-verify`
3. Iron Session manages encrypted cookies for server-side sessions
4. Protected routes check session in middleware

#### Database Models (Prisma)
- User (linked to Cognito ID)
- Course, Module, Material (content structure)
- Enrollment, Progress (learning tracking)
- Product, Order (e-commerce)
- All models include createdAt/updatedAt timestamps

#### 3D Implementation
- Components in `components/3d/` directory
- Adaptive quality based on device performance
- Target: 30 FPS mobile, 60 FPS desktop
- Asset loading from AWS S3 (configured in environment)

### Environment Variables
Required variables are documented in `.env.local.example`:
- AWS Cognito configuration (region, pool ID, client ID)
- Database URL (PostgreSQL connection string)
- Session secret for Iron Session
- AWS S3 configuration for assets

### Development Guidelines

#### AI-First Development
- Each session starts with zero context assumption
- Document decisions in `.cursor/scratchpad.md`
- Update `tasks/todo.md` when completing tasks

#### Code Conventions
- Use existing patterns from neighboring files
- Prefer server components where possible
- Client components only when necessary (useState, useEffect, browser APIs)
- All database operations through Prisma client

#### Testing Approach
- No test framework currently configured
- Manual testing via development server
- Database testing with Prisma Studio: `npx prisma studio`

### Common Tasks

#### Adding a New Page
1. Create file in `app/[route]/page.tsx`
2. Use existing layout patterns from other pages
3. Import shared components from `components/`

#### Database Changes
1. Modify schema in `packages/database/prisma/schema.prisma`
2. Run `npm run prisma:migrate` to create migration
3. Run `npm run prisma:generate` to update client

#### Adding 3D Components
1. Create component in `components/3d/`
2. Use dynamic imports with `ssr: false` for Three.js components
3. Follow existing patterns in Hero3D.tsx for setup

### Current Project State
- Authentication system implemented but needs completion
- Basic routing and layouts configured
- 3D framework integrated and working
- Database schema complete with 8 models
- Docker setup ready for local development

Refer to `.cursor/scratchpad.md` for detailed project context and `tasks/todo.md` for current priorities.