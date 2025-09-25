#!/usr/bin/env node

// DPNR Database Connection Test
// This script tests the database connection without making any changes

const { PrismaClient } = require('@prisma/client');

async function testConnection() {
    console.log('🔌 Testing database connection...');

    const prisma = new PrismaClient({
        log: ['error'],
        errorFormat: 'minimal'
    });

    try {
        // Simple connection test
        console.log('📡 Connecting to database...');
        await prisma.$connect();
        console.log('✅ Database connection successful!');

        // Test a simple query
        console.log('🔍 Testing query execution...');
        const result = await prisma.$queryRaw`SELECT version() as version, current_database() as database, current_user as user`;

        if (result && result.length > 0) {
            console.log('✅ Query execution successful!');
            console.log(`📊 Database info:`);
            console.log(`   Version: ${result[0].version.split(' ')[0]} ${result[0].version.split(' ')[1]}`);
            console.log(`   Database: ${result[0].database}`);
            console.log(`   User: ${result[0].user}`);
        }

        // Test if schema exists (without creating it)
        try {
            await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 1`;
            console.log('✅ Database schema accessible');
        } catch (error) {
            console.log('ℹ️  Database schema not yet deployed (this is expected for new databases)');
        }

    } catch (error) {
        console.error('❌ Database connection failed:');

        if (error.code === 'P1001') {
            console.error('   Connection timeout - check your connection string and network');
        } else if (error.code === 'P1000') {
            console.error('   Authentication failed - check your username and password');
        } else if (error.message.includes('ENOTFOUND')) {
            console.error('   Host not found - check your hostname in DATABASE_URL');
        } else if (error.message.includes('ECONNREFUSED')) {
            console.error('   Connection refused - check port and firewall settings');
        } else {
            console.error(`   ${error.message}`);
        }

        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }

    console.log('🎉 Connection test completed successfully!');
}

// Handle command line usage
if (require.main === module) {
    console.log('🧪 DPNR Database Connection Test');
    console.log('=================================');

    testConnection().catch((error) => {
        console.error('💥 Unexpected error:', error);
        process.exit(1);
    });
}

module.exports = { testConnection };