import { Cohort, CohortStatus } from '@prisma/client';
import { CohortModel, CreateCohortData, UpdateCohortData } from '@/models/cohort.model';
import prisma from '@/database/connection';

export class CohortService {
  /**
   * Create a new cohort
   */
  static async createCohort(data: CreateCohortData): Promise<Cohort> {
    // Validate dates
    const now = new Date();
    if (data.startDate <= now) {
      throw new Error('Start date must be in the future');
    }

    if (data.endDate <= data.startDate) {
      throw new Error('End date must be after start date');
    }

    // Calculate course duration
    const durationMonths = this.calculateCourseDuration(data.startDate, data.endDate);
    if (durationMonths < 3 || durationMonths > 12) {
      console.warn(`Course duration is ${durationMonths} months, which is outside typical range (3-12 months)`);
    }

    const cohort = await CohortModel.create(data);

    // Log cohort creation
    console.log(`Created new cohort: ${cohort.name} (${cohort.id})`);

    return cohort;
  }

  /**
   * Get current cohort for landing page
   */
  static async getCurrentCohort(): Promise<Cohort | null> {
    return CohortModel.getCurrentCohort();
  }

  /**
   * Get cohort details
   */
  static async getCohortDetails(cohortId: string): Promise<Cohort> {
    const cohort = await CohortModel.findById(cohortId);
    if (!cohort) {
      throw new Error('Cohort not found');
    }
    return cohort;
  }

  /**
   * Get all cohorts with optional filtering
   */
  static async getAllCohorts(status?: CohortStatus): Promise<Cohort[]> {
    if (status) {
      return CohortModel.findByStatus(status);
    }
    return CohortModel.findAll();
  }

  /**
   * Update cohort
   */
  static async updateCohort(cohortId: string, data: UpdateCohortData): Promise<Cohort> {
    const existingCohort = await CohortModel.findById(cohortId);
    if (!existingCohort) {
      throw new Error('Cohort not found');
    }

    // Validate business rules for updates
    if (data.startDate && existingCohort.status === CohortStatus.IN_PROGRESS) {
      throw new Error('Cannot change start date of a cohort in progress');
    }

    if (data.maxCapacity && data.maxCapacity < existingCohort.currentEnrollment) {
      throw new Error(`Cannot reduce capacity below current enrollment (${existingCohort.currentEnrollment})`);
    }

    const updatedCohort = await CohortModel.update(cohortId, data);

    // Check if capacity change affects status
    if (data.maxCapacity) {
      await this.checkAndUpdateCapacityStatus(cohortId);
    }

    return updatedCohort;
  }

  /**
   * Update cohort status
   */
  static async updateCohortStatus(cohortId: string, status: CohortStatus): Promise<Cohort> {
    const cohort = await CohortModel.findById(cohortId);
    if (!cohort) {
      throw new Error('Cohort not found');
    }

    // Additional business logic for status changes
    if (status === CohortStatus.OPEN_ENROLLMENT && cohort.currentEnrollment >= cohort.maxCapacity) {
      throw new Error('Cannot open enrollment for a full cohort');
    }

    if (status === CohortStatus.IN_PROGRESS && cohort.currentEnrollment === 0) {
      console.warn(`Starting cohort ${cohort.name} with no enrollments`);
    }

    const updatedCohort = await CohortModel.updateStatus(cohortId, status);

    // Send notifications for status changes
    await this.sendStatusChangeNotifications(updatedCohort);

    return updatedCohort;
  }

  /**
   * Delete cohort
   */
  static async deleteCohort(cohortId: string): Promise<void> {
    const cohort = await CohortModel.findById(cohortId);
    if (!cohort) {
      throw new Error('Cohort not found');
    }

    // Check for enrollments would be done here with a separate query
    // if (cohort.enrollments && cohort.enrollments.length > 0) {
    //   throw new Error('Cannot delete cohort with enrollments');
    // }

    if (cohort.status === CohortStatus.IN_PROGRESS) {
      throw new Error('Cannot delete cohort in progress');
    }

    await CohortModel.delete(cohortId);
    console.log(`Deleted cohort: ${cohort.name} (${cohortId})`);
  }

  /**
   * Get cohort statistics
   */
  static async getCohortStatistics(cohortId?: string) {
    return CohortModel.getStatistics(cohortId);
  }

  /**
   * Check enrollment availability
   */
  static async checkEnrollmentAvailability(cohortId: string): Promise<{
    canEnroll: boolean;
    spotsAvailable: number;
    status: CohortStatus;
    message?: string;
  }> {
    const cohort = await CohortModel.findById(cohortId);
    if (!cohort) {
      throw new Error('Cohort not found');
    }

    const spotsAvailable = cohort.maxCapacity - cohort.currentEnrollment;
    let canEnroll = false;
    let message: string | undefined;

    switch (cohort.status) {
      case CohortStatus.UPCOMING:
        message = 'Enrollment will open soon';
        break;
      case CohortStatus.OPEN_ENROLLMENT:
        canEnroll = spotsAvailable > 0;
        if (!canEnroll) {
          message = 'Cohort is full';
        }
        break;
      case CohortStatus.FULL:
        message = 'Cohort is full - join waitlist';
        break;
      case CohortStatus.IN_PROGRESS:
        message = 'Cohort has already started';
        break;
      case CohortStatus.COMPLETED:
        message = 'Cohort has completed';
        break;
    }

    const result: {
      canEnroll: boolean;
      spotsAvailable: number;
      status: any;
      message?: string;
    } = {
      canEnroll,
      spotsAvailable: Math.max(0, spotsAvailable),
      status: cohort.status,
    };

    if (message) {
      result.message = message;
    }

    return result;
  }

  /**
   * Process daily cohort status updates
   */
  static async processDailyUpdates(): Promise<void> {
    console.log('Processing daily cohort status updates...');

    // Update statuses based on dates
    await CohortModel.updateCohortStatuses();

    // Get cohorts needing attention
    const attention = await CohortModel.getCohortsNeedingAttention();

    // Log warnings for cohorts needing attention
    if (attention.startingSoon.length > 0) {
      console.log(`${attention.startingSoon.length} cohort(s) starting within a week`);
    }

    if (attention.underEnrolled.length > 0) {
      console.log(`${attention.underEnrolled.length} cohort(s) are under-enrolled`);
    }

    if (attention.needsStatusUpdate.length > 0) {
      console.log(`${attention.needsStatusUpdate.length} cohort(s) need status updates`);
    }

    console.log('Daily cohort updates completed');
  }

  /**
   * Get upcoming enrollment deadlines
   */
  static async getUpcomingDeadlines(days: number = 30): Promise<Cohort[]> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);

    const cohorts = await CohortModel.findByStatus(CohortStatus.OPEN_ENROLLMENT);

    return cohorts.filter(cohort => {
      const enrollmentDeadline = new Date(cohort.startDate);
      enrollmentDeadline.setDate(enrollmentDeadline.getDate() - 7); // Close enrollment 1 week before start
      return enrollmentDeadline <= targetDate;
    });
  }

  /**
   * Calculate course duration in months
   */
  private static calculateCourseDuration(startDate: Date, endDate: Date): number {
    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                  (endDate.getMonth() - startDate.getMonth());
    return months;
  }

  /**
   * Check and update capacity-based status
   */
  private static async checkAndUpdateCapacityStatus(cohortId: string): Promise<void> {
    const cohort = await CohortModel.findById(cohortId);
    if (!cohort) return;

    if (cohort.status === CohortStatus.OPEN_ENROLLMENT) {
      if (cohort.currentEnrollment >= cohort.maxCapacity) {
        await CohortModel.updateStatus(cohortId, CohortStatus.FULL);
      }
    } else if (cohort.status === CohortStatus.FULL) {
      if (cohort.currentEnrollment < cohort.maxCapacity) {
        await CohortModel.updateStatus(cohortId, CohortStatus.OPEN_ENROLLMENT);
      }
    }
  }

  /**
   * Send status change notifications
   */
  private static async sendStatusChangeNotifications(cohort: Cohort): Promise<void> {
    // TODO: Implement email/notification service
    console.log(`Cohort ${cohort.name} status changed to ${cohort.status}`);

    switch (cohort.status) {
      case CohortStatus.OPEN_ENROLLMENT:
        // Notify marketing team to start promotion
        break;
      case CohortStatus.FULL:
        // Notify that enrollment is closed
        break;
      case CohortStatus.IN_PROGRESS:
        // Notify enrolled students that course has started
        break;
      case CohortStatus.COMPLETED:
        // Send completion notifications and certificates
        break;
    }
  }

  /**
   * Get capacity information for a cohort
   */
  static async getCapacityInfo(cohortId: string): Promise<{
    maximum: number;
    current: number;
    available: number;
    waitlistEnabled: boolean;
  }> {
    const cohort = await CohortModel.findById(cohortId);
    if (!cohort) {
      throw new Error('Cohort not found');
    }

    return {
      maximum: cohort.maxCapacity,
      current: cohort.currentEnrollment,
      available: Math.max(0, cohort.maxCapacity - cohort.currentEnrollment),
      waitlistEnabled: cohort.status === CohortStatus.FULL,
    };
  }

  /**
   * Update enrollment count for a cohort
   */
  static async updateEnrollmentCount(cohortId: string, increment: number = 1): Promise<Cohort> {
    const updatedCohort = await prisma.cohort.update({
      where: { id: cohortId },
      data: {
        currentEnrollment: {
          increment,
        },
        updatedAt: new Date(),
      },
    });

    // Update status if capacity is reached
    if (increment > 0 && updatedCohort.currentEnrollment >= updatedCohort.maxCapacity) {
      await CohortModel.updateStatus(cohortId, CohortStatus.FULL);
    } else if (increment < 0 && updatedCohort.status === CohortStatus.FULL && updatedCohort.currentEnrollment < updatedCohort.maxCapacity) {
      await CohortModel.updateStatus(cohortId, CohortStatus.OPEN_ENROLLMENT);
    }

    return CohortModel.findById(cohortId) as Promise<Cohort>;
  }

  /**
   * Get real-time capacity for a cohort
   */
  static async getCohortCapacity(cohortId: string): Promise<{
    cohortId: string;
    maximum: number;
    current: number;
    available: number;
    percentage: number;
    status: CohortStatus;
    canEnroll: boolean;
  }> {
    const cohort = await CohortModel.findById(cohortId);
    if (!cohort) {
      throw new Error('Cohort not found');
    }

    const available = Math.max(0, cohort.maxCapacity - cohort.currentEnrollment);
    const percentage = Math.round((cohort.currentEnrollment / cohort.maxCapacity) * 100);
    const canEnroll = cohort.status === CohortStatus.OPEN_ENROLLMENT && available > 0;

    return {
      cohortId: cohort.id,
      maximum: cohort.maxCapacity,
      current: cohort.currentEnrollment,
      available,
      percentage,
      status: cohort.status,
      canEnroll,
    };
  }

  /**
   * Translate status messages to Hebrew
   */
  static translateMessage(message: string | undefined, language: 'he' | 'en'): string {
    if (language === 'en' || !message) return message || '';

    const translations: Record<string, string> = {
      'Enrollment will open soon': 'ההרשמה תיפתח בקרוב',
      'Cohort is full': 'הקבוצה מלאה',
      'Cohort is full - join waitlist': 'הקבוצה מלאה - הצטרפו לרשימת המתנה',
      'Cohort has already started': 'הקבוצה כבר החלה',
      'Cohort has completed': 'הקבוצה הסתיימה',
      'No current cohort available': 'אין קבוצה פעילה כרגע',
    };

    return translations[message] || message;
  }

  /**
   * Get cohort enrollment trends
   */
  static async getEnrollmentTrends(cohortId: string): Promise<{
    dailyEnrollments: Array<{ date: string; count: number }>;
    projectedFillDate?: Date;
  }> {
    const cohort = await CohortModel.findById(cohortId);
    if (!cohort) {
      throw new Error('Cohort not found');
    }

    // Calculate daily enrollment trends - mock implementation
    const enrollments: any[] = []; // Would fetch with separate query
    const dailyEnrollments = enrollments.reduce((acc: Record<string, number>, enrollment: any) => {
      const date = enrollment.enrollmentDate.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const trends = Object.entries(dailyEnrollments)
      .map(([date, count]) => ({ date, count: count as number }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Simple projection based on recent trend
    let projectedFillDate: Date | undefined;
    if (cohort.currentEnrollment < cohort.maxCapacity && trends.length >= 7) {
      const recentTrends = trends.slice(-7);
      const avgDailyEnrollments = recentTrends.reduce((sum, t) => sum + (t.count as number), 0) / 7;

      if (avgDailyEnrollments > 0) {
        const remainingSpots = cohort.maxCapacity - cohort.currentEnrollment;
        const daysToFill = Math.ceil(remainingSpots / avgDailyEnrollments);
        projectedFillDate = new Date();
        projectedFillDate.setDate(projectedFillDate.getDate() + daysToFill);
      }
    }

    const result: {
      dailyEnrollments: Array<{ date: string; count: number }>;
      projectedFillDate?: Date;
    } = {
      dailyEnrollments: trends,
    };

    if (projectedFillDate) {
      result.projectedFillDate = projectedFillDate;
    }

    return result;
  }
}