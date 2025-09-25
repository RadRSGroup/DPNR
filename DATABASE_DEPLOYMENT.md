# Database Deployment Guide - DPNR Course Registration Platform

This guide provides step-by-step instructions for deploying the DPNR database infrastructure to production.

## 🎯 Overview

The DPNR database infrastructure supports:
- **High Availability**: 99.99% uptime target
- **GDPR Compliance**: Built-in data retention and privacy controls
- **Payment Processing**: Secure transaction management with Tranzila
- **Multi-language**: Hebrew and English support
- **Scalability**: Designed to handle growth

## 🏗️ Database Schema

### Core Tables
- **users**: User management with Cognito integration
- **cohorts**: Course cohorts with capacity management
- **enrollments**: Student enrollments with payment tracking
- **payment_transactions**: Tranzila payment processing
- **consultation_requests**: Pre-enrollment consultations
- **privacy_consents**: GDPR compliance tracking

## 🚀 Production Deployment Options

### Option A: Vercel Postgres (Recommended)
**Best for**: Vercel frontend deployment, simple setup

```bash
# 1. Create Vercel Postgres database
npx vercel link
npx vercel env add DATABASE_URL

# 2. Get connection string from Vercel dashboard
# Format: postgres://default:PASSWORD@HOST.postgres.vercel-storage.com:5432/verceldb
```

**Pros**: Seamless Vercel integration, automatic backups, easy scaling
**Cons**: Vercel vendor lock-in, pricing at scale

### Option B: Supabase (Feature-Rich)
**Best for**: Need additional features like real-time subscriptions

```bash
# 1. Create Supabase project: https://supabase.com
# 2. Get connection string from Settings > Database
# Format: postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres
```

**Pros**: Rich features, good free tier, PostgreSQL extensions
**Cons**: Learning curve for additional features

### Option C: Railway (Simple & Affordable)
**Best for**: Budget-conscious deployments

```bash
# 1. Create Railway project: https://railway.app
# 2. Add PostgreSQL service
# 3. Get DATABASE_URL from variables tab
```

**Pros**: Simple pricing, good performance, easy setup
**Cons**: Smaller ecosystem, fewer enterprise features

### Option D: AWS RDS (Enterprise-Grade)
**Best for**: Enterprise deployments, existing AWS infrastructure

```bash
# 1. Create RDS PostgreSQL instance
# 2. Configure security groups
# 3. Set up automated backups
# Format: postgresql://username:password@endpoint:5432/database
```

**Pros**: Enterprise features, fine-grained control, AWS integration
**Cons**: Complex setup, higher costs, requires AWS expertise

### Option E: Digital Ocean Managed Database
**Best for**: Balance of features and simplicity

```bash
# 1. Create DO Managed PostgreSQL cluster
# 2. Configure firewall rules
# 3. Enable automated backups
```

**Pros**: Good balance of features/price, reliable performance
**Cons**: Limited global regions

## 🔧 Local Development Setup

### Using Docker (Recommended)

```bash
# 1. Start local database
docker-compose up -d postgres

# 2. Set up environment
cp backend/.env.example backend/.env
# Edit DATABASE_URL: postgresql://dpnr_user:dpnr_password@localhost:5432/dpnr_dev

# 3. Set up database
cd backend
npm run db:setup

# 4. Seed with test data
npm run db:seed

# 5. Start development
npm run dev
```

### Manual PostgreSQL Setup

```bash
# 1. Install PostgreSQL locally
brew install postgresql  # macOS
sudo apt install postgresql  # Ubuntu

# 2. Create database and user
createdb dpnr_dev
createuser -P dpnr_user  # Enter password when prompted

# 3. Grant permissions
psql -d dpnr_dev -c "GRANT ALL PRIVILEGES ON DATABASE dpnr_dev TO dpnr_user;"

# 4. Continue with setup
cd backend
npm run db:setup
```

## 🚀 Production Deployment Process

### 1. Environment Configuration

Create production environment file:

```bash
# Copy template
cp .env.production.example .env.production

# Fill in production values:
# - DATABASE_URL (from your chosen provider)
# - AWS_COGNITO_* (production Cognito pool)
# - TRANZILA_* (production payment credentials)
# - JWT_SECRET (strong production secret)
# - SMTP settings for production emails
```

### 2. Database Provider Setup

**For Vercel Postgres:**
```bash
# Create database
vercel postgres create dpnr-prod

# Get connection string
vercel env add DATABASE_URL --scope production
```

**For Supabase:**
```bash
# 1. Create project at https://supabase.com
# 2. Go to Settings > Database
# 3. Copy connection string
# 4. Add to production environment
```

**For Railway:**
```bash
# 1. Create project and PostgreSQL service
# 2. Copy DATABASE_URL from variables
# 3. Add to production environment
```

### 3. Deploy Database Schema

```bash
cd backend

# Test deployment (dry run)
npm run db:deploy:dry-run

# Deploy to staging
npm run db:deploy:staging

# Deploy to production (no seed data)
npm run db:deploy:prod

# Manual deployment with options
npm run db:deploy production --skip-seed
```

### 4. Verify Deployment

```bash
# Check connection
npx prisma db pull

# View data
npx prisma studio

# Run health check
npm run test:integration
```

## 🔐 Security Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# Security
JWT_SECRET="at-least-32-character-secret"
JWT_REFRESH_SECRET="different-32-character-secret"
WEBHOOK_SECRET="webhook-verification-secret"

# AWS Cognito (Production)
AWS_COGNITO_USER_POOL_ID="eu-west-1_XXXXXXXX"
AWS_COGNITO_CLIENT_ID="your-client-id"
AWS_COGNITO_CLIENT_SECRET="your-client-secret"

# Tranzila (Production)
TRANZILA_TERMINAL="your-production-terminal"
TRANZILA_API_KEY="your-production-api-key"
TRANZILA_MODE="production"
```

### SSL/TLS Configuration

Ensure your database connection uses SSL:

```bash
# Add to DATABASE_URL for production
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
```

## 📊 Monitoring & Maintenance

### Health Checks

```bash
# Database connection test
npm run db:health

# Migration status
npx prisma migrate status

# Performance check
npm run test:performance
```

### Backup Strategy

**Automated Backups:**
- Most managed services provide automatic backups
- Verify backup retention policies (90+ days recommended)
- Test backup restoration quarterly

**Manual Backup:**
```bash
# Create backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore backup
psql $DATABASE_URL < backup-20241201.sql
```

### Scaling Considerations

**Read Replicas:**
```bash
# For high-traffic scenarios, consider read replicas
# Supabase: Available in Pro plan
# AWS RDS: Configure read replicas
# Vercel: Auto-scaling included
```

**Connection Pooling:**
```bash
# Already configured in Prisma
# Monitor connection count in production
# Consider external pooling (PgBouncer) for high traffic
```

## 🚨 Troubleshooting

### Common Issues

**Connection Refused:**
```bash
# Check database server status
# Verify DATABASE_URL format
# Check firewall rules
# Confirm database exists
```

**Migration Failures:**
```bash
# Check schema syntax
npx prisma validate

# Reset and retry (development only)
npx prisma migrate reset

# Force push schema (last resort)
npx prisma db push --force-reset
```

**Performance Issues:**
```bash
# Analyze slow queries
# Check indexes
# Monitor connection count
# Review database metrics
```

### Support Resources

- **Database Issues**: Check provider documentation
- **Prisma Issues**: https://www.prisma.io/docs
- **Payment Issues**: Tranzila support
- **AWS Issues**: AWS support documentation

## 📈 Performance Targets

### Production SLAs
- **Uptime**: 99.99% (4.38 minutes downtime/month)
- **Query Response**: < 100ms average
- **Connection Time**: < 5 seconds
- **Backup Recovery**: < 1 hour RTO, < 5 minutes RPO

### Monitoring Metrics
- Database connections
- Query execution time
- Error rates
- Storage usage
- Backup success rate

## 🔄 Migration Management

### Development Workflow
1. Make schema changes in `schema.prisma`
2. Create migration: `npx prisma migrate dev`
3. Test locally
4. Deploy to staging: `npm run db:deploy:staging`
5. Test staging
6. Deploy to production: `npm run db:deploy:prod`

### Zero-Downtime Deployments
1. Use backward-compatible schema changes
2. Deploy schema first, then application
3. Use feature flags for breaking changes
4. Monitor during deployment

---

## 🎯 Quick Start Commands

```bash
# Local development
docker-compose up -d postgres
npm run db:setup
npm run db:seed
npm run dev

# Staging deployment
npm run db:deploy:staging

# Production deployment
npm run db:deploy:prod

# Health check
npm run test:integration
```

## 📞 Support

For deployment assistance:
- Check logs: `npm run logs`
- Run diagnostics: `npm run db:health`
- Contact: DPNR Development Team

---

*Last updated: 2024-09-22 | Version: 1.0*