# DPNR Review Deployment Checklist for be-dpnr.com

## 🎯 Deployment Goal
Deploy the DPNR Course Registration Platform to `be-dpnr.com` for stakeholder review and testing.

## ✅ Pre-Deployment Checklist

### 1. **AWS Account Setup** ⚠️ REQUIRED
- [ ] AWS account with appropriate permissions
- [ ] AWS CLI configured locally (`aws configure`)
- [ ] Domain `be-dpnr.com` registered and accessible via AWS Route 53

### 2. **AWS Services Configuration** ⚠️ REQUIRED

#### Cognito User Pool
```bash
# Create via AWS Console or CLI
aws cognito-idp create-user-pool \
    --pool-name "be-dpnr-users" \
    --auto-verified-attributes email \
    --username-attributes email
```
**Needed Values:**
- User Pool ID: `us-east-1_XXXXXXXXX`
- App Client ID: `xxxxxxxxxxxxxxxxxx`

#### RDS PostgreSQL Database
```bash
# Create via AWS Console or CLI
aws rds create-db-instance \
    --db-instance-identifier be-dpnr-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --master-username dpnr_admin \
    --master-user-password [SECURE_PASSWORD] \
    --allocated-storage 20 \
    --vpc-security-group-ids sg-xxxxxxxx
```
**Needed Value:**
- Database URL: `postgresql://dpnr_admin:[PASSWORD]@[ENDPOINT]:5432/be_dpnr`

### 3. **Payment Gateway Setup** 🇮🇱 ISRAEL SPECIFIC
- [ ] Tranzila merchant account registration
- [ ] Terminal ID obtained
- [ ] API credentials configured
- [ ] Test transaction verified

**Needed Values:**
- Terminal ID: `your-terminal-id`
- API Key: `your-api-key`

### 4. **Environment Configuration Files**

#### Backend `.env` file:
```bash
# Database
DATABASE_URL="postgresql://dpnr_admin:[PASSWORD]@[RDS_ENDPOINT]:5432/be_dpnr"

# Authentication
JWT_SECRET="[GENERATE_256_BIT_SECRET]"
COGNITO_USER_POOL_ID="us-east-1_XXXXXXXXX"
COGNITO_CLIENT_ID="xxxxxxxxxxxxxxxxxx"

# Payment
TRANZILA_API_KEY="your-tranzila-key"
TRANZILA_TERMINAL_ID="your-terminal-id"

# URLs
CLIENT_URL="https://be-dpnr.com"
API_URL="https://api.be-dpnr.com"
CORS_ORIGIN="https://be-dpnr.com,https://www.be-dpnr.com"

# Email (optional for review)
SMTP_HOST="smtp.gmail.com"
SMTP_USER="noreply@be-dpnr.com"
SMTP_PASS="[APP_PASSWORD]"
```

#### Frontend `.env.local` file:
```bash
NEXT_PUBLIC_API_URL="https://api.be-dpnr.com/v1"
NEXT_PUBLIC_SITE_URL="https://be-dpnr.com"
NEXT_PUBLIC_COGNITO_USER_POOL_ID="us-east-1_XXXXXXXXX"
NEXT_PUBLIC_COGNITO_CLIENT_ID="xxxxxxxxxxxxxxxxxx"
NEXT_PUBLIC_TRANZILA_TERMINAL_ID="your-terminal-id"
```

## 🚀 Deployment Methods

### Option A: Quick Review Deployment (S3 only)
**Best for:** Initial review, stakeholder demonstration
**Time:** ~30 minutes
**Features:** Frontend only, limited functionality

```bash
./deploy-review.sh
```

### Option B: Full Production Deployment
**Best for:** Complete functionality testing
**Time:** 2-3 hours
**Features:** Full backend, payments, authentication

```bash
# Follow the comprehensive deployment guide
# See DEPLOYMENT.md for detailed instructions
```

## 📋 Step-by-Step Quick Deployment

### Step 1: Configure AWS
```bash
# Verify AWS access
aws sts get-caller-identity

# Set default region
aws configure set default.region us-east-1
```

### Step 2: Run Deployment Script
```bash
cd /Users/Rad/registration_site/regist_site
./deploy-review.sh
```

### Step 3: Manual Configuration
After running the script, you'll need to:

1. **Update environment files** with real values:
   - Cognito User Pool ID and Client ID
   - Database connection string
   - Tranzila credentials

2. **Test the deployment**:
   ```bash
   # Test frontend
   curl -I http://be-dpnr-website.s3-website-us-east-1.amazonaws.com

   # Test API (once deployed)
   curl https://api.be-dpnr.com/health
   ```

## 🔍 What Reviewers Can Test

### ✅ Available in Quick Deployment
- Landing page with course information
- Registration form (frontend validation)
- Login/logout flow (if Cognito configured)
- Responsive design on mobile/desktop
- Hebrew/English language switching
- Privacy and GDPR compliance pages

### ⚠️ Requires Full Deployment
- Payment processing
- Course enrollment completion
- Email notifications
- Admin dashboard functionality
- User progress tracking
- Consultation booking

## 🐛 Common Deployment Issues

### Issue: "AWS CLI not configured"
**Solution:**
```bash
aws configure
# Enter your Access Key ID, Secret Key, Region (us-east-1), Output format (json)
```

### Issue: "Domain not accessible"
**Solution:**
- Ensure `be-dpnr.com` is registered
- Update DNS to point to AWS services
- Wait for DNS propagation (up to 48 hours)

### Issue: "Cognito authentication fails"
**Solution:**
- Verify User Pool configuration
- Check app client settings
- Ensure domain is in allowed callbacks

### Issue: "Payment processing fails"
**Solution:**
- Verify Tranzila credentials
- Check terminal configuration
- Test with sandbox mode first

## 💡 Review Feedback Collection

### Test Scenarios for Reviewers
1. **Landing Page**: Visit be-dpnr.com, review content and design
2. **Registration**: Try to create a new account
3. **Course Information**: Browse available courses and pricing
4. **Mobile Experience**: Test on mobile devices
5. **Language Switching**: Test Hebrew ↔ English functionality
6. **Payment Flow**: Attempt enrollment (will show payment form)

### Feedback Channels
- **GitHub Issues**: Technical feedback and bugs
- **Email**: General feedback to dev@be-dpnr.com
- **Document**: Shared Google Doc for comprehensive feedback

## 📞 Support Contacts

- **Technical Issues**: Create GitHub issue or email dev@be-dpnr.com
- **Payment/Business Logic**: Email business@be-dpnr.com
- **Urgent Deployment Issues**: Call +972-50-XXX-XXXX

## 🎯 Success Criteria for Review

### Minimum Viable Review
- [ ] Site loads on be-dpnr.com
- [ ] Registration form is functional
- [ ] Content is properly displayed in Hebrew
- [ ] Mobile responsive design works
- [ ] No critical JavaScript errors

### Optimal Review Experience
- [ ] Full user registration and login flow
- [ ] Course enrollment process (up to payment)
- [ ] Admin dashboard accessibility
- [ ] Email notifications working
- [ ] Payment integration (test mode)

---

**Estimated Deployment Time:** 30 minutes (quick) to 3 hours (full)
**Domain:** be-dpnr.com
**Last Updated:** December 2024