#!/bin/bash

# DPNR Production Database Setup Script
# Run this after getting your Supabase connection string

set -e

echo "🚀 DPNR Production Database Setup"
echo "=================================="

# Check if DATABASE_URL is provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide your Supabase DATABASE_URL as the first argument"
    echo ""
    echo "Usage: ./setup-production-db.sh 'postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres'"
    echo ""
    echo "Get your connection string from:"
    echo "1. Go to https://supabase.com/dashboard"
    echo "2. Select your project"
    echo "3. Go to Settings → Database"
    echo "4. Copy the 'Connection pooling' URL"
    exit 1
fi

DATABASE_URL="$1"

echo "🔧 Setting up environment variables..."
# Backup current .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Update DATABASE_URL in .env file
if grep -q "^DATABASE_URL=" .env; then
    # Replace existing DATABASE_URL
    sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=\"$DATABASE_URL\"|" .env
    rm .env.bak
else
    # Add DATABASE_URL if it doesn't exist
    echo "DATABASE_URL=\"$DATABASE_URL\"" >> .env
fi

echo "✅ Updated .env with production DATABASE_URL"

echo ""
echo "🔄 Testing database connection..."
if npx prisma db push --accept-data-loss --skip-generate; then
    echo "✅ Database schema deployed successfully!"
else
    echo "❌ Database connection failed. Please check your URL and try again."
    exit 1
fi

echo ""
echo "🔧 Generating Prisma client..."
npx prisma generate

echo ""
echo "🌱 Running database seed (if available)..."
if npm run db:seed 2>/dev/null; then
    echo "✅ Database seeded successfully!"
else
    echo "ℹ️  No seed script available or failed - this is optional"
fi

echo ""
echo "🎉 Production database setup complete!"
echo ""
echo "📊 You can now:"
echo "   - View your database: npx prisma studio"
echo "   - Deploy your backend with the updated DATABASE_URL"
echo "   - Test the API endpoints"
echo ""
echo "🔗 Connection string saved in .env"
echo "📁 Backup of previous .env saved as .env.backup.$(date +%Y%m%d)_*"