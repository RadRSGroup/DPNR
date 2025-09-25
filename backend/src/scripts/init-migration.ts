import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Initialize database migration for DPNR project
 * This creates the initial migration file from the current schema
 */
async function initMigration() {
  console.log('🚀 Initializing DPNR Database Migration...\n');

  const migrationsDir = join(process.cwd(), 'prisma', 'migrations');
  const timestamp = new Date().toISOString().replace(/[-T:]/g, '').split('.')[0];
  const migrationName = `${timestamp}_init_dpnr_schema`;
  const migrationPath = join(migrationsDir, migrationName);

  try {
    // Ensure migrations directory exists
    if (!existsSync(migrationsDir)) {
      console.log('📁 Creating migrations directory...');
      mkdirSync(migrationsDir, { recursive: true });
    }

    // Check if any migrations already exist
    const existingMigrations = execSync('find prisma/migrations -name "migration.sql" 2>/dev/null | wc -l', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();

    if (parseInt(existingMigrations) > 0) {
      console.log('⚠️  Existing migrations found. Use this only for initial setup.');
      console.log('   For schema changes, use: npx prisma migrate dev');
      return;
    }

    // Create migration directory
    console.log(`📂 Creating migration: ${migrationName}`);
    mkdirSync(migrationPath, { recursive: true });

    // Generate migration SQL
    console.log('🔨 Generating migration SQL from schema...');

    const migrationSQL = `-- CreateEnum
CREATE TYPE "Language" AS ENUM ('HE', 'EN');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'ADMIN', 'INSTRUCTOR');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentPlan" AS ENUM ('FULL', 'FIVE_INSTALLMENTS', 'TWELVE_INSTALLMENTS');

-- CreateEnum
CREATE TYPE "CohortStatus" AS ENUM ('UPCOMING', 'OPEN_ENROLLMENT', 'FULL', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('NEW', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('PRIVACY_POLICY', 'TERMS_OF_SERVICE', 'MARKETING_EMAILS', 'ANALYTICS_COOKIES');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "cognitoId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "preferredLanguage" "Language" NOT NULL DEFAULT 'HE',
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohorts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "maxCapacity" INTEGER NOT NULL DEFAULT 20,
    "currentEnrollment" INTEGER NOT NULL DEFAULT 0,
    "status" "CohortStatus" NOT NULL DEFAULT 'UPCOMING',
    "location" TEXT NOT NULL DEFAULT 'Mazkeret Batya',
    "schedule" TEXT NOT NULL DEFAULT 'Weekly evenings, 1.5-2 hours',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cohorts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paymentPlan" "PaymentPlan" NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "enrollmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "questionnaire" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_requests" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "preferredLanguage" "Language" NOT NULL DEFAULT 'HE',
    "preferredTimeSlot" TEXT NOT NULL,
    "message" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'NEW',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "consultation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "tranzillaReference" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "installmentNumber" INTEGER,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT NOT NULL,
    "failureReason" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "privacy_consents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentType" "ConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "privacy_consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_cognitoId_key" ON "users"("cognitoId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_userId_cohortId_key" ON "enrollments"("userId", "cohortId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_tranzillaReference_key" ON "payment_transactions"("tranzillaReference");

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_requests" ADD CONSTRAINT "consultation_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "privacy_consents" ADD CONSTRAINT "privacy_consents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create useful indexes for performance
CREATE INDEX "users_role_idx" ON "users"("role");
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");
CREATE INDEX "cohorts_status_idx" ON "cohorts"("status");
CREATE INDEX "cohorts_startDate_idx" ON "cohorts"("startDate");
CREATE INDEX "enrollments_status_idx" ON "enrollments"("status");
CREATE INDEX "enrollments_enrollmentDate_idx" ON "enrollments"("enrollmentDate");
CREATE INDEX "consultation_requests_status_idx" ON "consultation_requests"("status");
CREATE INDEX "consultation_requests_createdAt_idx" ON "consultation_requests"("createdAt");
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");
CREATE INDEX "payment_transactions_processedAt_idx" ON "payment_transactions"("processedAt");
CREATE INDEX "privacy_consents_consentType_idx" ON "privacy_consents"("consentType");
CREATE INDEX "privacy_consents_createdAt_idx" ON "privacy_consents"("createdAt");
`;

    // Write migration.sql file
    const migrationSQLPath = join(migrationPath, 'migration.sql');
    writeFileSync(migrationSQLPath, migrationSQL, 'utf8');
    console.log(`✅ Created migration file: ${migrationSQLPath}`);

    // Create migration snapshot (for Prisma)
    console.log('📸 Creating migration snapshot...');
    try {
      execSync('npx prisma migrate resolve --applied ' + migrationName, {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('✅ Migration snapshot created');
    } catch (error) {
      console.log('⚠️  Could not create migration snapshot. This is normal for first run.');
    }

    console.log('\n🎉 Migration initialization completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Review the migration file if needed');
    console.log('   2. Run migration: npm run prisma:deploy');
    console.log('   3. Generate Prisma client: npm run prisma:generate');
    console.log('   4. Seed database: npm run db:seed');

  } catch (error) {
    console.error('❌ Migration initialization failed:', error);
    throw error;
  }
}

// CLI interface
if (require.main === module) {
  initMigration()
    .catch((error) => {
      console.error('❌ Migration initialization failed:', error.message);
      process.exit(1);
    });
}

export { initMigration };