import { Cohort, CohortStatus } from '@prisma/client';
import { z } from 'zod';
import prisma from '../database/connection';

// Validation schemas
const baseCohortSchema = z.object({
  name: z.string().min(1, 'Cohort name is required'),
  startDate: z.date().min(new Date(), 'Start date must be in the future'),
  endDate: z.date(),
  maxCapacity: z.number().int().min(1).max(50).default(20),
  location: z.string().default('Mazkeret Batya'),
  schedule: z.string().default('Weekly evenings, 1.5-2 hours'),
});

export const createCohortSchema = baseCohortSchema.refine(data => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export const updateCohortSchema = baseCohortSchema.partial();

export type CreateCohortData = z.infer<typeof createCohortSchema>;
export type UpdateCohortData = z.infer<typeof updateCohortSchema>;

export class CohortModel {
  /**
   * Create a new cohort
   */
  static async create(data: CreateCohortData): Promise<Cohort> {
    const validatedData = createCohortSchema.parse(data);

    // Check for overlapping cohorts
    const overlappingCohorts = await prisma.cohort.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                startDate: {
                  lte: validatedData.endDate,
                },
                endDate: {
                  gte: validatedData.startDate,
                },
              },
            ],
          },
          {
            status: {
              in: ['UPCOMING', 'OPEN_ENROLLMENT', 'IN_PROGRESS'],
            },
          },
        ],
      },
    });

    if (overlappingCohorts.length > 0) {
      console.warn(`Creating cohort that overlaps with ${overlappingCohorts.length} existing cohort(s)`);
    }

    return prisma.cohort.create({
      data: {
        name: validatedData.name,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        maxCapacity: validatedData.maxCapacity,
        location: validatedData.location,
        schedule: validatedData.schedule,
        status: CohortStatus.UPCOMING,
        currentEnrollment: 0,
      },
    });
  }

  /**
   * Find cohort by ID
   */
  static async findById(id: string): Promise<Cohort | null> {
    return prisma.cohort.findUnique({
      where: { id },
      include: {
        enrollments: {
          include: {
            user: true,
            paymentTransactions: true,
          },
        },
      },
    });
  }

  /**
   * Get all cohorts
   */
  static async findAll(): Promise<Cohort[]> {
    return prisma.cohort.findMany({
      include: {
        enrollments: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  /**
   * Get current active cohort (for landing page)
   */
  static async getCurrentCohort(): Promise<Cohort | null> {
    return prisma.cohort.findFirst({
      where: {
        status: {
          in: ['UPCOMING', 'OPEN_ENROLLMENT'],
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  /**
   * Get cohorts by status
   */
  static async findByStatus(status: CohortStatus): Promise<Cohort[]> {
    return prisma.cohort.findMany({
      where: { status },
      include: {
        enrollments: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  /**
   * Update cohort
   */
  static async update(id: string, data: UpdateCohortData): Promise<Cohort> {
    const validatedData = updateCohortSchema.parse(data);

    const cohort = await prisma.cohort.findUnique({
      where: { id },
    });

    if (!cohort) {
      throw new Error('Cohort not found');
    }

    // Validate capacity reduction
    if (validatedData.maxCapacity && validatedData.maxCapacity < cohort.currentEnrollment) {
      throw new Error('Cannot reduce capacity below current enrollment count');
    }

    // Filter out undefined values for Prisma
    const updateData: any = { updatedAt: new Date() };
    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        updateData[key] = value;
      }
    });

    return prisma.cohort.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Update cohort status
   */
  static async updateStatus(id: string, status: CohortStatus): Promise<Cohort> {
    const cohort = await prisma.cohort.findUnique({
      where: { id },
    });

    if (!cohort) {
      throw new Error('Cohort not found');
    }

    // Validate status transition
    this.validateStatusTransition(cohort.status, status);

    return prisma.cohort.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete cohort (admin only, only if no enrollments)
   */
  static async delete(id: string): Promise<void> {
    const cohort = await prisma.cohort.findUnique({
      where: { id },
      include: {
        enrollments: true,
      },
    });

    if (!cohort) {
      throw new Error('Cohort not found');
    }

    if (cohort.enrollments.length > 0) {
      throw new Error('Cannot delete cohort with existing enrollments');
    }

    await prisma.cohort.delete({
      where: { id },
    });
  }

  /**
   * Get cohort statistics
   */
  static async getStatistics(id?: string) {
    console.log('Getting statistics for:', id ? { id } : {});

    if (id) {
      // Single cohort statistics
      const cohort = await prisma.cohort.findUnique({
        where: { id },
        include: {
          enrollments: {
            include: {
              paymentTransactions: true,
            },
          },
        },
      });

      if (!cohort) {
        throw new Error('Cohort not found');
      }

      const totalRevenue = cohort.enrollments.reduce((sum, enrollment) => {
        return sum + enrollment.paidAmount.toNumber();
      }, 0);

      const enrollmentsByStatus = cohort.enrollments.reduce((acc, enrollment) => {
        acc[enrollment.status] = (acc[enrollment.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        cohortInfo: {
          id: cohort.id,
          name: cohort.name,
          status: cohort.status,
          startDate: cohort.startDate,
          endDate: cohort.endDate,
          capacity: cohort.maxCapacity,
          enrolled: cohort.currentEnrollment,
          availableSpots: cohort.maxCapacity - cohort.currentEnrollment,
        },
        enrollmentStats: enrollmentsByStatus,
        totalRevenue,
        averageRevenuePerStudent: cohort.enrollments.length > 0 ? totalRevenue / cohort.enrollments.length : 0,
      };
    } else {
      // All cohorts statistics
      const [
        totalCohorts,
        upcomingCohorts,
        activeCohorts,
        completedCohorts,
        totalEnrollments,
      ] = await Promise.all([
        prisma.cohort.count(),
        prisma.cohort.count({ where: { status: CohortStatus.UPCOMING } }),
        prisma.cohort.count({ where: { status: { in: ['OPEN_ENROLLMENT', 'IN_PROGRESS'] } } }),
        prisma.cohort.count({ where: { status: CohortStatus.COMPLETED } }),
        prisma.enrollment.count(),
      ]);

      return {
        totalCohorts,
        upcomingCohorts,
        activeCohorts,
        completedCohorts,
        totalEnrollments,
      };
    }
  }

  /**
   * Check and update cohort statuses (should be run daily)
   */
  static async updateCohortStatuses(): Promise<void> {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    // Update UPCOMING cohorts to OPEN_ENROLLMENT (30 days before start)
    await prisma.cohort.updateMany({
      where: {
        status: CohortStatus.UPCOMING,
        startDate: {
          lte: thirtyDaysFromNow,
        },
      },
      data: {
        status: CohortStatus.OPEN_ENROLLMENT,
        updatedAt: now,
      },
    });

    // Update OPEN_ENROLLMENT and FULL cohorts to IN_PROGRESS (on start date)
    await prisma.cohort.updateMany({
      where: {
        status: {
          in: [CohortStatus.OPEN_ENROLLMENT, CohortStatus.FULL],
        },
        startDate: {
          lte: now,
        },
      },
      data: {
        status: CohortStatus.IN_PROGRESS,
        updatedAt: now,
      },
    });

    // Update IN_PROGRESS cohorts to COMPLETED (on end date)
    await prisma.cohort.updateMany({
      where: {
        status: CohortStatus.IN_PROGRESS,
        endDate: {
          lte: now,
        },
      },
      data: {
        status: CohortStatus.COMPLETED,
        updatedAt: now,
      },
    });
  }

  /**
   * Get cohorts that need attention
   */
  static async getCohortsNeedingAttention() {
    const now = new Date();
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(now.getDate() + 7);

    const [
      startingSoon,
      underEnrolled,
      needsStatusUpdate,
    ] = await Promise.all([
      // Cohorts starting within a week
      prisma.cohort.findMany({
        where: {
          startDate: {
            gte: now,
            lte: oneWeekFromNow,
          },
          status: {
            in: [CohortStatus.OPEN_ENROLLMENT, CohortStatus.FULL],
          },
        },
      }),
      // Cohorts with low enrollment (less than 50% capacity)
      // Note: This is a simplified approach - in production you'd use raw SQL for this comparison
      prisma.$queryRaw`
        SELECT * FROM cohorts
        WHERE status = 'OPEN_ENROLLMENT'
        AND "currentEnrollment" < ("maxCapacity" * 0.5)
      ` as Promise<any[]>,
      // Cohorts that should have status updated
      prisma.cohort.findMany({
        where: {
          OR: [
            {
              status: CohortStatus.UPCOMING,
              startDate: {
                lte: oneWeekFromNow,
              },
            },
            {
              status: CohortStatus.IN_PROGRESS,
              endDate: {
                lte: now,
              },
            },
          ],
        },
      }),
    ]);

    return {
      startingSoon,
      underEnrolled,
      needsStatusUpdate,
    };
  }

  /**
   * Validate status transitions
   */
  private static validateStatusTransition(currentStatus: CohortStatus, newStatus: CohortStatus): void {
    const validTransitions: Record<CohortStatus, CohortStatus[]> = {
      [CohortStatus.UPCOMING]: [CohortStatus.OPEN_ENROLLMENT],
      [CohortStatus.OPEN_ENROLLMENT]: [CohortStatus.FULL, CohortStatus.IN_PROGRESS],
      [CohortStatus.FULL]: [CohortStatus.OPEN_ENROLLMENT, CohortStatus.IN_PROGRESS],
      [CohortStatus.IN_PROGRESS]: [CohortStatus.COMPLETED],
      [CohortStatus.COMPLETED]: [], // Final state
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  /**
   * Check if cohort can accept enrollments
   */
  static async canAcceptEnrollments(id: string): Promise<boolean> {
    const cohort = await prisma.cohort.findUnique({
      where: { id },
    });

    if (!cohort) return false;

    return cohort.status === CohortStatus.OPEN_ENROLLMENT &&
           cohort.currentEnrollment < cohort.maxCapacity;
  }

  /**
   * Get enrollment capacity info
   */
  static async getCapacityInfo(id: string): Promise<{
    capacity: number;
    enrolled: number;
    available: number;
    waitlistEnabled: boolean;
  }> {
    const cohort = await prisma.cohort.findUnique({
      where: { id },
    });

    if (!cohort) {
      throw new Error('Cohort not found');
    }

    return {
      capacity: cohort.maxCapacity,
      enrolled: cohort.currentEnrollment,
      available: Math.max(0, cohort.maxCapacity - cohort.currentEnrollment),
      waitlistEnabled: cohort.status === CohortStatus.FULL,
    };
  }

  /**
   * Update enrollment count when student enrolls/unenrolls
   */
  static async updateEnrollmentCount(id: string, increment: boolean = true): Promise<void> {
    const cohort = await prisma.cohort.findUnique({
      where: { id },
    });

    if (!cohort) {
      throw new Error('Cohort not found');
    }

    const newCount = increment
      ? cohort.currentEnrollment + 1
      : Math.max(0, cohort.currentEnrollment - 1);

    // Check if we need to update status based on capacity
    let newStatus = cohort.status;
    if (increment && newCount >= cohort.maxCapacity && cohort.status === CohortStatus.OPEN_ENROLLMENT) {
      newStatus = CohortStatus.FULL;
    } else if (!increment && newCount < cohort.maxCapacity && cohort.status === CohortStatus.FULL) {
      newStatus = CohortStatus.OPEN_ENROLLMENT;
    }

    await prisma.cohort.update({
      where: { id },
      data: {
        currentEnrollment: newCount,
        status: newStatus,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Get cohorts available for enrollment
   */
  static async getAvailableForEnrollment(): Promise<Cohort[]> {
    // Using raw SQL for comparison since Prisma doesn't support field references
    const cohorts = await prisma.$queryRaw<Cohort[]>`
      SELECT * FROM "cohorts"
      WHERE status = 'OPEN_ENROLLMENT'
      AND "currentEnrollment" < "maxCapacity"
      ORDER BY "startDate" ASC
    `;
    return cohorts;
  }
}