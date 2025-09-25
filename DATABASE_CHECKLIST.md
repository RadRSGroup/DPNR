# Database Deployment Checklist - DPNR Platform

Use this checklist to ensure proper database setup and deployment.

## 🎯 Pre-Deployment Setup

### Local Development
- [ ] **PostgreSQL Running**
  ```bash
  docker-compose up -d postgres
  # OR install locally: brew install postgresql
  ```

- [ ] **Environment Configuration**
  ```bash
  cp backend/.env.example backend/.env
  # Edit DATABASE_URL for local setup
  ```

- [ ] **Database Setup**
  ```bash
  cd backend
  npm install
  npm run db:setup
  npm run db:seed
  ```

- [ ] **Verify Local Setup**
  ```bash
  npm run db:health
  npm run prisma:studio  # Open in browser
  ```

## 🚀 Production Deployment

### 1. Database Provider Selection
Choose ONE option:

- [ ] **Option A: Vercel Postgres** (Recommended for Vercel deployment)
  - Create Vercel Postgres database
  - Copy connection string
  - Add to environment variables

- [ ] **Option B: Supabase** (Feature-rich)
  - Create Supabase project
  - Get PostgreSQL connection string
  - Configure firewall rules

- [ ] **Option C: Railway** (Simple & affordable)
  - Create Railway project
  - Add PostgreSQL service
  - Copy DATABASE_URL

- [ ] **Option D: AWS RDS** (Enterprise)
  - Create RDS PostgreSQL instance
  - Configure security groups
  - Set up automated backups

### 2. Environment Configuration
- [ ] **Production Environment File**
  ```bash
  cp .env.production.example .env.production
  ```

- [ ] **Required Variables Set**
  - [ ] `DATABASE_URL` (from chosen provider)
  - [ ] `JWT_SECRET` (32+ character string)
  - [ ] `JWT_REFRESH_SECRET` (different from JWT_SECRET)
  - [ ] `WEBHOOK_SECRET` (for Tranzila)
  - [ ] `AWS_COGNITO_USER_POOL_ID`
  - [ ] `AWS_COGNITO_CLIENT_ID`
  - [ ] `AWS_COGNITO_CLIENT_SECRET`
  - [ ] `TRANZILA_TERMINAL` (production)
  - [ ] `TRANZILA_API_KEY` (production)
  - [ ] `TRANZILA_MODE=production`
  - [ ] `SMTP_*` variables for email
  - [ ] `CORS_ORIGIN` (production frontend URL)

### 3. Security Configuration
- [ ] **SSL/TLS Enabled**
  ```bash
  # Ensure DATABASE_URL includes: ?sslmode=require
  ```

- [ ] **Firewall Rules**
  - Database only accessible from application servers
  - No direct public access to database

- [ ] **Strong Passwords**
  - Database user password (if applicable)
  - JWT secrets are cryptographically strong

### 4. Database Schema Deployment
- [ ] **Test Deployment (Dry Run)**
  ```bash
  npm run db:deploy:dry-run
  ```

- [ ] **Deploy to Staging**
  ```bash
  npm run db:deploy:staging
  ```

- [ ] **Staging Verification**
  ```bash
  npm run db:health
  npm run test:integration
  ```

- [ ] **Deploy to Production**
  ```bash
  npm run db:deploy:prod
  ```

### 5. Post-Deployment Verification
- [ ] **Health Check**
  ```bash
  npm run db:health
  ```

- [ ] **Connection Test**
  ```bash
  npx prisma db pull  # Should succeed without errors
  ```

- [ ] **Performance Test**
  ```bash
  npm run test:performance
  ```

- [ ] **Data Integrity**
  - [ ] All tables exist
  - [ ] Foreign keys working
  - [ ] Indexes created
  - [ ] No orphaned records

## 🔍 Monitoring Setup

### Performance Monitoring
- [ ] **Query Performance**
  - Monitor slow queries (>1 second)
  - Set up alerts for query timeouts
  - Track connection pool usage

- [ ] **Database Metrics**
  - CPU usage
  - Memory utilization
  - Storage space
  - Connection count

### Health Monitoring
- [ ] **Automated Health Checks**
  ```bash
  # Set up cron job or monitoring service
  npm run db:health:ci  # Exit codes: 0=healthy, 1=unhealthy, 2=degraded
  ```

- [ ] **Alerting Setup**
  - Database connection failures
  - High error rates
  - Performance degradation
  - Storage space warnings

## 💾 Backup & Recovery

### Backup Configuration
- [ ] **Automated Backups**
  - Daily full backups
  - Point-in-time recovery enabled
  - 90+ day retention

- [ ] **Backup Verification**
  ```bash
  # Test backup restore quarterly
  # Verify backup integrity
  ```

- [ ] **Offsite Backup**
  - Cross-region backup copies
  - Disaster recovery plan

### Recovery Testing
- [ ] **Recovery Time Objective (RTO)**
  - Target: < 1 hour
  - Document recovery procedures
  - Test recovery process

- [ ] **Recovery Point Objective (RPO)**
  - Target: < 5 minutes data loss
  - Verify replication lag

## 🔒 Security Compliance

### Access Control
- [ ] **Database Users**
  - Application user with minimal privileges
  - No shared credentials
  - Regular credential rotation

- [ ] **Network Security**
  - VPC/private network setup
  - SSL/TLS encryption
  - IP whitelisting

### Data Protection
- [ ] **Encryption**
  - [ ] Encryption at rest
  - [ ] Encryption in transit
  - [ ] Key management

- [ ] **GDPR Compliance**
  - [ ] Data retention policies
  - [ ] Right to deletion
  - [ ] Data export capabilities
  - [ ] Consent tracking

## 📊 Performance Optimization

### Database Tuning
- [ ] **Connection Pooling**
  - Prisma connection pool configured
  - Monitor connection usage
  - Optimize pool size

- [ ] **Index Optimization**
  - Review query execution plans
  - Add missing indexes
  - Remove unused indexes

- [ ] **Query Performance**
  - Profile slow queries
  - Optimize N+1 queries
  - Use appropriate data types

### Scaling Preparation
- [ ] **Read Replicas**
  - Consider for high traffic
  - Setup read-only queries

- [ ] **Partitioning**
  - Plan for large tables
  - Time-based partitioning for logs

## 🚨 Incident Response

### Monitoring Alerts
- [ ] **Critical Alerts**
  - Database down
  - Connection pool exhausted
  - Disk space critical

- [ ] **Warning Alerts**
  - High query response time
  - Unusual error rates
  - Backup failures

### Response Procedures
- [ ] **Escalation Path**
  - Primary: DevOps team
  - Secondary: Database administrator
  - Emergency: Development team lead

- [ ] **Communication Plan**
  - Status page updates
  - Team notifications
  - Customer communication

## ✅ Go-Live Checklist

### Final Verification
- [ ] **All Tests Passing**
  ```bash
  npm run test:ci
  npm run test:integration
  npm run db:health:ci
  ```

- [ ] **Performance Benchmarks**
  - Query response times < 100ms average
  - Connection establishment < 5 seconds
  - Health check passes consistently

- [ ] **Security Review**
  - No hardcoded secrets
  - Proper access controls
  - Audit logging enabled

### Documentation
- [ ] **Runbooks Created**
  - Database maintenance procedures
  - Incident response playbooks
  - Recovery procedures

- [ ] **Team Training**
  - Access to monitoring dashboards
  - Understanding of alert procedures
  - Recovery process knowledge

### Post-Launch Monitoring
- [ ] **24-Hour Watch**
  - Monitor for issues first 24 hours
  - Performance baseline establishment
  - User feedback collection

- [ ] **Weekly Review**
  - Performance metrics analysis
  - Error rate review
  - Capacity planning updates

---

## 📞 Support Contacts

| Issue Type | Contact | Response Time |
|------------|---------|---------------|
| Critical Database Down | DevOps Team | 15 minutes |
| Performance Issues | Database Admin | 1 hour |
| Schema Changes | Development Lead | 4 hours |
| General Questions | Team Slack | 8 hours |

---

## 🔄 Regular Maintenance

### Daily
- [ ] Monitor dashboard review
- [ ] Backup verification
- [ ] Alert status check

### Weekly
- [ ] Performance analysis
- [ ] Capacity review
- [ ] Security updates

### Monthly
- [ ] Full backup test
- [ ] Disaster recovery test
- [ ] Performance tuning review

### Quarterly
- [ ] Security audit
- [ ] Backup restore test
- [ ] Scaling assessment
- [ ] Documentation update

---

*Checklist Version: 1.0 | Last Updated: 2024-09-22*