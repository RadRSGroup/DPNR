# DPNR Course Registration Platform - Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the DPNR Course Registration Platform to production. The system is designed for deployment on:

- **Frontend**: Vercel (recommended) or static hosting
- **Backend**: Railway, AWS Lambda, or similar Node.js hosting
- **Database**: Supabase PostgreSQL (currently configured)
- **Authentication**: AWS Cognito
- **Payments**: Tranzila (Israeli payment gateway)

## Prerequisites

### Required Tools
- Node.js 18.x or higher
- npm or yarn package manager
- Git
- PostgreSQL client (for local database operations)
- AWS CLI (if using AWS services)
- Vercel CLI (optional, for frontend deployment)
- Railway CLI (optional, for backend deployment)

### Required Accounts
- Vercel account (frontend deployment)
- Railway/AWS account (backend deployment)
- Supabase account (database)
- AWS account (Cognito authentication)
- Tranzila account (payment processing)
- Domain registrar (for custom domain)

## Quick Deployment Checklist

### 1. Environment Configuration ✅

#### Frontend Environment (`.env.production`)
```bash
# Copy and configure
cp frontend/.env.production.example frontend/.env.production
```

Required variables:
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_COGNITO_USER_POOL_ID` - AWS Cognito User Pool ID
- `NEXT_PUBLIC_COGNITO_CLIENT_ID` - AWS Cognito Client ID
- `NEXT_PUBLIC_TRANZILA_TERMINAL_ID` - Tranzila Terminal ID

#### Backend Environment (`.env.production`)
```bash
# Copy and configure
cp backend/.env.production.example backend/.env.production
```

Required variables:
- `DATABASE_URL` - Supabase PostgreSQL connection string
- `COGNITO_USER_POOL_ID` - AWS Cognito User Pool ID
- `COGNITO_CLIENT_ID` - AWS Cognito Client ID
- `TRANZILA_TERMINAL` - Tranzila Terminal ID
- `TRANZILA_API_KEY` - Tranzila API Key
- `JWT_SECRET` - Strong JWT secret (32+ characters)
- `CORS_ORIGIN` - Frontend domain (e.g., https://be-dpnr.com)

### 2. Database Setup ✅

#### Supabase Configuration
1. Create new Supabase project
2. Get connection string from Settings > Database
3. Update `DATABASE_URL` in backend environment
4. Run migrations: `cd backend && npm run db:deploy:prod`

#### Local Testing
```bash
# Test database connection
cd backend
npm run db:health:ci
```

### 3. AWS Cognito Setup ✅

1. Create User Pool in AWS Cognito
2. Configure App Client with:
   - Enable SRP authentication
   - Configure OAuth flows
   - Set callback URLs
3. Update environment variables with User Pool ID and Client ID

### 4. Build Validation ✅

```bash
# Validate frontend build
cd frontend
npm run validate:production
npm run build:export

# Validate backend build
cd ../backend
npm run validate:prod:ci
npm run build
```

### 5. Production Deployment ✅

#### Automated Deployment
```bash
# Use the comprehensive deployment script
./scripts/deploy-production.sh
```

#### Manual Frontend Deployment (Vercel)
```bash
cd frontend
npm run build:export
vercel --prod
```

#### Manual Backend Deployment (Railway)
```bash
cd backend
railway deploy
```

### 6. Post-Deployment Verification ✅

```bash
# Check health endpoints
curl https://be-dpnr.com
curl https://api.be-dpnr.com/v1/health

# Run database health check
cd backend && npm run db:health:ci
```

## Advanced Configuration

### Security Headers

The application includes comprehensive security headers:
- Content Security Policy (CSP)
- HSTS (HTTP Strict Transport Security)
- X-Frame-Options
- X-Content-Type-Options
- Referrer Policy

### Rate Limiting

Configured rate limits:
- General API: 100 requests per 15 minutes
- Authentication: 5 attempts per 15 minutes
- Payment: 10 attempts per hour
- Enrollment: 3 attempts per hour

### Monitoring and Logging

#### Health Check Endpoints
- `/health` - Comprehensive health check
- `/v1/health` - API health with database check
- `/v1/ready` - Readiness check for orchestration
- `/v1/live` - Liveness check for orchestration
- `/v1/metrics` - Application metrics
- `/v1/db-check` - Database connectivity test

#### Error Tracking
- Sentry integration (configure `SENTRY_DSN`)
- Structured logging with file rotation
- Performance monitoring
- Security event logging

### Performance Optimization

#### Frontend Optimizations
- Next.js automatic code splitting
- Image optimization with WebP/AVIF
- Bundle analysis with webpack-bundle-analyzer
- Compression and caching headers
- Critical CSS optimization

#### Backend Optimizations
- Gzip compression in production
- Connection pooling with Prisma
- Query optimization and indexing
- Memory usage monitoring
- Graceful shutdown handling

## Deployment Scripts

### Main Deployment Script
`./scripts/deploy-production.sh`

Features:
- Pre-deployment validation
- Comprehensive testing
- Database migrations
- Health checks
- Rollback information

Options:
```bash
./scripts/deploy-production.sh --dry-run      # Validate only
./scripts/deploy-production.sh --frontend-only # Frontend only
./scripts/deploy-production.sh --backend-only  # Backend only
```

### Database Migration Script
`./scripts/migrate-production.sh`

Features:
- Automatic backup creation
- Migration validation
- Rollback capability
- Post-migration verification

Options:
```bash
./scripts/migrate-production.sh --dry-run      # Validate migrations
./scripts/migrate-production.sh --backup-only  # Create backup only
./scripts/migrate-production.sh --rollback     # Rollback to backup
```

## CI/CD Pipeline

### GitHub Actions Workflow

Location: `.github/workflows/deploy-production.yml`

Triggered by:
- Push to `main` branch
- Manual workflow dispatch

Stages:
1. Security and code quality checks
2. Comprehensive test suite
3. Application builds
4. Database migrations
5. Frontend deployment to Vercel
6. Backend deployment to Railway
7. Health checks and validation
8. Deployment notifications

### Required Secrets

Configure in GitHub repository settings:
```
DATABASE_URL
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
RAILWAY_TOKEN
RAILWAY_SERVICE_ID
```

## Environment-Specific Configuration

### Development
- Local PostgreSQL database
- Hot reloading enabled
- Debug logging
- Mock payment processing

### Staging
- Staging database
- Production-like configuration
- Limited rate limiting
- Test payment gateway

### Production
- Production database with backups
- Enhanced security headers
- Strict rate limiting
- Real payment processing
- Error tracking and monitoring

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database connectivity
cd backend
npm run db:health:ci

# Verify connection string format
echo $DATABASE_URL
```

#### Build Failures
```bash
# Clear cache and rebuild
cd frontend
npm run clean
npm ci
npm run build

# Check TypeScript errors
npm run type-check
```

#### Authentication Issues
- Verify Cognito User Pool configuration
- Check CORS origins in both Cognito and backend
- Validate JWT secrets and expiry times

#### Payment Processing Issues
- Verify Tranzila credentials
- Check webhook URL accessibility
- Validate SSL certificate for webhook endpoints

### Health Check Commands

```bash
# Frontend health
curl -f https://be-dpnr.com

# API health
curl -f https://api.be-dpnr.com/v1/health | jq

# Database health
curl -f https://api.be-dpnr.com/v1/db-check | jq

# Application metrics
curl -f https://api.be-dpnr.com/v1/metrics | jq
```

### Log Analysis

```bash
# Backend logs (if using file logging)
tail -f backend/logs/app.log

# Application metrics
curl https://api.be-dpnr.com/v1/metrics

# Database connection status
cd backend && npm run db:health:json
```

## Monitoring and Maintenance

### Regular Maintenance Tasks

1. **Weekly**:
   - Review application logs
   - Check database performance
   - Verify backup integrity
   - Update dependencies (security patches)

2. **Monthly**:
   - Database maintenance and optimization
   - Performance analysis
   - Security audit
   - Dependency updates

3. **Quarterly**:
   - Disaster recovery testing
   - Comprehensive security review
   - Performance optimization
   - Infrastructure review

### Monitoring Dashboards

- **Vercel Analytics**: Frontend performance and usage
- **Railway Metrics**: Backend resource usage
- **Supabase Dashboard**: Database performance
- **Sentry**: Error tracking and performance
- **AWS CloudWatch**: Cognito authentication metrics

### Alerting

Configure alerts for:
- API response time > 5 seconds
- Error rate > 1%
- Database connection failures
- Memory usage > 80%
- Disk space < 20%
- Payment processing failures

## Rollback Procedures

### Application Rollback
```bash
# Get last successful deployment info
cat .last-production-deploy

# Rollback to previous commit
git checkout <commit-sha>
./scripts/deploy-production.sh
```

### Database Rollback
```bash
# Rollback to last backup
./scripts/migrate-production.sh --rollback

# Or manual rollback
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql $DATABASE_URL < backups/dpnr_prod_backup_TIMESTAMP.sql
```

## Security Considerations

### Data Protection
- All data encrypted in transit (HTTPS/TLS)
- Database encryption at rest (Supabase)
- Secure password hashing (bcrypt)
- JWT token security with rotation
- Input validation and sanitization

### GDPR Compliance
- User consent management
- Data export functionality
- Account deletion with data removal
- Data retention policies (configurable)
- Privacy policy and terms of service

### Access Control
- Role-based access control (RBAC)
- API rate limiting
- CORS policy enforcement
- IP whitelisting for admin functions
- Security headers implementation

## Support and Contact Information

- **Development Team**: dev@be-dpnr.com
- **DevOps Team**: devops@be-dpnr.com
- **Emergency Contact**: +972-XX-XXX-XXXX
- **Documentation**: This file and inline code comments
- **Issue Tracking**: GitHub Issues

---

**Document Version**: 1.0  
**Last Updated**: December 2024  
**Next Review**: March 2025  
**Maintained By**: DevOps Team