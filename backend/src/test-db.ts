import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDatabaseConnection() {
  try {
    console.log('🔍 Testing database connection...');

    // Test connection
    await prisma.$connect();
    console.log('✅ Successfully connected to database');

    // Check tables
    const userCount = await prisma.user.count();
    const cohortCount = await prisma.cohort.count();

    console.log(`📊 Database status:`);
    console.log(`   - Users table: ${userCount} records`);
    console.log(`   - Cohorts table: ${cohortCount} records`);

    // Create a test cohort
    const testCohort = await prisma.cohort.create({
      data: {
        name: 'Test Cohort 2025',
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-06-01'),
        maxCapacity: 20,
        status: 'UPCOMING',
        location: 'Mazkeret Batya',
        schedule: 'Weekly evenings, 1.5-2 hours'
      }
    });

    console.log('✅ Successfully created test cohort:', testCohort.name);

    // List all cohorts
    const allCohorts = await prisma.cohort.findMany();
    console.log(`📋 Total cohorts in database: ${allCohorts.length}`);

  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Disconnected from database');
  }
}

testDatabaseConnection();