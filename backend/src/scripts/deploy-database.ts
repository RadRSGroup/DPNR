import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

interface DeploymentOptions {
  environment: 'staging' | 'production';
  skipSeed?: boolean;
  dryRun?: boolean;
}

async function deployDatabase(options: DeploymentOptions) {
  const { environment, skipSeed = false, dryRun = false } = options;

  console.log(`🚀 Deploying DPNR database for ${environment.toUpperCase()}`);
  console.log(`🔍 Dry run: ${dryRun ? 'YES' : 'NO'}`);

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }

  try {
    // 1. Verify environment
    console.log('\n📋 Step 1: Environment Verification');
    await verifyEnvironment(environment);

    // 2. Test database connection
    console.log('\n📡 Step 2: Database Connection Test');
    await testConnection();

    // 3. Check migration status
    console.log('\n🔍 Step 3: Migration Status Check');
    await checkMigrationStatus();

    // 4. Deploy migrations
    if (!dryRun) {
      console.log('\n🚀 Step 4: Deploying Migrations');
      await deployMigrations();
    } else {
      console.log('\n🔍 Step 4: [DRY RUN] Would deploy migrations');
    }

    // 5. Generate Prisma client
    if (!dryRun) {
      console.log('\n🔨 Step 5: Generating Prisma Client');
      await generateClient();
    } else {
      console.log('\n🔍 Step 5: [DRY RUN] Would generate Prisma client');
    }

    // 6. Verify deployment
    console.log('\n✅ Step 6: Deployment Verification');
    await verifyDeployment();

    // 7. Seed data (if requested and not production)
    if (!skipSeed && environment !== 'production') {
      if (!dryRun) {
        console.log('\n🌱 Step 7: Seeding Database');
        await seedDatabase();
      } else {
        console.log('\n🔍 Step 7: [DRY RUN] Would seed database');
      }
    } else {
      console.log('\n⏭️  Step 7: Skipping seed (production environment or explicitly skipped)');
    }

    // 8. Final status
    console.log('\n📊 Step 8: Final Status Report');
    await generateStatusReport();

    console.log('\n🎉 Database deployment completed successfully!');
    logNextSteps(environment);

  } catch (error) {
    console.error('\n❌ Database deployment failed:', error);
    await logTroubleshootingTips(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function verifyEnvironment(environment: string) {
  const requiredVars = [
    'DATABASE_URL',
    'NODE_ENV',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  if (process.env.NODE_ENV !== environment && process.env.NODE_ENV !== 'production') {
    console.log(`⚠️  NODE_ENV is ${process.env.NODE_ENV}, expected ${environment}`);
  }

  console.log(`✅ Environment verified for ${environment}`);
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL?.substring(0, 50)}...`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
}

async function testConnection() {
  try {
    await prisma.$connect();
    const result = await prisma.$queryRaw`SELECT version()` as any[];
    console.log('✅ Database connection successful');
    console.log(`   PostgreSQL version: ${result[0]?.version?.split(' ')[1] || 'Unknown'}`);
  } catch (error) {
    throw new Error(`Database connection failed: ${error}`);
  }
}

async function checkMigrationStatus() {
  try {
    console.log('🔍 Checking migration status...');
    execSync('npx prisma migrate status', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('✅ Migration status checked');
  } catch (error) {
    console.log('⚠️  Migration status check failed - this may be normal for initial deployment');
  }
}

async function deployMigrations() {
  try {
    console.log('🚀 Deploying migrations...');
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('✅ Migrations deployed successfully');
  } catch (error) {
    throw new Error(`Migration deployment failed: ${error}`);
  }
}

async function generateClient() {
  try {
    console.log('🔨 Generating Prisma client...');
    execSync('npx prisma generate', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('✅ Prisma client generated successfully');
  } catch (error) {
    throw new Error(`Prisma client generation failed: ${error}`);
  }
}

async function verifyDeployment() {
  try {
    // Check if all expected tables exist
    const tables = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename != 'information_schema'
    ` as any[];

    const expectedTables = [
      'users',
      'cohorts',
      'enrollments',
      'consultation_requests',
      'payment_transactions',
      'privacy_consents',
      '_prisma_migrations'
    ];

    const existingTableNames = tables.map(t => t.tablename);
    const missingTables = expectedTables.filter(table =>
      table !== '_prisma_migrations' && !existingTableNames.includes(table)
    );

    if (missingTables.length > 0) {
      throw new Error(`Missing expected tables: ${missingTables.join(', ')}`);
    }

    console.log('✅ All expected tables exist');
    console.log(`   Found ${tables.length} tables: ${existingTableNames.join(', ')}`);

    // Test basic operations
    await prisma.user.findFirst();
    console.log('✅ Basic database operations working');

  } catch (error) {
    throw new Error(`Deployment verification failed: ${error}`);
  }
}

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database...');
    execSync('npm run db:seed', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('✅ Database seeded successfully');
  } catch (error) {
    console.log('⚠️  Seeding failed - this may be normal if data already exists');
    console.log(`   Error: ${error}`);
  }
}

async function generateStatusReport() {
  try {
    const userCount = await prisma.user.count();
    const cohortCount = await prisma.cohort.count();
    const enrollmentCount = await prisma.enrollment.count();
    const consultationCount = await prisma.consultationRequest.count();

    console.log('📊 Database Status Report:');
    console.log(`   👥 Users: ${userCount}`);
    console.log(`   🎓 Cohorts: ${cohortCount}`);
    console.log(`   📝 Enrollments: ${enrollmentCount}`);
    console.log(`   💬 Consultation Requests: ${consultationCount}`);

    // Check for any pending enrollments
    const pendingEnrollments = await prisma.enrollment.count({
      where: { status: 'PENDING_PAYMENT' }
    });

    if (pendingEnrollments > 0) {
      console.log(`   ⏳ Pending Payments: ${pendingEnrollments}`);
    }

    // Check current cohort capacity
    const openCohorts = await prisma.cohort.findMany({
      where: { status: 'OPEN_ENROLLMENT' }
    });

    for (const cohort of openCohorts) {
      const capacity = cohort.maxCapacity - cohort.currentEnrollment;
      console.log(`   🎓 ${cohort.name}: ${capacity} spots available`);
    }

  } catch (error) {
    console.log('⚠️  Could not generate status report:', error);
  }
}

function logNextSteps(environment: string) {
  console.log('\n📝 Next Steps:');

  if (environment === 'production') {
    console.log('   🚀 Production deployment complete!');
    console.log('   • Monitor application logs');
    console.log('   • Verify payment processing');
    console.log('   • Test user registration flow');
    console.log('   • Schedule backup verification');
  } else {
    console.log('   🧪 Staging deployment complete!');
    console.log('   • Run integration tests');
    console.log('   • Test enrollment workflow');
    console.log('   • Verify email notifications');
    console.log('   • Test payment processing');
  }

  console.log('   • Start backend: npm run start');
  console.log('   • Monitor with: npm run prisma:studio');
}

async function logTroubleshootingTips(error: any) {
  console.log('\n🔧 Troubleshooting Tips:');

  if (error.message?.includes('ECONNREFUSED')) {
    console.log('   • Database server may not be running');
    console.log('   • Check DATABASE_URL configuration');
    console.log('   • Verify network connectivity');
  } else if (error.message?.includes('authentication failed')) {
    console.log('   • Check database credentials');
    console.log('   • Verify user permissions');
    console.log('   • Check password/token validity');
  } else if (error.message?.includes('database') && error.message?.includes('does not exist')) {
    console.log('   • Create the database first');
    console.log('   • Check database name in connection string');
  } else if (error.message?.includes('migration')) {
    console.log('   • Check migration files exist');
    console.log('   • Verify schema.prisma is valid');
    console.log('   • Try: npx prisma migrate reset (dev only)');
  }

  console.log('   • Check logs for more details');
  console.log('   • Verify all environment variables are set');
  console.log('   • Contact development team if issues persist');
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const environment = (args[0] as 'staging' | 'production') || 'staging';
  const skipSeed = args.includes('--skip-seed');
  const dryRun = args.includes('--dry-run');

  if (!['staging', 'production'].includes(environment)) {
    console.error('❌ Invalid environment. Use: staging or production');
    process.exit(1);
  }

  await deployDatabase({ environment, skipSeed, dryRun });
}

// Self-executing function
if (require.main === module) {
  main()
    .catch((error) => {
      console.error('❌ Deployment failed:', error.message);
      process.exit(1);
    });
}

export { deployDatabase };