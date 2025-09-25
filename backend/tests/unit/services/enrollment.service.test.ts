import { EnrollmentService } from '../../../src/services/enrollment.service';
import { testDb, createTestUser, createTestCohort } from '../../setup';

describe('EnrollmentService', () => {
  let enrollmentService: EnrollmentService;
  let testUser: any;
  let testCohort: any;

  beforeEach(async () => {
    enrollmentService = new EnrollmentService();
    testUser = await createTestUser();
    testCohort = await createTestCohort();
  });

  describe('createEnrollment', () => {
    it('should create enrollment with full payment plan', async () => {
      const enrollmentData = {
        userId: testUser.id,
        cohortId: testCohort.id,
        paymentPlan: 'full' as const,
        personalInfo: {
          phone: '+972501234567',
          emergencyContact: 'John Doe',
          emergencyPhone: '+972501234568'
        },
        questionnaire: {
          motivation: 'Personal growth',
          experience: 'Beginner',
          goals: 'Better communication'
        }
      };

      const enrollment = await enrollmentService.createEnrollment(enrollmentData);

      expect(enrollment).toHaveProperty('id');
      expect(enrollment.userId).toBe(testUser.id);
      expect(enrollment.cohortId).toBe(testCohort.id);
      expect(enrollment.paymentPlan).toBe('full');
      expect(enrollment.status).toBe('pending');
      expect(enrollment.personalInfo).toEqual(enrollmentData.personalInfo);
      expect(enrollment.questionnaire).toEqual(enrollmentData.questionnaire);
    });

    it('should create enrollment with 5 installments plan', async () => {
      const enrollmentData = {
        userId: testUser.id,
        cohortId: testCohort.id,
        paymentPlan: '5_installments' as const,
        personalInfo: {
          phone: '+972501234567',
          emergencyContact: 'John Doe',
          emergencyPhone: '+972501234568'
        },
        questionnaire: {
          motivation: 'Career advancement',
          experience: 'Intermediate',
          goals: 'Leadership skills'
        }
      };

      const enrollment = await enrollmentService.createEnrollment(enrollmentData);

      expect(enrollment.paymentPlan).toBe('5_installments');
      expect(enrollment.status).toBe('pending');
    });

    it('should create enrollment with 12 installments plan', async () => {
      const enrollmentData = {
        userId: testUser.id,
        cohortId: testCohort.id,
        paymentPlan: '12_installments' as const,
        personalInfo: {
          phone: '+972501234567',
          emergencyContact: 'John Doe',
          emergencyPhone: '+972501234568'
        },
        questionnaire: {
          motivation: 'Personal development',
          experience: 'Advanced',
          goals: 'Team management'
        }
      };

      const enrollment = await enrollmentService.createEnrollment(enrollmentData);

      expect(enrollment.paymentPlan).toBe('12_installments');
      expect(enrollment.status).toBe('pending');
    });

    it('should throw error when cohort is at capacity', async () => {
      // Create cohort at capacity
      const fullCohort = await createTestCohort({ capacity: 1 });

      // Create first enrollment
      await enrollmentService.createEnrollment({
        userId: testUser.id,
        cohortId: fullCohort.id,
        paymentPlan: 'full',
        personalInfo: {
          phone: '+972501234567',
          emergencyContact: 'John Doe',
          emergencyPhone: '+972501234568'
        },
        questionnaire: {
          motivation: 'Growth',
          experience: 'Beginner',
          goals: 'Skills'
        }
      });

      // Create second user
      const secondUser = await createTestUser({
        email: 'second@example.com',
        cognitoId: 'second-cognito-id'
      });

      // Try to create second enrollment (should fail)
      await expect(enrollmentService.createEnrollment({
        userId: secondUser.id,
        cohortId: fullCohort.id,
        paymentPlan: 'full',
        personalInfo: {
          phone: '+972501234569',
          emergencyContact: 'Jane Doe',
          emergencyPhone: '+972501234570'
        },
        questionnaire: {
          motivation: 'Development',
          experience: 'Intermediate',
          goals: 'Leadership'
        }
      })).rejects.toThrow('Cohort is at full capacity');
    });

    it('should throw error when user already enrolled in cohort', async () => {
      // Create first enrollment
      await enrollmentService.createEnrollment({
        userId: testUser.id,
        cohortId: testCohort.id,
        paymentPlan: 'full',
        personalInfo: {
          phone: '+972501234567',
          emergencyContact: 'John Doe',
          emergencyPhone: '+972501234568'
        },
        questionnaire: {
          motivation: 'Growth',
          experience: 'Beginner',
          goals: 'Skills'
        }
      });

      // Try to create duplicate enrollment
      await expect(enrollmentService.createEnrollment({
        userId: testUser.id,
        cohortId: testCohort.id,
        paymentPlan: '5_installments',
        personalInfo: {
          phone: '+972501234567',
          emergencyContact: 'John Doe',
          emergencyPhone: '+972501234568'
        },
        questionnaire: {
          motivation: 'Growth',
          experience: 'Beginner',
          goals: 'Skills'
        }
      })).rejects.toThrow('User already enrolled in this cohort');
    });
  });

  describe('getEnrollmentById', () => {
    it('should return enrollment with user and cohort data', async () => {
      const createdEnrollment = await enrollmentService.createEnrollment({
        userId: testUser.id,
        cohortId: testCohort.id,
        paymentPlan: 'full',
        personalInfo: {
          phone: '+972501234567',
          emergencyContact: 'John Doe',
          emergencyPhone: '+972501234568'
        },
        questionnaire: {
          motivation: 'Growth',
          experience: 'Beginner',
          goals: 'Skills'
        }
      });

      const enrollment = await enrollmentService.getEnrollmentById(createdEnrollment.id);

      expect(enrollment).toBeTruthy();
      expect(enrollment?.user).toBeTruthy();
      expect(enrollment?.cohort).toBeTruthy();
      expect(enrollment?.user.id).toBe(testUser.id);
      expect(enrollment?.cohort.id).toBe(testCohort.id);
    });

    it('should return null for non-existent enrollment', async () => {
      const enrollment = await enrollmentService.getEnrollmentById('non-existent-id');
      expect(enrollment).toBeNull();
    });
  });

  describe('getUserEnrollments', () => {
    it('should return user enrollments with cohort data', async () => {
      await enrollmentService.createEnrollment({
        userId: testUser.id,
        cohortId: testCohort.id,
        paymentPlan: 'full',
        personalInfo: {
          phone: '+972501234567',
          emergencyContact: 'John Doe',
          emergencyPhone: '+972501234568'
        },
        questionnaire: {
          motivation: 'Growth',
          experience: 'Beginner',
          goals: 'Skills'
        }
      });

      const enrollments = await enrollmentService.getUserEnrollments(testUser.id);

      expect(enrollments).toHaveLength(1);
      expect(enrollments[0].userId).toBe(testUser.id);
      expect(enrollments[0].cohort).toBeTruthy();
      expect(enrollments[0].cohort.id).toBe(testCohort.id);
    });

    it('should return empty array for user with no enrollments', async () => {
      const secondUser = await createTestUser({
        email: 'second@example.com',
        cognitoId: 'second-cognito-id'
      });

      const enrollments = await enrollmentService.getUserEnrollments(secondUser.id);
      expect(enrollments).toHaveLength(0);
    });
  });

  describe('updateEnrollmentStatus', () => {
    it('should update enrollment status', async () => {
      const enrollment = await enrollmentService.createEnrollment({
        userId: testUser.id,
        cohortId: testCohort.id,
        paymentPlan: 'full',
        personalInfo: {
          phone: '+972501234567',
          emergencyContact: 'John Doe',
          emergencyPhone: '+972501234568'
        },
        questionnaire: {
          motivation: 'Growth',
          experience: 'Beginner',
          goals: 'Skills'
        }
      });

      const updatedEnrollment = await enrollmentService.updateEnrollmentStatus(enrollment.id, 'active');

      expect(updatedEnrollment.status).toBe('active');
      expect(updatedEnrollment.id).toBe(enrollment.id);
    });

    it('should throw error for invalid enrollment ID', async () => {
      await expect(enrollmentService.updateEnrollmentStatus('invalid-id', 'active'))
        .rejects.toThrow();
    });
  });

  describe('updateProgress', () => {
    it('should update enrollment progress', async () => {
      const enrollment = await enrollmentService.createEnrollment({
        userId: testUser.id,
        cohortId: testCohort.id,
        paymentPlan: 'full',
        personalInfo: {
          phone: '+972501234567',
          emergencyContact: 'John Doe',
          emergencyPhone: '+972501234568'
        },
        questionnaire: {
          motivation: 'Growth',
          experience: 'Beginner',
          goals: 'Skills'
        }
      });

      const progressData = {
        completedModules: 3,
        totalModules: 10,
        lastActivity: new Date(),
        completionPercentage: 30
      };

      const updatedEnrollment = await enrollmentService.updateProgress(enrollment.id, progressData);

      expect(updatedEnrollment.progress).toEqual(progressData);
    });
  });
});