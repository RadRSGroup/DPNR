# DPNR Production Deployment Checklist

**Pre-Deployment Date**: September 25, 2025
**Deployment Target**: be-dpnr.com
**Expected Downtime**: 0 minutes (zero-downtime deployment)

---

## Pre-Deployment Checklist

### 🔴 Critical - Must Complete Before Deployment

- [ ] **Environment Variables Configuration**
  - [ ] Replace all template values in `/backend/.env.production`
  - [ ] Replace all template values in `/frontend/.env.production`
  - [ ] Verify DATABASE_URL with actual Supabase credentials
  - [ ] Configure AWS Cognito User Pool ID and Client ID
  - [ ] Set Tranzila production terminal ID and API key
  - [ ] Configure AWS SES SMTP credentials

- [ ] **Service Account Setup**
  - [ ] Create Supabase project and database
  - [ ] Configure AWS Cognito User Pool (il-central-1 region)
  - [ ] Set up Tranzila payment gateway account
  - [ ] Configure AWS SES for email delivery
  - [ ] Create Vercel project for frontend
  - [ ] Create Railway/AWS Lambda for backend

- [ ] **DNS and SSL**
  - [ ] Point be-dpnr.com to production infrastructure
  - [ ] Verify SSL certificate for be-dpnr.com
  - [ ] Configure subdomain api.be-dpnr.com for backend
  - [ ] Test HTTPS redirects

### 🟡 Important - Should Complete

- [ ] **Performance Optimization**
  - [ ] Run database query optimization
  - [ ] Execute data consistency fixes
  - [ ] Verify CDN configuration
  - [ ] Test image optimization

- [ ] **Monitoring Setup**
  - [ ] Configure Sentry error tracking
  - [ ] Set up monitoring dashboards
  - [ ] Configure alert notifications
  - [ ] Test health check endpoints

- [ ] **Security Validation**
  - [ ] Run security audit: `npm audit --audit-level high`
  - [ ] Verify rate limiting configuration
  - [ ] Test authentication flows
  - [ ] Validate GDPR compliance features

### 🟢 Optional - Nice to Have

- [ ] **Load Testing**
  - [ ] Execute user registration load test
  - [ ] Test payment processing under load
  - [ ] Verify concurrent user limits
  - [ ] Test database connection pooling

- [ ] **Documentation**
  - [ ] Update API documentation
  - [ ] Create admin user guide
  - [ ] Document troubleshooting procedures
  - [ ] Update runbook

---

## Deployment Execution Checklist

### Phase 1: Pre-Flight Validation (5 minutes)

- [ ] **Code Validation**
  ```bash
  # Run from project root
  ./scripts/deploy-production.sh --dry-run
  ```
  Expected output: ✅ All validation checks pass

- [ ] **Database Health Check**
  ```bash
  cd backend && npm run db:health:ci
  ```
  Expected output: ✅ Database healthy, all tables exist

- [ ] **Build Validation**
  ```bash
  cd frontend && npm run validate:production
  cd ../backend && npm run validate:prod:ci
  ```
  Expected output: ✅ Builds successful, no critical errors

### Phase 2: Database Migration (3-5 minutes)

- [ ] **Create Database Backup**
  ```bash
  ./scripts/migrate-production.sh --backup-only
  ```
  Expected output: ✅ Backup created and verified

- [ ] **Apply Migrations**
  ```bash
  ./scripts/migrate-production.sh
  ```
  Expected output: ✅ Migrations applied successfully

- [ ] **Validate Migration**
  ```bash
  cd backend && npm run db:health:ci
  ```
  Expected output: ✅ Database schema updated and healthy

### Phase 3: Application Deployment (10-15 minutes)

- [ ] **Deploy Backend**
  ```bash
  # If using Railway
  cd backend && railway deploy

  # If using AWS Lambda
  ./scripts/deploy-production.sh --backend-only
  ```
  Expected output: ✅ Backend deployed successfully

- [ ] **Deploy Frontend**
  ```bash
  # If using Vercel
  cd frontend && vercel --prod

  # Using deployment script
  ./scripts/deploy-production.sh --frontend-only
  ```
  Expected output: ✅ Frontend deployed successfully

- [ ] **Full Deployment** (if not done individually)
  ```bash
  ./scripts/deploy-production.sh
  ```
  Expected output: ✅ Both frontend and backend deployed

### Phase 4: Post-Deployment Validation (5 minutes)

- [ ] **Health Check Validation**
  ```bash
  # Frontend accessibility
  curl -f https://be-dpnr.com

  # API health
  curl -f https://api.be-dpnr.com/v1/health | jq

  # Database connectivity
  curl -f https://api.be-dpnr.com/v1/db-check | jq
  ```
  Expected output: ✅ All endpoints return healthy status

- [ ] **Authentication Test**
  ```bash
  # Test OAuth redirect (manual)
  # Visit https://be-dpnr.com and test login flow
  ```
  Expected output: ✅ Login redirects to Cognito and back successfully

- [ ] **Core Functionality Test**
  ```bash
  # Test enrollment form (manual)
  # Visit https://be-dpnr.com and submit test enrollment
  ```
  Expected output: ✅ Enrollment form submission works

---

## Post-Deployment Tasks

### Immediate (Within 1 hour)

- [ ] **Monitoring Setup**
  - [ ] Configure alert thresholds
  - [ ] Test notification delivery
  - [ ] Set up monitoring dashboards
  - [ ] Document monitoring procedures

- [ ] **User Communication**
  - [ ] Update team on deployment status
  - [ ] Send launch announcement (if applicable)
  - [ ] Update documentation with production URLs

### Within 24 Hours

- [ ] **Performance Monitoring**
  - [ ] Monitor error rates and response times
  - [ ] Check database query performance
  - [ ] Verify CDN cache hit rates
  - [ ] Monitor memory and CPU usage

- [ ] **Security Monitoring**
  - [ ] Review security logs
  - [ ] Check for failed authentication attempts
  - [ ] Verify rate limiting is working
  - [ ] Monitor for unusual traffic patterns

### Within 1 Week

- [ ] **Performance Optimization**
  - [ ] Analyze performance metrics
  - [ ] Optimize slow database queries
  - [ ] Review and adjust rate limits
  - [ ] Optimize image delivery

- [ ] **Documentation Updates**
  - [ ] Update deployment procedures based on experience
  - [ ] Document any issues encountered
  - [ ] Create lessons learned document
  - [ ] Update troubleshooting guide

---

## Rollback Procedures

### Emergency Rollback (If Critical Issues Occur)

1. **Immediate Response** (< 2 minutes)
   ```bash
   # Get last successful deployment
   cat .last-production-deploy

   # Rollback to previous version
   git checkout <previous-commit-sha>
   ./scripts/deploy-production.sh
   ```

2. **Database Rollback** (if needed)
   ```bash
   ./scripts/migrate-production.sh --rollback
   ```

3. **Verification**
   ```bash
   curl -f https://be-dpnr.com
   curl -f https://api.be-dpnr.com/v1/health
   ```

### Rollback Decision Criteria

- **Immediate Rollback If:**
  - Site is completely inaccessible
  - Database corruption detected
  - Payment processing completely broken
  - Security vulnerability exposed

- **Consider Hotfix Instead If:**
  - Minor UI issues
  - Non-critical feature problems
  - Performance degradation < 50%
  - Minor configuration errors

---

## Emergency Contacts

### Technical Escalation
- **Primary DevOps**: devops@be-dpnr.com
- **Development Team**: dev@be-dpnr.com
- **Database Admin**: dba@be-dpnr.com

### Service Providers
- **Vercel Support**: https://vercel.com/help
- **Railway Support**: https://help.railway.app/
- **Supabase Support**: https://supabase.com/support
- **AWS Support**: https://aws.amazon.com/support/

### Business Contacts
- **Product Owner**: product@be-dpnr.com
- **Customer Support**: support@be-dpnr.com
- **Emergency Phone**: +972-XX-XXX-XXXX

---

## Success Criteria

### Deployment Considered Successful When:

✅ **Technical Criteria**
- [ ] Frontend loads without errors (https://be-dpnr.com)
- [ ] API responds to health checks (https://api.be-dpnr.com/v1/health)
- [ ] Database connectivity confirmed
- [ ] Authentication flow works end-to-end
- [ ] Enrollment form submission works
- [ ] Payment processing integration active (test mode initially)

✅ **Performance Criteria**
- [ ] Frontend load time < 3 seconds
- [ ] API response time < 500ms average
- [ ] Database query performance acceptable
- [ ] Error rate < 0.1%

✅ **Security Criteria**
- [ ] HTTPS enforced on all endpoints
- [ ] Authentication redirects working
- [ ] Rate limiting active
- [ ] Security headers present

---

## Notes and Comments

### Deployment Log
```
Date: ___________
Deployed by: ___________
Commit SHA: ___________
Issues encountered: ___________
Resolution time: ___________
```

### Lessons Learned
```
What went well:
- ___________
- ___________

What could be improved:
- ___________
- ___________

Action items for next deployment:
- ___________
- ___________
```

---

*This checklist should be completed by the DevOps engineer and reviewed by the development team lead before initiating production deployment.*

**Checklist Version**: 1.0
**Last Updated**: September 25, 2025
**Next Review**: After first production deployment