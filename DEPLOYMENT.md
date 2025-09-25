# DPNR Course Registration Platform - Deployment Guide

## Overview

This document provides comprehensive deployment instructions for the DPNR Course Registration Platform, including both staging and production environments.

## Architecture

- **Frontend**: Next.js application deployed to AWS S3 + CloudFront
- **Backend**: Node.js API deployed to AWS Lambda
- **Database**: PostgreSQL on AWS RDS
- **Authentication**: AWS Cognito
- **Storage**: AWS S3 for file uploads
- **CDN**: AWS CloudFront for content delivery
- **Monitoring**: AWS CloudWatch + Prometheus/Grafana
- **CI/CD**: GitHub Actions

## Prerequisites

### Required Tools
- AWS CLI v2.x
- Node.js 18.x or higher
- npm or yarn
- Docker (for local development)
- PostgreSQL client

### AWS Services Setup
1. AWS Cognito User Pool
2. AWS RDS PostgreSQL instance
3. AWS S3 buckets (production and staging)
4. AWS Lambda functions
5. AWS CloudFront distributions
6. AWS IAM roles and policies

## Environment Configuration

### 1. Backend Environment Variables

Create `.env` file in the backend directory:

```bash
# Database
DATABASE_URL="postgresql://username:password@host:5432/dpnr_prod"
TEST_DATABASE_URL="postgresql://username:password@host:5432/dpnr_test"

# JWT Configuration
JWT_SECRET="your-super-secure-jwt-secret-256-bits-minimum"
JWT_EXPIRES_IN="24h"

# AWS Cognito
AWS_REGION="us-east-1"
COGNITO_USER_POOL_ID="us-east-1_XXXXXXXXX"
COGNITO_CLIENT_ID="xxxxxxxxxxxxxxxxxxxxxxxxxx"

# Tranzila Payment Gateway
TRANZILA_API_KEY="your-tranzila-api-key"
TRANZILA_TERMINAL_ID="your-terminal-id"
TRANZILA_API_URL="https://secure5.tranzila.com/cgi-bin/tranzila71u.cgi"

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-smtp-user"
SMTP_PASS="your-smtp-password"
FROM_EMAIL="noreply@dpnr.co.il"

# File Upload
AWS_S3_BUCKET="dpnr-uploads-prod"
AWS_S3_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"

# Application URLs
CLIENT_URL="https://dpnr.co.il"
API_URL="https://api.dpnr.co.il"

# Security
CORS_ORIGIN="https://dpnr.co.il,https://www.dpnr.co.il"
RATE_LIMIT_WINDOW_MS="900000"  # 15 minutes
RATE_LIMIT_MAX_REQUESTS="100"

# Monitoring
SENTRY_DSN="https://your-sentry-dsn"
LOG_LEVEL="info"
```

### 2. Frontend Environment Variables

Create `.env.local` file in the frontend directory:

```bash
# API Configuration
NEXT_PUBLIC_API_URL="https://api.dpnr.co.il/v1"
NEXT_PUBLIC_SITE_URL="https://dpnr.co.il"

# AWS Cognito
NEXT_PUBLIC_COGNITO_USER_POOL_ID="us-east-1_XXXXXXXXX"
NEXT_PUBLIC_COGNITO_CLIENT_ID="xxxxxxxxxxxxxxxxxxxxxxxxxx"
NEXT_PUBLIC_AWS_REGION="us-east-1"

# Tranzila (Public)
NEXT_PUBLIC_TRANZILA_TERMINAL_ID="your-terminal-id"

# Analytics
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID="G-XXXXXXXXXX"
NEXT_PUBLIC_FACEBOOK_PIXEL_ID="xxxxxxxxxxxxxxx"

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS="true"
NEXT_PUBLIC_ENABLE_CHAT_SUPPORT="true"

# Error Tracking
NEXT_PUBLIC_SENTRY_DSN="https://your-sentry-dsn"
```

## Staging Environment Setup

### 1. AWS Resources

```bash
# Create staging S3 bucket
aws s3 mb s3://dpnr-staging-website --region us-east-1

# Create staging CloudFront distribution
aws cloudfront create-distribution --distribution-config file://cloudfront-staging-config.json

# Create staging Lambda function
aws lambda create-function \
  --function-name dpnr-api-staging \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-execution-role \
  --handler index.handler \
  --zip-file fileb://lambda-package.zip

# Create staging RDS instance
aws rds create-db-instance \
  --db-instance-identifier dpnr-staging \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --allocated-storage 20 \
  --db-name dpnr_staging \
  --master-username dpnr_admin \
  --master-user-password YOUR_PASSWORD
```

### 2. Deploy to Staging

```bash
# Clone repository
git clone https://github.com/your-org/dpnr-platform.git
cd dpnr-platform

# Install dependencies
cd backend && npm ci
cd ../frontend && npm ci

# Run tests
cd ../backend && npm run test:ci
cd ../frontend && npm run test:ci

# Build applications
cd ../backend && npm run build
cd ../frontend && npm run build

# Deploy backend to Lambda
cd ../backend
aws lambda update-function-code \
  --function-name dpnr-api-staging \
  --zip-file fileb://dist/lambda-package.zip

# Deploy frontend to S3
cd ../frontend
aws s3 sync ./out s3://dpnr-staging-website --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_STAGING_DISTRIBUTION_ID \
  --paths "/*"

# Run database migrations
cd ../backend
npx prisma migrate deploy
```

## Production Deployment

### 1. Infrastructure as Code (Terraform)

Create `terraform/main.tf`:

```hcl
provider "aws" {
  region = "us-east-1"
}

# S3 Bucket for website
resource "aws_s3_bucket" "website" {
  bucket = "dpnr-website-prod"
}

resource "aws_s3_bucket_website_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "404.html"
  }
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "website" {
  origin {
    domain_name = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.website.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.website.cloudfront_access_identity_path
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.website.id}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.website.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  aliases = ["dpnr.co.il", "www.dpnr.co.il"]
}

# Lambda function for API
resource "aws_lambda_function" "api" {
  filename         = "../backend/dist/lambda-package.zip"
  function_name    = "dpnr-api-prod"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 30
  memory_size     = 512

  environment {
    variables = {
      DATABASE_URL = var.database_url
      JWT_SECRET   = var.jwt_secret
    }
  }
}

# RDS PostgreSQL instance
resource "aws_db_instance" "postgres" {
  identifier     = "dpnr-prod"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.small"

  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_type          = "gp2"
  storage_encrypted     = true

  db_name  = "dpnr_prod"
  username = "dpnr_admin"
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "Sun:04:00-Sun:05:00"

  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "dpnr-prod-final-snapshot"

  tags = {
    Name = "DPNR Production Database"
  }
}
```

### 2. Deploy to Production

```bash
# Initialize Terraform
cd terraform
terraform init
terraform plan
terraform apply

# Deploy application
cd ../scripts
./deploy-production.sh
```

Create `scripts/deploy-production.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Starting production deployment..."

# Verify we're on main branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
    echo "❌ Must be on main branch for production deployment"
    exit 1
fi

# Verify all tests pass
echo "🧪 Running tests..."
cd backend && npm run test:ci
cd ../frontend && npm run test:ci

# Build applications
echo "🔨 Building applications..."
cd ../backend && npm run build
cd ../frontend && npm run build

# Deploy backend
echo "📦 Deploying backend..."
aws lambda update-function-code \
  --function-name dpnr-api-prod \
  --zip-file fileb://dist/lambda-package.zip

# Deploy frontend
echo "🌐 Deploying frontend..."
cd ../frontend
aws s3 sync ./out s3://dpnr-website-prod --delete

# Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
  --paths "/*"

# Run database migrations
echo "🗄️ Running database migrations..."
cd ../backend
npx prisma migrate deploy

# Health check
echo "🩺 Running health check..."
sleep 30
curl -f https://api.dpnr.co.il/health || exit 1
curl -f https://dpnr.co.il || exit 1

echo "✅ Production deployment completed successfully!"
```

## Database Migrations

### Development
```bash
cd backend
npx prisma migrate dev --name add_new_feature
npx prisma generate
```

### Production
```bash
cd backend
npx prisma migrate deploy
```

### Rollback Strategy
```bash
# Create rollback migration
npx prisma migrate resolve --rolled-back MIGRATION_ID

# Apply rollback
npx prisma migrate deploy
```

## Monitoring and Logging

### 1. AWS CloudWatch Setup

```bash
# Create log groups
aws logs create-log-group --log-group-name /aws/lambda/dpnr-api-prod
aws logs create-log-group --log-group-name /aws/rds/instance/dpnr-prod/error

# Create CloudWatch alarms
aws cloudwatch put-metric-alarm \
  --alarm-name "dpnr-api-high-error-rate" \
  --alarm-description "High error rate in API" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=dpnr-api-prod \
  --evaluation-periods 2
```

### 2. Application Monitoring

- **Logs**: CloudWatch Logs for Lambda and RDS
- **Metrics**: Custom application metrics via CloudWatch
- **Alerts**: SNS notifications for critical issues
- **Uptime**: Pingdom or similar service
- **Performance**: Lighthouse CI for frontend performance

### 3. Security Monitoring

- **AWS Config**: Track configuration changes
- **AWS CloudTrail**: API call logging
- **AWS GuardDuty**: Threat detection
- **Security Hub**: Centralized security findings

## Backup and Recovery

### 1. Database Backups

```bash
# Automated backups are enabled in RDS
# Manual backup
aws rds create-db-snapshot \
  --db-instance-identifier dpnr-prod \
  --db-snapshot-identifier dpnr-manual-backup-$(date +%Y%m%d)

# Restore from backup
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier dpnr-prod-restored \
  --db-snapshot-identifier dpnr-backup-20241201
```

### 2. Code and Configuration Backups

- All code is version controlled in Git
- Environment configurations are stored in AWS Systems Manager Parameter Store
- Infrastructure is defined in Terraform (Infrastructure as Code)

## Rollback Procedures

### 1. Application Rollback

```bash
# Rollback Lambda function
aws lambda update-function-code \
  --function-name dpnr-api-prod \
  --zip-file fileb://previous-version.zip

# Rollback frontend
aws s3 sync ./previous-build s3://dpnr-website-prod --delete
aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
  --paths "/*"
```

### 2. Database Rollback

```bash
# Run rollback migration
cd backend
npx prisma migrate resolve --rolled-back PROBLEMATIC_MIGRATION_ID
npx prisma migrate deploy
```

## Performance Optimization

### 1. Frontend Optimization

- **Image optimization**: Next.js automatic image optimization
- **Code splitting**: Automatic route-based code splitting
- **CDN**: CloudFront for global content delivery
- **Caching**: Browser and CDN caching strategies

### 2. Backend Optimization

- **Database indexing**: Proper indexes for query performance
- **Connection pooling**: PgBouncer for database connections
- **Caching**: Redis for session and application caching
- **Lambda optimization**: Proper memory allocation and warm-up

### 3. Database Optimization

- **Query optimization**: Regular EXPLAIN ANALYZE
- **Index monitoring**: Track index usage
- **Connection monitoring**: Monitor active connections
- **Performance Insights**: AWS RDS Performance Insights

## Security Best Practices

### 1. Network Security

- **VPC**: All resources in private subnets
- **Security Groups**: Restrictive ingress/egress rules
- **NACLs**: Additional network-level filtering
- **WAF**: Web Application Firewall for CloudFront

### 2. Application Security

- **HTTPS**: Enforce HTTPS everywhere
- **CORS**: Properly configured CORS policies
- **Rate limiting**: Prevent abuse and DoS attacks
- **Input validation**: Validate all inputs server-side

### 3. Data Security

- **Encryption at rest**: RDS and S3 encryption
- **Encryption in transit**: TLS 1.2+ everywhere
- **Secrets management**: AWS Systems Manager Parameter Store
- **GDPR compliance**: Data retention and deletion policies

## Troubleshooting

### Common Issues

1. **Lambda timeout errors**
   - Increase timeout value
   - Optimize database queries
   - Add connection pooling

2. **Database connection issues**
   - Check security group rules
   - Verify connection string
   - Monitor connection limits

3. **Frontend deployment issues**
   - Check S3 bucket permissions
   - Verify CloudFront invalidation
   - Review build errors

4. **Authentication failures**
   - Verify Cognito configuration
   - Check JWT secret rotation
   - Review token expiration

### Debug Commands

```bash
# Check Lambda logs
aws logs tail /aws/lambda/dpnr-api-prod --follow

# Check database connections
aws rds describe-db-instances --db-instance-identifier dpnr-prod

# Test API endpoints
curl -X GET https://api.dpnr.co.il/health

# Check CloudFront cache status
aws cloudfront get-distribution --id $DISTRIBUTION_ID
```

## Contact Information

- **Development Team**: dev@dpnr.co.il
- **DevOps Team**: devops@dpnr.co.il
- **Emergency Contact**: +972-50-123-4567
- **Slack Channel**: #dpnr-deployments

---

**Last Updated**: December 2024
**Version**: 1.0
**Document Owner**: DevOps Team