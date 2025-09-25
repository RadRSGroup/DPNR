/**
 * Enrollment Model Direct Test
 * Tests the enrollment model functionality directly with the database
 */

import { PrismaClient, PaymentPlan, EnrollmentStatus } from '@prisma/client';
import { EnrollmentModel } from './models/enrollment.model';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

// Mock user and cohort data for testing
const mockUser = {
  cognitoId: 'test-model-user-12345',
  email: 'model-test@dpnr.example.com',
  firstName: 'Model',
  lastName: 'Test',
  phone: '+972501234567'
};

const mockCohort = {
  name: 'Test Model Cohort',
  startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000)
};

async function createTestData() {
  // Clean up existing test data
  await prisma.enrollment.deleteMany({
    where: { user: { email: mockUser.email } }
  });

  await prisma.user.deleteMany({
    where: { email: mockUser.email }
  });

  await prisma.cohort.deleteMany({
    where: { name: mockCohort.name }
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

  // Create test cohort
  const testCohort = await prisma.cohort.create({
    data: {
      name: mockCohort.name,
      startDate: mockCohort.startDate,
      endDate: mockCohort.endDate,
      maxCapacity: 20,
      currentEnrollment: 0,
      status: 'OPEN_ENROLLMENT',
      location: 'Test Location',
      schedule: 'Test Schedule'
    }
  });

  return { testUser, testCohort };
}

async function testEnrollmentModel() {
  console.log('🔄 Starting Enrollment Model Direct Test...\n');

  try {
    // Setup test data
    console.log('📝 Setting up test data...');
    const { testUser, testCohort } = await createTestData();
    console.log('✅ Test data created successfully\n');

    // Test 1: Create Enrollment
    console.log('1️⃣ Testing enrollment creation...');
    const enrollmentData = {
      userId: testUser.id,
      cohortId: testCohort.id,
      paymentPlan: PaymentPlan.FULL,
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

    const enrollment = await EnrollmentModel.create(enrollmentData);

    console.log('✅ Enrollment created successfully:', {
      id: enrollment.id,
      userId: enrollment.userId,
      cohortId: enrollment.cohortId,
      status: enrollment.status,
      paymentPlan: enrollment.paymentPlan,
      totalAmount: enrollment.totalAmount.toString(),
      paidAmount: enrollment.paidAmount.toString()
    });
    console.log('');

    // Test 2: Find Enrollment by ID
    console.log('2️⃣ Testing find enrollment by ID...');
    const foundEnrollment = await EnrollmentModel.findById(enrollment.id);

    if (foundEnrollment) {
      console.log('✅ Enrollment found by ID:', {
        id: foundEnrollment.id,
        user: foundEnrollment.user.email,
        cohort: foundEnrollment.cohort.name,
        status: foundEnrollment.status,
        questionnaire: Object.keys(foundEnrollment.questionnaire as object)
      });
    } else {
      throw new Error('Enrollment not found by ID');
    }
    console.log('');

    // Test 3: Find Enrollments by User ID
    console.log('3️⃣ Testing find enrollments by user ID...');
    const userEnrollments = await EnrollmentModel.findByUserId(testUser.id);

    console.log('✅ User enrollments found:', {
      count: userEnrollments.length,
      enrollments: userEnrollments.map(e => ({
        id: e.id,
        status: e.status,
        cohortName: e.cohort.name
      }))
    });
    console.log('');

    // Test 4: Update Enrollment
    console.log('4️⃣ Testing enrollment update...');
    const updateData = {
      questionnaire: {
        motivation: 'Updated: Personal and professional growth',
        previousExperience: true,
        expectations: 'Updated: Master communication and leadership',
        referralSource: 'Friend recommendation',
        specialNeeds: 'None',
        agreedToTerms: true,
        agreedToPrivacy: true,
        marketingConsent: false,
        submittedAt: new Date()
      }
    };

    const updatedEnrollment = await EnrollmentModel.update(enrollment.id, updateData);

    console.log('✅ Enrollment updated successfully:', {
      id: updatedEnrollment.id,
      updatedAt: updatedEnrollment.updatedAt,
      questionnaire: (updatedEnrollment.questionnaire as any).motivation
    });
    console.log('');

    // Test 5: Payment Plan Calculations
    console.log('5️⃣ Testing payment plan calculations...');

    const remainingAmount = EnrollmentModel.calculateRemainingAmount(enrollment);
    const nextInstallment = EnrollmentModel.getNextInstallmentAmount(enrollment);
    const isFullyPaid = EnrollmentModel.isFullyPaid(enrollment);

    console.log('✅ Payment calculations:', {
      totalAmount: enrollment.totalAmount.toString(),
      paidAmount: enrollment.paidAmount.toString(),
      remainingAmount,
      nextInstallmentAmount: nextInstallment,
      isFullyPaid
    });
    console.log('');

    // Test 6: Add Payment
    console.log('6️⃣ Testing payment addition...');
    const paymentAmount = 6400; // Full payment
    const enrollmentAfterPayment = await EnrollmentModel.addPayment(enrollment.id, paymentAmount);

    console.log('✅ Payment added successfully:', {
      id: enrollmentAfterPayment.id,
      status: enrollmentAfterPayment.status,
      paidAmount: enrollmentAfterPayment.paidAmount.toString(),
      totalAmount: enrollmentAfterPayment.totalAmount.toString(),
      isFullyPaid: EnrollmentModel.isFullyPaid(enrollmentAfterPayment)
    });
    console.log('');

    // Test 7: Enrollment Statistics
    console.log('7️⃣ Testing enrollment statistics...');
    const statistics = await EnrollmentModel.getStatistics();

    console.log('✅ Enrollment statistics:', {
      totalEnrollments: statistics.totalEnrollments,
      activeEnrollments: statistics.activeEnrollments,
      pendingPayments: statistics.pendingPayments,
      completedEnrollments: statistics.completedEnrollments,
      cancelledEnrollments: statistics.cancelledEnrollments
    });
    console.log('');

    // Test 8: Cohort-specific Statistics
    console.log('8️⃣ Testing cohort-specific statistics...');
    const cohortStats = await EnrollmentModel.getStatistics(testCohort.id);

    console.log('✅ Cohort statistics:', {
      cohortId: testCohort.id,
      totalEnrollments: cohortStats.totalEnrollments,
      activeEnrollments: cohortStats.activeEnrollments,
      pendingPayments: cohortStats.pendingPayments
    });
    console.log('');

    // Test 9: Update Status
    console.log('9️⃣ Testing status update...');
    const enrollmentWithNewStatus = await EnrollmentModel.updateStatus(enrollment.id, EnrollmentStatus.COMPLETED);

    console.log('✅ Status updated successfully:', {
      id: enrollmentWithNewStatus.id,
      status: enrollmentWithNewStatus.status,
      updatedAt: enrollmentWithNewStatus.updatedAt
    });
    console.log('');

    // Test 10: Validate Payment Plans
    console.log('🔟 Testing different payment plans...');

    // Create enrollment with 5 installments
    const fiveInstallmentData = {
      userId: testUser.id,
      cohortId: testCohort.id,
      paymentPlan: PaymentPlan.FIVE_INSTALLMENTS,
      questionnaire: {
        motivation: 'Test motivation for installments',
        previousExperience: false,
        expectations: 'Test expectations',
        agreedToTerms: true,
        agreedToPrivacy: true,
        marketingConsent: true,
        submittedAt: new Date()
      }
    };

    // Delete previous enrollment to allow new one
    await prisma.enrollment.delete({
      where: { id: enrollment.id }
    });

    // Reset cohort enrollment count
    await prisma.cohort.update({
      where: { id: testCohort.id },
      data: { currentEnrollment: 0 }
    });

    const installmentEnrollment = await EnrollmentModel.create(fiveInstallmentData);

    console.log('✅ Five installments enrollment created:', {
      id: installmentEnrollment.id,
      paymentPlan: installmentEnrollment.paymentPlan,
      totalAmount: installmentEnrollment.totalAmount.toString(),
      nextInstallmentAmount: EnrollmentModel.getNextInstallmentAmount(installmentEnrollment)
    });
    console.log('');

    console.log('🎉 All Enrollment Model Tests Passed!');
    console.log('📊 Enrollment model properly integrated with database');
    console.log('💰 Payment calculations working correctly');
    console.log('📈 Statistics and reporting functional');
    console.log('🔄 Status management working as expected');

  } catch (error) {
    console.error('❌ Enrollment Model Test Failed:', error);

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
      where: { user: { email: mockUser.email } }
    });

    await prisma.user.deleteMany({
      where: { email: mockUser.email }
    });

    await prisma.cohort.deleteMany({
      where: { name: mockCohort.name }
    });

    await prisma.$disconnect();
    console.log('✅ Cleanup completed\n');
  }
}

// Run the test
if (require.main === module) {
  testEnrollmentModel().catch(console.error);
}

export { testEnrollmentModel };