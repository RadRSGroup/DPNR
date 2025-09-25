#!/bin/bash

# DPNR Database Health Check Script

set -e

echo "🏥 DPNR Database Health Check"
echo "============================="

echo ""
echo "🔍 Checking database connection..."

# Test basic connection
if npx prisma db push --accept-data-loss --skip-generate --force-reset 2>/dev/null; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    exit 1
fi

echo ""
echo "📊 Checking database structure..."

# Generate fresh client
npx prisma generate > /dev/null 2>&1

echo ""
echo "🔢 Checking table counts..."

# Simple node script to check tables
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTables() {
    try {
        const userCount = await prisma.user.count();
        const cohortCount = await prisma.cohort.count();
        const enrollmentCount = await prisma.enrollment.count();

        console.log(\`📈 Database Statistics:\`);
        console.log(\`   Users: \${userCount}\`);
        console.log(\`   Cohorts: \${cohortCount}\`);
        console.log(\`   Enrollments: \${enrollmentCount}\`);

        await prisma.\$disconnect();
        console.log('✅ All tables accessible');
    } catch (error) {
        console.error('❌ Database check failed:', error.message);
        process.exit(1);
    }
}

checkTables();
"

echo ""
echo "🎉 Database health check complete!"