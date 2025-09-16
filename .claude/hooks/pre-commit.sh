#!/bin/bash

# Pre-commit hook for DPNR Course Platform
# This hook runs before any code changes are committed

echo "🔍 Running pre-commit checks..."

# Check if we're in the dpnr-course-platform directory
if [ -d "dpnr-course-platform" ]; then
    cd dpnr-course-platform
fi

# 1. Run linter
echo "📝 Running linter..."
npm run lint
if [ $? -ne 0 ]; then
    echo "❌ Linting failed. Please fix linting errors before committing."
    exit 1
fi

# 2. Check for TypeScript errors
echo "🔧 Checking TypeScript..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
    echo "❌ TypeScript errors found. Please fix type errors before committing."
    exit 1
fi

# 3. Check for console.log statements in production code
echo "🔎 Checking for console.log statements..."
git diff --cached --name-only | grep -E '\.(ts|tsx|js|jsx)$' | xargs grep -n "console\.\(log\|error\|warn\|info\)" | grep -v "// eslint-disable" | grep -v "// @ts-ignore"
if [ $? -eq 0 ]; then
    echo "⚠️  Warning: console statements found in staged files. Consider removing them."
fi

# 4. Check for sensitive information
echo "🔐 Checking for sensitive information..."
git diff --cached --name-only | xargs grep -E "(AWS_SECRET|SECRET_KEY|PRIVATE_KEY|PASSWORD|TOKEN)" | grep -v ".example" | grep -v "// EXAMPLE"
if [ $? -eq 0 ]; then
    echo "❌ Potential sensitive information found. Please review before committing."
    exit 1
fi

# 5. Validate Prisma schema if changed
if git diff --cached --name-only | grep -q "schema.prisma"; then
    echo "📊 Validating Prisma schema..."
    cd packages/database
    npx prisma validate
    if [ $? -ne 0 ]; then
        echo "❌ Prisma schema validation failed."
        exit 1
    fi
    cd ../..
fi

echo "✅ All pre-commit checks passed!"
exit 0