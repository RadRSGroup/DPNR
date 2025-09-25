import { Enrollment, EnrollmentStatus, CohortStatus } from '@prisma/client';
import {
  EnrollmentModel,
  CreateEnrollmentData,
  UpdateEnrollmentData,
  QuestionnaireData,
  PAYMENT_PLANS
} from '@/models/enrollment.model';
import { CohortModel } from '@/models/cohort.model';
import { UserModel } from '@/models/user.model';
import { EnrollmentWithRelations } from '@/types/prisma';
import prisma from '@/database/connection';

export class EnrollmentService {
  /**
   * Create new enrollment with validation
   */
  static async createEnrollment(data: CreateEnrollmentData): Promise<{
    enrollment: EnrollmentWithRelations;
    cohort?: any;
    paymentUrl?: string;
  }> {
    // Validate user exists
    const user = await UserModel.findById(data.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Validate cohort exists and is available
    const cohort = await CohortModel.findById(data.cohortId);
    if (!cohort) {
      throw new Error('Cohort not found');
    }

    if (cohort.status !== CohortStatus.OPEN_ENROLLMENT) {
      throw new Error('Enrollment is not currently open for this cohort');
    }

    if (cohort.currentEnrollment >= cohort.maxCapacity) {
      throw new Error('Cohort is at full capacity');
    }

    // Check if user already has an active enrollment
    const existingEnrollments = await EnrollmentModel.findByUserId(data.userId);
    const hasActiveEnrollment = existingEnrollments.some(
      e => e.status === EnrollmentStatus.ACTIVE || e.status === EnrollmentStatus.PENDING_PAYMENT
    );

    if (hasActiveEnrollment) {
      throw new Error('User already has an active enrollment');
    }

    // Create enrollment
    const enrollment = await EnrollmentModel.create(data);

    // Generate payment URL if needed
    let paymentUrl: string | undefined;
    if (enrollment.status === EnrollmentStatus.PENDING_PAYMENT) {
      paymentUrl = this.generatePaymentUrl(enrollment);
    }

    // Send enrollment confirmation email
    await this.sendEnrollmentConfirmation(enrollment);

    // Check if cohort is now full
    const updatedCohort = await CohortModel.findById(data.cohortId);
    if (updatedCohort && updatedCohort.currentEnrollment >= updatedCohort.maxCapacity) {
      await CohortModel.updateStatus(data.cohortId, 'FULL');
    }

    return {
      enrollment,
      cohort: enrollment.cohort,
      paymentUrl,
    };
  }

  /**
   * Get enrollment details
   */
  static async getEnrollment(enrollmentId: string): Promise<EnrollmentWithRelations> {
    const enrollment = await EnrollmentModel.findById(enrollmentId);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }
    return enrollment;
  }

  /**
   * Get user enrollments
   */
  static async getUserEnrollments(userId: string): Promise<EnrollmentWithRelations[]> {
    return EnrollmentModel.findByUserId(userId);
  }

  /**
   * Get cohort enrollments
   */
  static async getCohortEnrollments(cohortId: string): Promise<EnrollmentWithRelations[]> {
    return EnrollmentModel.findByCohortId(cohortId);
  }

  /**
   * Update enrollment status
   */
  static async updateEnrollmentStatus(
    enrollmentId: string,
    status: EnrollmentStatus,
    adminId?: string
  ): Promise<EnrollmentWithRelations> {
    const enrollment = await EnrollmentModel.findById(enrollmentId);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    // Validate status transition
    this.validateStatusTransition(enrollment.status, status);

    const updatedEnrollment = await EnrollmentModel.updateStatus(enrollmentId, status);

    // Send status change notification
    await this.sendStatusChangeNotification(updatedEnrollment, adminId);

    return updatedEnrollment;
  }

  /**
   * Process payment for enrollment
   */
  static async processPayment(
    enrollmentId: string,
    paymentAmount: number,
    transactionReference: string
  ): Promise<Enrollment> {
    const enrollment = await EnrollmentModel.findById(enrollmentId);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    if (enrollment.status !== EnrollmentStatus.PENDING_PAYMENT && enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new Error('Enrollment is not in a payable state');
    }

    // Validate payment amount
    const expectedAmount = this.getExpectedPaymentAmount(enrollment);
    if (Math.abs(paymentAmount - expectedAmount) > 0.01) {
      throw new Error(`Payment amount mismatch. Expected: ${expectedAmount}, Received: ${paymentAmount}`);
    }

    // Add payment to enrollment
    const updatedEnrollment = await EnrollmentModel.addPayment(enrollmentId, paymentAmount);

    // Send payment confirmation
    await this.sendPaymentConfirmation(updatedEnrollment, paymentAmount, transactionReference);

    return updatedEnrollment;
  }

  /**
   * Cancel enrollment
   */
  static async cancelEnrollment(enrollmentId: string, reason?: string): Promise<Enrollment> {
    const enrollment = await EnrollmentModel.findById(enrollmentId);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    if (enrollment.status === EnrollmentStatus.COMPLETED) {
      throw new Error('Cannot cancel completed enrollment');
    }

    if (enrollment.status === EnrollmentStatus.CANCELLED) {
      throw new Error('Enrollment is already cancelled');
    }

    // Update status to cancelled
    const updatedEnrollment = await EnrollmentModel.updateStatus(enrollmentId, EnrollmentStatus.CANCELLED);

    // Send cancellation confirmation
    await this.sendCancellationConfirmation(updatedEnrollment, reason);

    return updatedEnrollment;
  }

  /**
   * Get enrollment statistics
   */
  static async getEnrollmentStatistics(cohortId?: string) {
    const stats = await EnrollmentModel.getStatistics(cohortId);

    // Add additional calculations
    const conversionRate = stats.totalEnrollments > 0
      ? (stats.activeEnrollments / stats.totalEnrollments) * 100
      : 0;

    const completionRate = stats.activeEnrollments > 0
      ? (stats.completedEnrollments / (stats.activeEnrollments + stats.completedEnrollments)) * 100
      : 0;

    return {
      ...stats,
      conversionRate: Math.round(conversionRate * 100) / 100,
      completionRate: Math.round(completionRate * 100) / 100,
    };
  }

  /**
   * Validate questionnaire data
   */
  static validateQuestionnaire(questionnaire: any): QuestionnaireData {
    // Basic validation - this should match the schema in enrollment.model.ts
    if (!questionnaire || typeof questionnaire !== 'object') {
      throw new Error('Invalid questionnaire data');
    }

    const required = ['motivation', 'previousExperience', 'expectations', 'agreedToTerms', 'agreedToPrivacy'];
    for (const field of required) {
      if (!(field in questionnaire)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (questionnaire.agreedToTerms !== true) {
      throw new Error('Must agree to terms and conditions');
    }

    if (questionnaire.agreedToPrivacy !== true) {
      throw new Error('Must agree to privacy policy');
    }

    return questionnaire;
  }

  /**
   * Generate payment URL for enrollment
   */
  private static generatePaymentUrl(enrollment: Enrollment): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const amount = this.getExpectedPaymentAmount(enrollment);

    // This would integrate with Tranzila or other payment processor
    return `${baseUrl}/payment?enrollment=${enrollment.id}&amount=${amount}`;
  }

  /**
   * Get expected payment amount for enrollment
   */
  private static getExpectedPaymentAmount(enrollment: Enrollment): number {
    const paymentConfig = PAYMENT_PLANS[enrollment.paymentPlan];

    if (enrollment.paymentPlan === 'FULL') {
      return paymentConfig.total;
    }

    // For installment plans, return the installment amount
    return paymentConfig.amount;
  }

  /**
   * Validate status transitions
   */
  private static validateStatusTransition(currentStatus: EnrollmentStatus, newStatus: EnrollmentStatus): void {
    const validTransitions: Record<EnrollmentStatus, EnrollmentStatus[]> = {
      [EnrollmentStatus.PENDING_PAYMENT]: [EnrollmentStatus.ACTIVE, EnrollmentStatus.CANCELLED],
      [EnrollmentStatus.ACTIVE]: [EnrollmentStatus.COMPLETED, EnrollmentStatus.CANCELLED],
      [EnrollmentStatus.COMPLETED]: [], // Final state
      [EnrollmentStatus.CANCELLED]: [EnrollmentStatus.REFUNDED], // Can be refunded
      [EnrollmentStatus.REFUNDED]: [], // Final state
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  /**
   * Send enrollment confirmation email
   */
  private static async sendEnrollmentConfirmation(enrollment: Enrollment): Promise<void> {
    // TODO: Implement email service integration
    console.log(`Sending enrollment confirmation to ${enrollment.user.email}`);
  }

  /**
   * Send payment confirmation email
   */
  private static async sendPaymentConfirmation(
    enrollment: Enrollment,
    amount: number,
    transactionReference: string
  ): Promise<void> {
    // TODO: Implement email service integration
    console.log(`Sending payment confirmation to ${enrollment.user.email} for amount ${amount}`);
  }

  /**
   * Send status change notification
   */
  private static async sendStatusChangeNotification(
    enrollment: Enrollment,
    adminId?: string
  ): Promise<void> {
    // TODO: Implement email service integration
    console.log(`Sending status change notification to ${enrollment.user.email}`);
  }

  /**
   * Send cancellation confirmation
   */
  private static async sendCancellationConfirmation(
    enrollment: Enrollment,
    reason?: string
  ): Promise<void> {
    // TODO: Implement email service integration
    console.log(`Sending cancellation confirmation to ${enrollment.user.email}`);
  }

  /**
   * Check if user can enroll in cohort
   */
  static async canUserEnroll(userId: string, cohortId: string): Promise<{
    canEnroll: boolean;
    reason?: string;
  }> {
    // Check if user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      return { canEnroll: false, reason: 'User not found' };
    }

    // Check if cohort exists and is available
    const cohort = await CohortModel.findById(cohortId);
    if (!cohort) {
      return { canEnroll: false, reason: 'Cohort not found' };
    }

    if (cohort.status !== CohortStatus.OPEN_ENROLLMENT) {
      return { canEnroll: false, reason: 'Enrollment is not currently open' };
    }

    if (cohort.currentEnrollment >= cohort.maxCapacity) {
      return { canEnroll: false, reason: 'Cohort is at full capacity' };
    }

    // Check for existing enrollments
    const existingEnrollments = await EnrollmentModel.findByUserId(userId);
    const hasActiveEnrollment = existingEnrollments.some(
      e => e.status === EnrollmentStatus.ACTIVE || e.status === EnrollmentStatus.PENDING_PAYMENT
    );

    if (hasActiveEnrollment) {
      return { canEnroll: false, reason: 'User already has an active enrollment' };
    }

    return { canEnroll: true };
  }

  /**
   * Validate enrollment capacity before creating enrollment
   */
  static async validateCapacity(cohortId: string): Promise<boolean> {
    const cohort = await CohortModel.findById(cohortId);
    if (!cohort) {
      throw new Error('Cohort not found');
    }

    return cohort.currentEnrollment < cohort.maxCapacity && cohort.status === CohortStatus.OPEN_ENROLLMENT;
  }

  /**
   * Get enrollment by ID with full details
   */
  static async getEnrollmentById(enrollmentId: string): Promise<Enrollment> {
    const enrollment = await EnrollmentModel.findById(enrollmentId);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }
    return enrollment;
  }

  /**
   * Update enrollment with validation
   */
  static async updateEnrollment(enrollmentId: string, updateData: UpdateEnrollmentData): Promise<Enrollment> {
    const enrollment = await EnrollmentModel.findById(enrollmentId);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    return EnrollmentModel.update(enrollmentId, updateData);
  }
}