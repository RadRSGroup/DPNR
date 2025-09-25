/**
 * Enrollment API Integration Test
 * Tests the complete enrollment flow with database operations
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3001';

// Mock user data for testing
const mockUser = {
  cognitoId: 'test-user-enrollment-12345',
  email: 'enrollment-test@dpnr.example.com',
  firstName: 'Test',
  lastName: 'User',
  phone: '+972501234567'
};

const mockAdmin = {
  cognitoId: 'test-admin-enrollment-12345',
  email: 'admin-test@dpnr.example.com',
  firstName: 'Admin',
  lastName: 'User',
  phone: '+972501234568'
};

async function createTestData() {
  // Clean up existing test data
  await prisma.enrollment.deleteMany({
    where: {
      OR: [
        { user: { email: mockUser.email } },
        { user: { email: mockAdmin.email } }
      ]
    }
  });

  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: mockUser.email },
        { email: mockAdmin.email }
      ]
    }
  });

  await prisma.cohort.deleteMany({
    where: { name: 'Test Cohort for Enrollment' }
  });

  // Create test user
  const testUser = await prisma.user.create({
    data: {
      cognitoId: mockUser.cognitoId,
      email: mockUser.email,
      firstName: mockUser.firstName,
      lastName: mockUser.lastName,
      phone: mockUser.phone,
      preferredLanguage: 'HE',
      role: 'STUDENT',
      emailVerified: true,
      phoneVerified: false
    }
  });

  // Create test admin
  const testAdmin = await prisma.user.create({
    data: {
      cognitoId: mockAdmin.cognitoId,
      email: mockAdmin.email,
      firstName: mockAdmin.firstName,
      lastName: mockAdmin.lastName,
      phone: mockAdmin.phone,
      preferredLanguage: 'HE',
      role: 'ADMIN',
      emailVerified: true,
      phoneVerified: false
    }
  });

  // Create test cohort
  const testCohort = await prisma.cohort.create({
    data: {
      name: 'Test Cohort for Enrollment',
      startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 120 days from now
      maxCapacity: 20,
      currentEnrollment: 0,
      status: 'OPEN_ENROLLMENT',
      location: 'Test Location',
      schedule: 'Test Schedule'
    }
  });

  return { testUser, testAdmin, testCohort };
}

async function makeApiCall(
  path: string,
  method: string = 'GET',
  body?: any,
  cognitoId?: string
) {
  const headers: any = {
    'Content-Type': 'application/json'
  };

  // Add mock authorization for testing
  if (cognitoId) {
    headers.Authorization = `Bearer mock-token-${cognitoId}`;
  }

  const config: any = {
    method,
    headers
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, config);
  const data = await response.json();

  return { status: response.status, data };
}

async function testEnrollmentIntegration() {
  console.log('🔄 Starting Enrollment API Integration Test...\n');

  try {
    // Setup test data
    console.log('📝 Setting up test data...');
    const { testUser, testAdmin, testCohort } = await createTestData();
    console.log('✅ Test data created successfully\n');

    // Test 1: Create Enrollment (without auth - should fail)
    console.log('1️⃣ Testing enrollment creation without authentication...');
    const noAuthResult = await makeApiCall('/v1/enrollments', 'POST', {
      cohortId: testCohort.id,
      paymentPlan: 'FULL',
      questionnaire: {
        motivation: 'Personal growth and development',
        previousExperience: false,
        expectations: 'Learn new communication skills',
        referralSource: 'Website',
        specialNeeds: '',
        agreedToTerms: true,
        agreedToPrivacy: true,
        marketingConsent: true,
        submittedAt: new Date()
      }
    });

    if (noAuthResult.status === 401) {
      console.log('✅ Authentication required - correctly rejected unauthorized request\n');
    } else {
      throw new Error(`Expected 401, got ${noAuthResult.status}`);
    }

    // Test 2: Create Enrollment (with auth - should succeed)
    console.log('2️⃣ Testing enrollment creation with authentication...');
    const enrollmentData = {
      cohortId: testCohort.id,
      paymentPlan: 'FULL',
      questionnaire: {
        motivation: 'Personal growth and development',
        previousExperience: false,
        expectations: 'Learn new communication skills',
        referralSource: 'Website',
        specialNeeds: '',
        agreedToTerms: true,
        agreedToPrivacy: true,
        marketingConsent: true,
        submittedAt: new Date()
      }
    };

    const createResult = await makeApiCall('/v1/enrollments', 'POST', enrollmentData, testUser.cognitoId);

    if (createResult.status === 201 && createResult.data.success) {
      console.log('✅ Enrollment created successfully:', {
        id: createResult.data.data.id,
        status: createResult.data.data.status,
        paymentPlan: createResult.data.data.paymentPlan,
        totalAmount: createResult.data.data.totalAmount
      });
    } else {
      console.log('❌ Enrollment creation failed:', createResult);
      throw new Error('Enrollment creation failed');
    }
    console.log('');

    const enrollmentId = createResult.data.data.id;

    // Test 3: Get User's Enrollments
    console.log('3️⃣ Testing get user enrollments...');
    const myEnrollmentsResult = await makeApiCall('/v1/enrollments/my', 'GET', undefined, testUser.cognitoId);

    if (myEnrollmentsResult.status === 200 && myEnrollmentsResult.data.success) {
      console.log('✅ User enrollments retrieved:', {
        count: myEnrollmentsResult.data.data.length,
        enrollments: myEnrollmentsResult.data.data.map((e: any) => ({
          id: e.id,
          status: e.status,
          cohortName: e.cohort.name,
          remainingAmount: e.remainingAmount
        }))
      });
    } else {
      throw new Error('Failed to get user enrollments');
    }
    console.log('');

    // Test 4: Get Specific Enrollment
    console.log('4️⃣ Testing get specific enrollment...');
    const getEnrollmentResult = await makeApiCall(`/v1/enrollments/${enrollmentId}`, 'GET', undefined, testUser.cognitoId);

    if (getEnrollmentResult.status === 200 && getEnrollmentResult.data.success) {
      console.log('✅ Enrollment details retrieved:', {
        id: getEnrollmentResult.data.data.id,
        status: getEnrollmentResult.data.data.status,
        user: getEnrollmentResult.data.data.user.email,
        cohort: getEnrollmentResult.data.data.cohort.name,
        questionnaire: Object.keys(getEnrollmentResult.data.data.questionnaire)
      });
    } else {
      throw new Error('Failed to get enrollment details');
    }
    console.log('');

    // Test 5: Update Enrollment Questionnaire
    console.log('5️⃣ Testing enrollment update...');
    const updateData = {
      questionnaire: {
        motivation: 'Updated motivation: Personal and professional growth',
        previousExperience: true,
        expectations: 'Updated expectations: Master communication and leadership skills',
        referralSource: 'Friend recommendation',
        specialNeeds: 'None',
        agreedToTerms: true,
        agreedToPrivacy: true,
        marketingConsent: false,
        submittedAt: new Date()
      }
    };

    const updateResult = await makeApiCall(`/v1/enrollments/${enrollmentId}`, 'PATCH', updateData, testUser.cognitoId);

    if (updateResult.status === 200 && updateResult.data.success) {
      console.log('✅ Enrollment updated successfully:', {
        id: updateResult.data.data.id,
        updatedQuestionnaire: updateResult.data.data.questionnaire.motivation.substring(0, 50) + '...'
      });
    } else {
      throw new Error('Failed to update enrollment');
    }
    console.log('');

    // Test 6: Process Payment
    console.log('6️⃣ Testing payment processing...');
    const paymentData = {
      amount: 6400,
      paymentMethod: 'credit_card',
      tranzillaReference: 'test-tranzilla-ref-12345'
    };

    const paymentResult = await makeApiCall(`/v1/enrollments/${enrollmentId}/payment`, 'POST', paymentData, testUser.cognitoId);

    if (paymentResult.status === 200 && paymentResult.data.success) {
      console.log('✅ Payment processed successfully:', {
        enrollmentId: paymentResult.data.data.enrollment.id,
        status: paymentResult.data.data.enrollment.status,
        paymentProcessed: paymentResult.data.data.paymentProcessed,
        isFullyPaid: paymentResult.data.data.isFullyPaid,
        remainingAmount: paymentResult.data.data.remainingAmount
      });
    } else {
      console.log('❌ Payment processing failed:', paymentResult);
      throw new Error('Payment processing failed');
    }
    console.log('');

    // Test 7: Admin Statistics (should fail for regular user)
    console.log('7️⃣ Testing admin statistics access (should fail for regular user)...');
    const statsFailResult = await makeApiCall('/v1/enrollments/statistics', 'GET', undefined, testUser.cognitoId);

    if (statsFailResult.status === 403) {
      console.log('✅ Admin access properly restricted for regular user\n');
    } else {
      throw new Error(`Expected 403 for regular user, got ${statsFailResult.status}`);
    }

    // Test 8: Admin Statistics (should succeed for admin)
    console.log('8️⃣ Testing admin statistics access (should succeed for admin)...');
    const statsResult = await makeApiCall('/v1/enrollments/statistics', 'GET', undefined, testAdmin.cognitoId);

    if (statsResult.status === 200 && statsResult.data.success) {
      console.log('✅ Admin statistics retrieved:', {
        totalEnrollments: statsResult.data.data.totalEnrollments,
        activeEnrollments: statsResult.data.data.activeEnrollments,
        pendingPayments: statsResult.data.data.pendingPayments,
        completedEnrollments: statsResult.data.data.completedEnrollments,
        cancelledEnrollments: statsResult.data.data.cancelledEnrollments
      });
    } else {
      throw new Error('Failed to get admin statistics');
    }
    console.log('');

    // Test 9: Cancel Enrollment
    console.log('9️⃣ Testing enrollment cancellation...');
    const cancelResult = await makeApiCall(`/v1/enrollments/${enrollmentId}`, 'DELETE', undefined, testUser.cognitoId);

    if (cancelResult.status === 200 && cancelResult.data.success) {
      console.log('✅ Enrollment cancelled successfully:', {
        id: cancelResult.data.data.id,
        status: cancelResult.data.data.status
      });
    } else {
      throw new Error('Failed to cancel enrollment');
    }
    console.log('');

    // Test 10: Unauthorized Access (try to access other user's enrollment)
    console.log('🔟 Testing unauthorized access protection...');

    // Create another test user and enrollment
    const otherUser = await prisma.user.create({
      data: {
        cognitoId: 'other-test-user-12345',
        email: 'other-test@dpnr.example.com',
        firstName: 'Other',
        lastName: 'User',
        phone: '+972501234569',
        preferredLanguage: 'HE',
        role: 'STUDENT',
        emailVerified: true,
        phoneVerified: false
      }
    });

    const otherEnrollment = await prisma.enrollment.create({
      data: {
        userId: otherUser.id,
        cohortId: testCohort.id,
        paymentPlan: 'FIVE_INSTALLMENTS',
        totalAmount: 6800,
        status: 'PENDING_PAYMENT',
        questionnaire: {
          motivation: 'Test motivation',
          previousExperience: false,
          expectations: 'Test expectations',
          agreedToTerms: true,
          agreedToPrivacy: true,
          marketingConsent: true,
          submittedAt: new Date()
        }
      }
    });

    const unauthorizedResult = await makeApiCall(`/v1/enrollments/${otherEnrollment.id}`, 'GET', undefined, testUser.cognitoId);

    if (unauthorizedResult.status === 403) {
      console.log('✅ Unauthorized access properly blocked\n');
    } else {
      throw new Error(`Expected 403 for unauthorized access, got ${unauthorizedResult.status}`);
    }

    console.log('🎉 All Enrollment API Integration Tests Passed!');
    console.log('📝 Enrollment endpoints properly integrated with authentication and database');
    console.log('🔒 Access controls working correctly');
    console.log('💳 Payment processing functionality validated');
    console.log('👥 Admin vs student permissions properly enforced');

  } catch (error) {
    console.error('❌ Enrollment API Integration Test Failed:', error);

    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }

    process.exit(1);
  } finally {
    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...');

    await prisma.enrollment.deleteMany({
      where: {
        OR: [
          { user: { email: mockUser.email } },
          { user: { email: mockAdmin.email } },
          { user: { email: 'other-test@dpnr.example.com' } }
        ]
      }
    });

    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: mockUser.email },
          { email: mockAdmin.email },
          { email: 'other-test@dpnr.example.com' }
        ]
      }
    });

    await prisma.cohort.deleteMany({
      where: { name: 'Test Cohort for Enrollment' }
    });

    await prisma.$disconnect();
    console.log('✅ Cleanup completed\n');
  }
}

// Run the test
if (require.main === module) {
  testEnrollmentIntegration().catch(console.error);
}

export { testEnrollmentIntegration };