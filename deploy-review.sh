#!/bin/bash
set -e

echo "🚀 Deploying DPNR site for review to be-dpnr.com..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Check if domain is provided
DOMAIN="be-dpnr.com"
echo "📦 Deploying to domain: $DOMAIN"

# Update environment variables for the new domain
echo "🔧 Updating environment variables..."

# Backend environment update
cd backend
if [ -f .env.example ]; then
    cp .env.example .env
    sed -i.bak "s/dpnr\.co\.il/$DOMAIN/g" .env
    sed -i.bak "s/localhost:3000/https:\/\/$DOMAIN/g" .env
    echo "✅ Backend environment configured"
else
    echo "❌ Backend .env.example not found"
    exit 1
fi

# Frontend environment update
cd ../frontend
if [ -f .env.local.example ]; then
    cp .env.local.example .env.local
    sed -i.bak "s/dpnr\.co\.il/$DOMAIN/g" .env.local
    sed -i.bak "s/localhost:3001/https:\/\/api.$DOMAIN/g" .env.local
    echo "✅ Frontend environment configured"
elif [ -f .env.example ]; then
    cp .env.example .env.local
    sed -i.bak "s/dpnr\.co\.il/$DOMAIN/g" .env.local
    sed -i.bak "s/localhost:3001/https:\/\/api.$DOMAIN/g" .env.local
    echo "✅ Frontend environment configured"
else
    echo "❌ Frontend .env.example or .env.local.example not found"
    exit 1
fi

echo "⚠️  MANUAL STEP REQUIRED:"
echo "1. Update AWS Cognito User Pool ID in .env files"
echo "2. Update Tranzila credentials in backend/.env"
echo "3. Update database URL in backend/.env"
echo ""
echo "Press Enter when environment files are configured..."
read -p ""

# Install dependencies
echo "📦 Installing dependencies..."
cd ../backend
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm ci
else
    echo "Backend dependencies already installed"
fi

cd ../frontend
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm ci
else
    echo "Frontend dependencies already installed"
fi

# Run tests to ensure everything works (optional for quick deployment)
echo "🧪 Running basic checks..."
cd ../backend && npm run build --if-present || echo "⚠️ Backend build check skipped"
cd ../frontend && npm run build --if-present || echo "⚠️ Frontend build check skipped"

# Build applications
echo "🔨 Building applications..."
cd ../backend && npm run build
cd ../frontend && npm run build

# Create S3 bucket if it doesn't exist
BUCKET_NAME="be-dpnr-website"
echo "🪣 Setting up S3 bucket: $BUCKET_NAME"

if ! aws s3 ls "s3://$BUCKET_NAME" 2>&1 | grep -q 'NoSuchBucket'; then
    echo "Bucket already exists"
else
    aws s3 mb "s3://$BUCKET_NAME" --region us-east-1

    # Configure bucket for website hosting
    aws s3 website "s3://$BUCKET_NAME" \
        --index-document index.html \
        --error-document 404.html

    # Set bucket policy for public read
    cat > bucket-policy.json << EOF
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
        --policy file://bucket-policy.json

    rm bucket-policy.json
fi

# Deploy frontend to S3
echo "🌐 Deploying frontend to S3..."
cd ../frontend
aws s3 sync ./out "s3://$BUCKET_NAME" --delete

# Get the S3 website URL
S3_URL="http://$BUCKET_NAME.s3-website-us-east-1.amazonaws.com"

echo ""
echo "✅ Deployment completed!"
echo ""
echo "📝 Next Steps for Full Production:"
echo "1. Set up CloudFront distribution for $DOMAIN"
echo "2. Configure SSL certificate via AWS Certificate Manager"
echo "3. Update DNS records to point to CloudFront"
echo "4. Deploy backend API to Lambda"
echo "5. Set up RDS database and run migrations"
echo ""
echo "🔗 Current S3 website URL (for testing): $S3_URL"
echo ""
echo "⚠️  IMPORTANT: This is a basic deployment. For production:"
echo "- Use CloudFront for CDN and custom domain"
echo "- Set up proper SSL certificates"
echo "- Configure backend API on Lambda"
echo "- Set up production database"
echo ""

# Show what needs manual configuration
echo "📋 Required Manual Configuration:"
echo "1. AWS Cognito User Pool setup"
echo "2. Tranzila payment gateway configuration"
echo "3. Production database setup"
echo "4. DNS configuration for be-dpnr.com"
echo "5. SSL certificate setup"
echo ""
echo "📧 For support: dev@be-dpnr.com"