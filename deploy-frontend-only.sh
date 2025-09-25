#!/bin/bash
set -e

echo "🚀 Quick Frontend Deployment for be-dpnr.com Review"
echo "=================================================="

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

DOMAIN="be-dpnr.com"
BUCKET_NAME="be-dpnr-review2"

echo "📦 Deploying frontend to: $DOMAIN"

# Navigate to frontend directory
cd frontend

# Create environment file for build
echo "🔧 Creating build environment..."
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=https://api.$DOMAIN/v1
NEXT_PUBLIC_SITE_URL=https://$DOMAIN
NEXT_PUBLIC_COGNITO_USER_POOL_ID=il-central-1_XXXXXXXXX
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_TRANZILA_TERMINAL_ID=your-terminal-id
NEXT_PUBLIC_ENABLE_ANALYTICS=false
EOF

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm ci
else
    echo "✅ Dependencies already installed"
fi

# Build the application
echo "🔨 Building frontend application..."
npm run build

# Create S3 bucket if it doesn't exist
echo "🪣 Setting up S3 bucket: $BUCKET_NAME"
if aws s3 ls "s3://$BUCKET_NAME" 2>&1 | grep -q 'NoSuchBucket'; then
    echo "Creating new S3 bucket..."
    aws s3 mb "s3://$BUCKET_NAME" --region il-central-1

    # Configure bucket for website hosting
    aws s3 website "s3://$BUCKET_NAME" \
        --index-document index.html \
        --error-document 404.html

    # Try to disable block public access and set public policy
    echo "🔓 Configuring bucket for public access..."
    aws s3api put-public-access-block \
        --bucket "$BUCKET_NAME" \
        --public-access-block-configuration \
        BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false 2>/dev/null || echo "⚠️ Could not modify public access settings"

    # Set bucket policy for public read
    cat > ../bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF

    aws s3api put-bucket-policy \
        --bucket "$BUCKET_NAME" \
        --policy file://../bucket-policy.json 2>/dev/null || echo "⚠️ Could not set public bucket policy - will deploy files anyway"

    rm ../bucket-policy.json
else
    echo "✅ Bucket already exists"
fi

# Deploy to S3
echo "🌐 Deploying to S3..."
aws s3 sync ./out "s3://$BUCKET_NAME" --delete

# Get the website URL
WEBSITE_URL="http://$BUCKET_NAME.s3-website-il-central-1.amazonaws.com"

echo ""
echo "🎉 Frontend Deployment Complete!"
echo "================================="
echo ""
echo "🔗 Review URL: $WEBSITE_URL"
echo ""
echo "📋 What's Available for Review:"
echo "✅ Complete landing page with DPNR course information"
echo "✅ Registration forms (frontend validation only)"
echo "✅ Hebrew/English language switching"
echo "✅ Responsive mobile design"
echo "✅ Privacy and GDPR compliance pages"
echo "✅ Course pricing information (₪6,400)"
echo ""
echo "⚠️  What's NOT Available (requires backend setup):"
echo "❌ User registration/login functionality"
echo "❌ Payment processing"
echo "❌ Email notifications"
echo "❌ Database interactions"
echo "❌ Admin dashboard"
echo ""
echo "🔧 To set up custom domain ($DOMAIN):"
echo "1. Create CloudFront distribution"
echo "2. Request SSL certificate for $DOMAIN"
echo "3. Configure Route 53 DNS records"
echo ""
echo "📞 Support: dev@be-dpnr.com"