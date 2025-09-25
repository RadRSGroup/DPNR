/**
 * Cohort API Integration Tests
 * Tests the cohort management endpoints with real database operations
 */

import { CohortModel } from './models/cohort.model';
import { CohortStatus } from '@prisma/client';
import prisma from './database/connection';

async function testCohortOperations() {
  console.log('🧪 Starting Cohort API Integration Tests...\n');

  try {
    // Test 1: Create a new cohort
    console.log('1. Testing cohort creation...');
    const futureStartDate = new Date();
    futureStartDate.setMonth(futureStartDate.getMonth() + 2); // 2 months from now
    const futureEndDate = new Date(futureStartDate);
    futureEndDate.setMonth(futureEndDate.getMonth() + 2); // 4 months from now

    const testCohort = await CohortModel.create({
      name: `Test Cohort ${Date.now()}`, // Unique name
      startDate: futureStartDate,
      endDate: futureEndDate,
      maxCapacity: 20,
      location: 'Mazkeret Batya',
      schedule: 'Weekly evenings, 1.5-2 hours'
    });
    console.log('✅ Cohort created:', {
      id: testCohort.id,
      name: testCohort.name,
      status: testCohort.status,
      capacity: testCohort.maxCapacity
    });

    // Test 2: Get cohort by ID
    console.log('\n2. Testing get cohort by ID...');
    const foundCohort = await CohortModel.findById(testCohort.id);
    console.log('✅ Cohort found:', {
      id: foundCohort?.id,
      name: foundCohort?.name,
      status: foundCohort?.status
    });

    // Test 3: Update cohort
    console.log('\n3. Testing cohort update...');
    const updatedCohort = await CohortModel.update(testCohort.id, {
      maxCapacity: 25,
      location: 'Tel Aviv'
    });
    console.log('✅ Cohort updated:', {
      id: updatedCohort.id,
      capacity: updatedCohort.maxCapacity,
      location: updatedCohort.location
    });

    // Test 4: Update status
    console.log('\n4. Testing status update...');
    const statusUpdatedCohort = await CohortModel.updateStatus(testCohort.id, CohortStatus.OPEN_ENROLLMENT);
    console.log('✅ Status updated:', {
      id: statusUpdatedCohort.id,
      status: statusUpdatedCohort.status
    });

    // Test 5: Get current cohort
    console.log('\n5. Testing get current cohort...');
    const currentCohort = await CohortModel.getCurrentCohort();
    console.log('✅ Current cohort:', {
      id: currentCohort?.id,
      name: currentCohort?.name,
      status: currentCohort?.status
    });

    // Test 6: Get capacity info
    console.log('\n6. Testing capacity info...');
    const capacityInfo = await CohortModel.getCapacityInfo(testCohort.id);
    console.log('✅ Capacity info:', capacityInfo);

    // Test 7: Get statistics
    console.log('\n7. Testing statistics...');
    const statistics = await CohortModel.getStatistics(testCohort.id);
    console.log('✅ Cohort statistics:', statistics);

    // Test 8: Get all cohorts
    console.log('\n8. Testing get all cohorts...');
    const allCohorts = await CohortModel.findAll();
    console.log('✅ Total cohorts found:', allCohorts.length);

    // Test 9: Check enrollment availability
    console.log('\n9. Testing enrollment availability...');
    const canEnroll = await CohortModel.canAcceptEnrollments(testCohort.id);
    console.log('✅ Can accept enrollments:', canEnroll);

    // Test 10: Update enrollment count
    console.log('\n10. Testing enrollment count update...');
    await CohortModel.updateEnrollmentCount(testCohort.id, true);
    const updatedCapacity = await CohortModel.getCapacityInfo(testCohort.id);
    console.log('✅ Enrollment count updated:', {
      enrolled: updatedCapacity.enrolled,
      available: updatedCapacity.available
    });

    // Test 11: Get cohorts needing attention
    console.log('\n11. Testing cohorts needing attention...');
    const needAttention = await CohortModel.getCohortsNeedingAttention();
    console.log('✅ Cohorts needing attention:', {
      startingSoon: needAttention.startingSoon.length,
      underEnrolled: needAttention.underEnrolled.length,
      needsStatusUpdate: needAttention.needsStatusUpdate.length
    });

    // Test 12: Cleanup - Delete test cohort
    console.log('\n12. Testing cohort deletion...');
    await CohortModel.delete(testCohort.id);
    console.log('✅ Test cohort deleted successfully');

    console.log('\n🎉 All cohort integration tests passed!');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testCohortOperations();
}

export { testCohortOperations };