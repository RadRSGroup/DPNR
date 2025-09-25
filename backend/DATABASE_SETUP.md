# DPNR Database Setup Guide

## Overview
The DPNR Course Registration Platform uses PostgreSQL with Prisma ORM for database management. This guide covers setup, migration, and maintenance procedures.

## Database Schema

### Core Models

#### User
- **Purpose**: Manages student, admin, and instructor accounts
- **Key Features**:
  - Cognito integration for authentication
  - Bilingual support (Hebrew/English)
  - Role-based access control
  - GDPR compliance with soft delete

#### Cohort
- **Purpose**: Represents course offerings/groups
- **Key Features**:
  - Capacity management (max 20 students)
  - Status tracking (upcoming, open, full, in-progress, completed)
  - Flexible scheduling and location

#### Enrollment
- **Purpose**: Links users to cohorts with payment tracking
- **Key Features**:
  - Multiple payment plans (full, 5-installment, 12-installment)
  - Questionnaire data storage (JSON)
  - Status tracking throughout enrollment lifecycle

#### PaymentTransaction
- **Purpose**: Tracks individual payment transactions
- **Key Features**:
  - Tranzila payment gateway integration
  - Installment tracking
  - Comprehensive failure handling

#### ConsultationRequest
- **Purpose**: Manages consultation inquiries
- **Key Features**:
  - Lead capture and management
  - Preferred time slot tracking
  - Status workflow management

#### PrivacyConsent
- **Purpose**: GDPR compliance and consent management
- **Key Features**:
  - Granular consent types
  - Audit trail with IP and user agent
  - Version tracking for policy changes

## Quick Setup

### Prerequisites
```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Or using Docker
docker run --name dpnr-postgres -e POSTGRES_PASSWORD=password -d -p 5432:5432 postgres
```

### Database Initialization
```bash
# 1. Create database
createdb dpnr_dev

# 2. Configure environment
cp .env.example .env
# Edit DATABASE_URL in .env

# 3. Setup database
npm run db:setup

# 4. Seed with sample data
npm run db:seed
```

## Database Scripts

### Setup & Migration
```bash
npm run db:setup          # Complete database setup
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Run pending migrations
npm run prisma:studio      # Open database browser
```

### Data Management
```bash
npm run db:seed           # Add sample data
npm run db:reset          # Reset and reseed database
```

### Development
```bash
npm run prisma:migrate    # Create and apply new migration
npm run prisma:deploy     # Deploy migrations (production)
```

## Environment Configuration

### Required Variables
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/dpnr_dev"

# Application
NODE_ENV=development
PORT=3001

# AWS Cognito (for authentication)
AWS_COGNITO_USER_POOL_ID=your-user-pool-id
AWS_COGNITO_CLIENT_ID=your-client-id

# Tranzila Payment Gateway
TRANZILA_TERMINAL=your-terminal-id
TRANZILA_API_KEY=your-api-key
TRANZILA_MODE=test
```

## Schema Highlights

### Payment Plans
- **FULL**: ₪6,400 (single payment)
- **FIVE_INSTALLMENTS**: ₪6,800 (₪1,360 × 5)
- **TWELVE_INSTALLMENTS**: ₪6,960 (₪580 × 12)

### User Roles
- **STUDENT**: Course participants
- **INSTRUCTOR**: Course facilitators
- **ADMIN**: System administrators

### Enrollment Statuses
- **PENDING_PAYMENT**: Awaiting payment completion
- **ACTIVE**: Enrolled and participating
- **COMPLETED**: Successfully finished course
- **CANCELLED**: Enrollment cancelled
- **REFUNDED**: Payment refunded

### GDPR Compliance Features
- **Soft Delete**: Users marked as deleted but data retained
- **Consent Tracking**: Granular consent management
- **Data Export**: Full user data export capability
- **Right to Erasure**: Permanent data deletion after retention period

## Production Considerations

### Performance Optimization
- Database indexes on frequently queried fields
- Connection pooling via Prisma
- Query optimization with proper relations

### Security
- Row-level security for multi-tenant data
- Encrypted sensitive fields
- Audit logging for all modifications

### Backup Strategy
- Automated daily backups
- Point-in-time recovery capability
- Offsite backup replication

### Monitoring
- Query performance tracking
- Connection pool monitoring
- Error rate alerting

## Troubleshooting

### Common Issues

#### Connection Refused
```bash
# Check PostgreSQL status
brew services list | grep postgresql

# Start if not running
brew services start postgresql
```

#### Migration Failures
```bash
# Reset migrations (development only)
npx prisma migrate reset

# Force push schema (if no data loss)
npx prisma db push --force-reset
```

#### Permission Errors
```sql
-- Connect as superuser and grant permissions
GRANT ALL PRIVILEGES ON DATABASE dpnr_dev TO username;
GRANT ALL ON SCHEMA public TO username;
```

### Health Checks
```bash
# Test database connection
npm run type-check

# Verify schema sync
npx prisma migrate status

# Check data integrity
npx prisma studio
```

## Development Workflow

### Adding New Models
1. Update `prisma/schema.prisma`
2. Run `npm run prisma:migrate`
3. Create model class in `src/models/`
4. Add service layer in `src/services/`
5. Create API routes in `src/api/`
6. Add tests in `tests/`

### Schema Changes
1. Modify schema file
2. Create migration: `npx prisma migrate dev --name description`
3. Update seed data if needed
4. Test locally before deploying

### Data Migrations
1. Create TypeScript migration script
2. Add to package.json scripts
3. Test with sample data
4. Document breaking changes

## Support

For database-related issues:
1. Check this documentation
2. Review Prisma logs in console
3. Use `npx prisma studio` for data inspection
4. Contact the development team

---
*Database schema version: 1.0 | Last updated: 2025-09-22*