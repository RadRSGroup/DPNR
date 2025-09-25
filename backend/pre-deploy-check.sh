#!/bin/bash

# DPNR Pre-Deployment Verification Script

set -e

echo "🔍 DPNR Pre-Deployment Verification"
echo "===================================="

echo ""
echo "📋 Checking prerequisites..."

# Check Node.js version
NODE_VERSION=$(node -v)
echo "✅ Node.js: $NODE_VERSION"

# Check npm version
NPM_VERSION=$(npm -v)
echo "✅ npm: $NPM_VERSION"

# Check if we're in the right directory
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ Error: prisma/schema.prisma not found"
    echo "Please run this script from the backend directory"
    exit 1
fi
echo "✅ Prisma schema found"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found"
    echo "Please create .env file with DATABASE_URL"
    exit 1
fi
echo "✅ .env file exists"

# Check for DATABASE_URL in .env
if ! grep -q "^DATABASE_URL=" .env; then
    echo "❌ Error: DATABASE_URL not found in .env"
    echo "Please add your Supabase connection string to .env"
    exit 1
fi
echo "✅ DATABASE_URL configured"

# Check DATABASE_URL format
DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2- | sed 's/^"//' | sed 's/"$//')
if [[ "$DATABASE_URL" == *"localhost"* ]] || [[ "$DATABASE_URL" == *"username:password"* ]]; then
    echo "⚠️  Warning: DATABASE_URL appears to be a local/example URL"
    echo "   Make sure you've updated it with your Supabase connection string"
else
    echo "✅ DATABASE_URL appears to be a production URL"
fi

echo ""
echo "🔧 Checking dependencies..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "❌ Error: node_modules not found"
    echo "Please run: npm install"
    exit 1
fi
echo "✅ Dependencies installed"

# Check Prisma client
if [ ! -d "node_modules/.prisma" ]; then
    echo "⚠️  Warning: Prisma client not generated"
    echo "Will be generated during deployment"
else
    echo "✅ Prisma client generated"
fi

echo ""
echo "📝 Checking scripts..."

# Check if deployment scripts exist
SCRIPTS=("setup-production-db.sh" "check-db-health.sh")
for script in "${SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        echo "✅ $script exists"
    else
        echo "❌ $script missing"
    fi
done

echo ""
echo "🎯 Ready for deployment!"
echo ""
echo "📋 Next steps:"
echo "1. Create Supabase project at https://supabase.com"
echo "2. Get your connection string from Settings → Database"
echo "3. Run: ./setup-production-db.sh 'your-connection-string'"
echo "4. Verify with: ./check-db-health.sh"
echo ""
echo "🚀 Then you can deploy your backend to AWS Lambda/Vercel"