/**
 * End-to-End Authentication Database Integration Test
 * Tests the complete authentication flow with database operations
 */

import { PrismaClient } from '@prisma/client';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

// Mock Cognito token for testing
const mockCognitoUser = {
  sub: 'test-cognito-user-12345',
  email: 'test@dpnr.example.com',
  name: 'Test User',
  phone_number: '+972501234567',
  'cognito:groups': ['standard_users']
};

async function testAuthDatabaseIntegration() {
  console.log('🔄 Starting Authentication Database Integration Test...\n');

  try {
    // Test 1: Database Connection Health
    console.log('1️⃣ Testing Database Connection Health...');
    await prisma.$connect();
    console.log('✅ Database connection established successfully\n');

    // Test 2: User Creation from Authentication
    console.log('2️⃣ Testing User Creation from Authentication...');

    // First, clean up any existing test user
    await prisma.user.deleteMany({
      where: { email: mockCognitoUser.email }
    });

    // Create user as would happen during first login
    const newUser = await prisma.user.create({
      data: {
        cognitoId: mockCognitoUser.sub,
        email: mockCognitoUser.email,
        firstName: mockCognitoUser.name.split(' ')[0],
        lastName: mockCognitoUser.name.split(' ')[1] || '',
        phone: mockCognitoUser.phone_number,
        preferredLanguage: 'HE', // Use enum value
        role: 'STUDENT',
        emailVerified: true,
        phoneVerified: false
      }
    });

    console.log('✅ User created successfully:', {
      id: newUser.id,
      cognitoId: newUser.cognitoId,
      email: newUser.email,
      status: newUser.status
    });
    console.log('');

    // Test 3: User Retrieval by Cognito ID (as middleware would do)
    console.log('3️⃣ Testing User Retrieval by Cognito ID...');
    const retrievedUser = await prisma.user.findUnique({
      where: { cognitoId: mockCognitoUser.sub }
    });

    if (!retrievedUser) {
      throw new Error('User not found by Cognito ID');
    }

    console.log('✅ User retrieved successfully:', {
      id: retrievedUser.id,
      email: retrievedUser.email,
      cognitoId: retrievedUser.cognitoId
    });
    console.log('');

    // Test 4: Authentication Flow Simulation (without sessions)
    console.log('4️⃣ Testing Authentication Flow Simulation...');

    // Simulate what happens in auth middleware - just user lookup
    const authFlowUser = await prisma.user.findUnique({
      where: { cognitoId: mockCognitoUser.sub },
      include: {
        enrollments: {
          include: {
            cohort: true,
            paymentTransactions: true
          }
        },
        consultationRequests: true,
        privacyConsents: true
      }
    });

    if (!authFlowUser) {
      throw new Error('Authentication flow failed - user not found');
    }

    console.log('✅ Authentication flow successful:', {
      userId: authFlowUser.id,
      email: authFlowUser.email,
      enrollments: authFlowUser.enrollments.length,
      consultationRequests: authFlowUser.consultationRequests.length,
      privacyConsents: authFlowUser.privacyConsents.length
    });
    console.log('');

    // Test 5: User Profile Update (as would happen in protected routes)
    console.log('5️⃣ Testing User Profile Update...');
    const updatedUser = await prisma.user.update({
      where: { id: retrievedUser.id },
      data: {
        lastLoginAt: new Date()
      }
    });

    console.log('✅ User profile updated successfully:', {
      id: updatedUser.id,
      lastLoginAt: updatedUser.lastLoginAt,
      updatedAt: updatedUser.updatedAt
    });
    console.log('');

    // Test 6: Related Data Access (enrollment check)
    console.log('6️⃣ Testing Related Data Access (Enrollment Check)...');

    // Get current cohort
    const currentCohort = await prisma.cohort.findFirst({
      where: { status: 'UPCOMING' },
      orderBy: { startDate: 'asc' }
    });

    if (currentCohort) {
      // Check if user has enrollment
      const userEnrollments = await prisma.enrollment.findMany({
        where: {
          userId: retrievedUser.id,
          cohortId: currentCohort.id
        },
        include: {
          cohort: true,
          paymentTransactions: true
        }
      });

      console.log('✅ Enrollment check completed:', {
        cohortId: currentCohort.id,
        cohortName: currentCohort.name,
        userEnrollments: userEnrollments.length,
        enrollmentData: userEnrollments.map(e => ({
          id: e.id,
          status: e.status,
          paymentCount: e.paymentTransactions.length
        }))
      });
    } else {
      console.log('ℹ️ No current cohort found for enrollment testing');
    }
    console.log('');

    // Test 7: Cleanup
    console.log('7️⃣ Testing Data Cleanup...');

    // Clean up test user
    await prisma.user.delete({
      where: { id: retrievedUser.id }
    });

    console.log('✅ Data cleanup completed successfully\n');

    // Test 8: Performance Check
    console.log('8️⃣ Testing Database Performance...');
    const startTime = Date.now();

    const performanceQueries = await Promise.all([
      prisma.user.count(),
      prisma.cohort.count(),
      prisma.enrollment.count(),
      prisma.paymentTransaction.count(),
      prisma.consultationRequest.count(),
      prisma.privacyConsent.count()
    ]);

    const endTime = Date.now();
    const queryTime = endTime - startTime;

    console.log('✅ Performance check completed:', {
      queryTime: `${queryTime}ms`,
      tableStats: {
        users: performanceQueries[0],
        cohorts: performanceQueries[1],
        enrollments: performanceQueries[2],
        paymentTransactions: performanceQueries[3],
        consultationRequests: performanceQueries[4],
        privacyConsents: performanceQueries[5]
      }
    });
    console.log('');

    console.log('🎉 All Authentication Database Integration Tests Passed!');
    console.log('🔒 Authentication system properly integrated with database');
    console.log('📊 User management and related data access working correctly');

  } catch (error) {
    console.error('❌ Authentication Database Integration Test Failed:', error);

    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testAuthDatabaseIntegration().catch(console.error);
}

export { testAuthDatabaseIntegration };