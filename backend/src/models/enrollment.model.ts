import { Enrollment, EnrollmentStatus, PaymentPlan, Prisma } from '@prisma/client';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../database/connection';
import { EnrollmentWithRelations, EnrollmentCreateData as PrismaEnrollmentCreateData } from '../types/prisma';

// Questionnaire schema
export const questionnaireSchema = z.object({
  motivation: z.string().min(10, 'Motivation must be at least 10 characters'),
  previousExperience: z.boolean(),
  expectations: z.string().min(5, 'Expectations must be provided'),
  referralSource: z.string().optional(),
  specialNeeds: z.string().optional(),
  agreedToTerms: z.boolean().refine(val => val === true, 'Must agree to terms'),
  agreedToPrivacy: z.boolean().refine(val => val === true, 'Must agree to privacy policy'),
  marketingConsent: z.boolean(),
  submittedAt: z.date().default(() => new Date()),
});

// Enrollment schemas
export const createEnrollmentSchema = z.object({
  userId: z.string().uuid(),
  cohortId: z.string().uuid(),
  paymentPlan: z.nativeEnum(PaymentPlan),
  questionnaire: questionnaireSchema,
});

export const updateEnrollmentSchema = z.object({
  status: z.nativeEnum(EnrollmentStatus).optional(),
  paidAmount: z.number().min(0).optional(),
  questionnaire: questionnaireSchema.optional(),
});

export type QuestionnaireData = z.infer<typeof questionnaireSchema>;
export type CreateEnrollmentData = z.infer<typeof createEnrollmentSchema>;
export type UpdateEnrollmentData = z.infer<typeof updateEnrollmentSchema>;

// Payment plan pricing configuration
export const PAYMENT_PLANS = {
  FULL: { total: 6400, installments: 1, amount: 6400 },
  FIVE_INSTALLMENTS: { total: 6800, installments: 5, amount: 1360 }, // Small fee for installments
  TWELVE_INSTALLMENTS: { total: 6960, installments: 12, amount: 580 }, // Larger fee for more installments
} as const;

export class EnrollmentModel {
  /**
   * Create a new enrollment
   */
  static async create(data: CreateEnrollmentData): Promise<EnrollmentWithRelations> {
    const validatedData = createEnrollmentSchema.parse(data);

    // Check if user already enrolled in this cohort
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_cohortId: {
          userId: validatedData.userId,
          cohortId: validatedData.cohortId,
        },
      },
    });

    if (existingEnrollment) {
      throw new Error('User is already enrolled in this cohort');
    }

    // Get cohort and check capacity
    const cohort = await prisma.cohort.findUnique({
      where: { id: validatedData.cohortId },
    });

    if (!cohort) {
      throw new Error('Cohort not found');
    }

    if (cohort.currentEnrollment >= cohort.maxCapacity) {
      throw new Error('Cohort is at full capacity');
    }

    // Calculate total amount based on payment plan
    const totalAmount = PAYMENT_PLANS[validatedData.paymentPlan].total;

    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        ...validatedData,
        totalAmount: new Decimal(totalAmount),
        status: EnrollmentStatus.PENDING_PAYMENT,
        questionnaire: JSON.parse(JSON.stringify(validatedData.questionnaire)) as Prisma.JsonValue,
      },
      include: {
        user: true,
        cohort: true,
        paymentTransactions: true,
      },
    });

    // Update cohort enrollment count
    await prisma.cohort.update({
      where: { id: validatedData.cohortId },
      data: {
        currentEnrollment: {
          increment: 1,
        },
      },
    });

    return enrollment as EnrollmentWithRelations;
  }

  /**
   * Find enrollment by ID
   */
  static async findById(id: string): Promise<EnrollmentWithRelations | null> {
    return prisma.enrollment.findUnique({
      where: { id },
      include: {
        user: true,
        cohort: true,
        paymentTransactions: true,
      },
    });
  }

  /**
   * Find enrollments by user ID
   */
  static async findByUserId(userId: string): Promise<EnrollmentWithRelations[]> {
    return prisma.enrollment.findMany({
      where: { userId },
      include: {
        user: true,
        cohort: true,
        paymentTransactions: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Find enrollments by cohort ID
   */
  static async findByCohortId(cohortId: string): Promise<EnrollmentWithRelations[]> {
    return prisma.enrollment.findMany({
      where: { cohortId },
      include: {
        user: true,
        cohort: true,
        paymentTransactions: true,
      },
      orderBy: {
        enrollmentDate: 'asc',
      },
    });
  }

  /**
   * Update enrollment
   */
  static async update(id: string, data: UpdateEnrollmentData): Promise<EnrollmentWithRelations> {
    const validatedData = updateEnrollmentSchema.parse(data);

    return prisma.enrollment.update({
      where: { id },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
      include: {
        user: true,
        cohort: true,
        paymentTransactions: true,
      },
    });
  }

  /**
   * Update enrollment status
   */
  static async updateStatus(id: string, status: EnrollmentStatus): Promise<EnrollmentWithRelations> {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: { cohort: true },
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    // Handle status transitions
    const updatedEnrollment = await prisma.enrollment.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
      },
      include: {
        user: true,
        cohort: true,
        paymentTransactions: true,
      },
    });

    // Update cohort enrollment count if cancelled
    if (status === EnrollmentStatus.CANCELLED || status === EnrollmentStatus.REFUNDED) {
      await prisma.cohort.update({
        where: { id: enrollment.cohortId },
        data: {
          currentEnrollment: {
            decrement: 1,
          },
        },
      });

      // Update cohort status if it was full
      const cohort = await prisma.cohort.findUnique({
        where: { id: enrollment.cohortId },
      });

      if (cohort && cohort.status === 'FULL' && cohort.currentEnrollment - 1 < cohort.maxCapacity) {
        await prisma.cohort.update({
          where: { id: enrollment.cohortId },
          data: { status: 'OPEN_ENROLLMENT' },
        });
      }
    }

    return updatedEnrollment;
  }

  /**
   * Add payment to enrollment
   */
  static async addPayment(id: string, amount: number): Promise<EnrollmentWithRelations> {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    const newPaidAmount = enrollment.paidAmount.toNumber() + amount;
    const totalAmount = enrollment.totalAmount.toNumber();

    // Update paid amount
    const updatedEnrollment = await prisma.enrollment.update({
      where: { id },
      data: {
        paidAmount: new Decimal(newPaidAmount),
        status: newPaidAmount >= totalAmount ? EnrollmentStatus.ACTIVE : enrollment.status,
        updatedAt: new Date(),
      },
      include: {
        user: true,
        cohort: true,
        paymentTransactions: true,
      },
    });

    return updatedEnrollment;
  }

  /**
   * Get enrollment statistics
   */
  static async getStatistics(cohortId?: string) {
    const whereClause = cohortId ? { cohortId } : {};

    const [
      totalEnrollments,
      activeEnrollments,
      pendingPayments,
      completedEnrollments,
      cancelledEnrollments,
    ] = await Promise.all([
      prisma.enrollment.count({ where: whereClause }),
      prisma.enrollment.count({
        where: { ...whereClause, status: EnrollmentStatus.ACTIVE },
      }),
      prisma.enrollment.count({
        where: { ...whereClause, status: EnrollmentStatus.PENDING_PAYMENT },
      }),
      prisma.enrollment.count({
        where: { ...whereClause, status: EnrollmentStatus.COMPLETED },
      }),
      prisma.enrollment.count({
        where: { ...whereClause, status: EnrollmentStatus.CANCELLED },
      }),
    ]);

    return {
      totalEnrollments,
      activeEnrollments,
      pendingPayments,
      completedEnrollments,
      cancelledEnrollments,
    };
  }

  /**
   * Get pending enrollments (need payment)
   */
  static async getPendingEnrollments(): Promise<EnrollmentWithRelations[]> {
    return prisma.enrollment.findMany({
      where: {
        status: EnrollmentStatus.PENDING_PAYMENT,
        createdAt: {
          lte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Older than 24 hours
        },
      },
      include: {
        user: true,
        cohort: true,
        paymentTransactions: true,
      },
    });
  }

  /**
   * Calculate remaining amount for installment plans
   */
  static calculateRemainingAmount(enrollment: EnrollmentWithRelations): number {
    return enrollment.totalAmount.toNumber() - enrollment.paidAmount.toNumber();
  }

  /**
   * Get next installment amount
   */
  static getNextInstallmentAmount(enrollment: EnrollmentWithRelations): number {
    const paymentPlan = PAYMENT_PLANS[enrollment.paymentPlan];
    return paymentPlan.amount;
  }

  /**
   * Check if enrollment is fully paid
   */
  static isFullyPaid(enrollment: EnrollmentWithRelations): boolean {
    return enrollment.paidAmount.gte(enrollment.totalAmount);
  }

  /**
   * Get enrollments requiring action
   */
  static async getEnrollmentsRequiringAction() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [pendingPayments, staleEnrollments] = await Promise.all([
      // Enrollments pending payment for more than 24 hours
      prisma.enrollment.findMany({
        where: {
          status: EnrollmentStatus.PENDING_PAYMENT,
          createdAt: { lte: oneDayAgo },
        },
        include: { user: true, cohort: true },
      }),
      // Enrollments with no activity for a week
      prisma.enrollment.findMany({
        where: {
          status: EnrollmentStatus.ACTIVE,
          updatedAt: { lte: oneWeekAgo },
        },
        include: { user: true, cohort: true },
      }),
    ]);

    return {
      pendingPayments,
      staleEnrollments,
    };
  }

  /**
   * Delete enrollment (admin only)
   */
  static async delete(id: string): Promise<void> {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: { cohort: true },
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    // Delete enrollment
    await prisma.enrollment.delete({
      where: { id },
    });

    // Update cohort enrollment count
    await prisma.cohort.update({
      where: { id: enrollment.cohortId },
      data: {
        currentEnrollment: {
          decrement: 1,
        },
      },
    });
  }

  /**
   * Find all enrollments with optional filtering (for admin endpoints)
   */
  static async findAll(filters?: {
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<EnrollmentWithRelations[]> {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      where.enrollmentDate = {};
      if (filters.startDate) {
        where.enrollmentDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.enrollmentDate.lte = filters.endDate;
      }
    }

    return prisma.enrollment.findMany({
      where,
      include: {
        user: true,
        cohort: true,
        paymentTransactions: true,
      },
      orderBy: {
        enrollmentDate: 'desc',
      },
      take: filters?.limit,
      skip: filters?.offset,
    });
  }
}