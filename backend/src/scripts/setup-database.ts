import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function setupDatabase() {
  console.log('🔧 Setting up DPNR database...');

  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Check if any tables exist
    const tables = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename != 'information_schema'
    `;

    const tableCount = Array.isArray(tables) ? tables.length : 0;
    console.log(`📊 Found ${tableCount} existing tables`);

    if (tableCount === 0) {
      console.log('🏗️  No tables found, running migrations...');

      // Create and apply migrations
      try {
        execSync('npx prisma migrate dev --name init', {
          stdio: 'inherit',
          cwd: process.cwd()
        });
        console.log('✅ Database migrations applied successfully');
      } catch (migrationError) {
        console.log('⚠️  Migration failed, attempting to push schema...');
        execSync('npx prisma db push', {
          stdio: 'inherit',
          cwd: process.cwd()
        });
        console.log('✅ Database schema pushed successfully');
      }
    } else {
      console.log('📋 Tables exist, checking schema sync...');

      // Check if schema is in sync
      try {
        execSync('npx prisma migrate status', {
          stdio: 'inherit',
          cwd: process.cwd()
        });
      } catch (statusError) {
        console.log('⚠️  Schema may be out of sync, consider running: npm run prisma:migrate');
      }
    }

    // Generate Prisma client
    console.log('🔨 Generating Prisma client...');
    execSync('npx prisma generate', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('✅ Prisma client generated');

    // Check if database has seed data
    const userCount = await prisma.user.count();
    const cohortCount = await prisma.cohort.count();

    console.log(`📊 Current data: ${userCount} users, ${cohortCount} cohorts`);

    if (userCount === 0 && cohortCount === 0) {
      console.log('🌱 No data found, would you like to seed the database?');
      console.log('   Run: npm run db:seed');
    } else {
      console.log('✅ Database contains data');
    }

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   • Start the backend: npm run dev');
    console.log('   • View database: npm run prisma:studio');
    console.log('   • Seed data (if needed): npm run db:seed');

  } catch (error) {
    console.error('❌ Database setup failed:', error);

    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.log('\n💡 Troubleshooting tips:');
        console.log('   • Make sure PostgreSQL is running');
        console.log('   • Check DATABASE_URL in .env file');
        console.log('   • Verify database credentials');
        console.log('   • Create database if it doesn\'t exist');
      } else if (error.message.includes('database') && error.message.includes('does not exist')) {
        console.log('\n💡 Database does not exist. Please:');
        console.log('   1. Connect to PostgreSQL as superuser');
        console.log('   2. Create database: CREATE DATABASE dpnr_dev;');
        console.log('   3. Create user if needed: CREATE USER username WITH PASSWORD \'password\';');
        console.log('   4. Grant permissions: GRANT ALL PRIVILEGES ON DATABASE dpnr_dev TO username;');
      }
    }

    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Self-executing function
if (require.main === module) {
  setupDatabase()
    .catch((error) => {
      console.error('Setup failed:', error.message);
      process.exit(1);
    });
}

export { setupDatabase };