import { ConsultationRequest, RequestStatus, Language } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/database/connection';

// Validation schemas
export const createConsultationSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email format'),
  phone: z.string().regex(/^(\+972|0)(5[0-9]|7[23479])-?\d{7}$/, 'Invalid Israeli phone number'),
  preferredLanguage: z.nativeEnum(Language).default(Language.HE),
  preferredTimeSlot: z.string().min(1, 'Preferred time slot is required'),
  message: z.string().max(500).optional(),
  userId: z.string().uuid().optional(),
});

export const updateConsultationSchema = z.object({
  status: z.nativeEnum(RequestStatus).optional(),
  processedAt: z.date().optional(),
  message: z.string().max(500).optional(),
});

export type CreateConsultationData = z.infer<typeof createConsultationSchema>;
export type UpdateConsultationData = z.infer<typeof updateConsultationSchema>;

export class ConsultationModel {
  /**
   * Create a new consultation request
   */
  static async create(data: CreateConsultationData): Promise<ConsultationRequest> {
    const validatedData = createConsultationSchema.parse(data);

    // Check for recent duplicate requests from same email/phone
    const recentRequest = await prisma.consultationRequest.findFirst({
      where: {
        OR: [
          { email: validatedData.email },
          { phone: validatedData.phone },
        ],
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    if (recentRequest) {
      throw new Error('A consultation request has already been submitted recently');
    }

    return prisma.consultationRequest.create({
      data: {
        ...validatedData,
        status: RequestStatus.NEW,
      },
    });
  }

  /**
   * Find consultation request by ID
   */
  static async findById(id: string): Promise<ConsultationRequest | null> {
    return prisma.consultationRequest.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });
  }

  /**
   * Find consultation requests by status
   */
  static async findByStatus(status: RequestStatus): Promise<ConsultationRequest[]> {
    return prisma.consultationRequest.findMany({
      where: { status },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Find consultation requests by email
   */
  static async findByEmail(email: string): Promise<ConsultationRequest[]> {
    return prisma.consultationRequest.findMany({
      where: { email },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get all consultation requests with optional filtering
   */
  static async findAll(filters?: {
    status?: RequestStatus;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<ConsultationRequest[]> {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    return prisma.consultationRequest.findMany({
      where,
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: filters?.limit,
      skip: filters?.offset,
    });
  }

  /**
   * Update consultation request
   */
  static async update(id: string, data: UpdateConsultationData): Promise<ConsultationRequest> {
    const validatedData = updateConsultationSchema.parse(data);

    const consultation = await prisma.consultationRequest.findUnique({
      where: { id },
    });

    if (!consultation) {
      throw new Error('Consultation request not found');
    }

    return prisma.consultationRequest.update({
      where: { id },
      data: {
        ...validatedData,
        processedAt: data.status && data.status !== RequestStatus.NEW ? new Date() : consultation.processedAt,
      },
      include: {
        user: true,
      },
    });
  }

  /**
   * Update consultation status
   */
  static async updateStatus(id: string, status: RequestStatus): Promise<ConsultationRequest> {
    const consultation = await prisma.consultationRequest.findUnique({
      where: { id },
    });

    if (!consultation) {
      throw new Error('Consultation request not found');
    }

    // Validate status transition
    this.validateStatusTransition(consultation.status, status);

    return prisma.consultationRequest.update({
      where: { id },
      data: {
        status,
        processedAt: status !== RequestStatus.NEW ? new Date() : null,
      },
      include: {
        user: true,
      },
    });
  }

  /**
   * Link consultation request to user
   */
  static async linkToUser(id: string, userId: string): Promise<ConsultationRequest> {
    return prisma.consultationRequest.update({
      where: { id },
      data: {
        userId,
      },
      include: {
        user: true,
      },
    });
  }

  /**
   * Delete consultation request
   */
  static async delete(id: string): Promise<void> {
    const consultation = await prisma.consultationRequest.findUnique({
      where: { id },
    });

    if (!consultation) {
      throw new Error('Consultation request not found');
    }

    await prisma.consultationRequest.delete({
      where: { id },
    });
  }

  /**
   * Get consultation statistics
   */
  static async getStatistics(filters?: {
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [
      totalRequests,
      newRequests,
      contactedRequests,
      scheduledRequests,
      completedRequests,
      cancelledRequests,
    ] = await Promise.all([
      prisma.consultationRequest.count({ where }),
      prisma.consultationRequest.count({ where: { ...where, status: RequestStatus.NEW } }),
      prisma.consultationRequest.count({ where: { ...where, status: RequestStatus.CONTACTED } }),
      prisma.consultationRequest.count({ where: { ...where, status: RequestStatus.SCHEDULED } }),
      prisma.consultationRequest.count({ where: { ...where, status: RequestStatus.COMPLETED } }),
      prisma.consultationRequest.count({ where: { ...where, status: RequestStatus.CANCELLED } }),
    ]);

    // Calculate conversion rate
    const conversionRate = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0;

    // Calculate average response time
    const processedRequests = await prisma.consultationRequest.findMany({
      where: {
        ...where,
        status: {
          not: RequestStatus.NEW,
        },
        processedAt: {
          not: null,
        },
      },
      select: {
        createdAt: true,
        processedAt: true,
      },
    });

    const avgResponseTime = processedRequests.length > 0
      ? processedRequests.reduce((sum, req) => {
          const responseTime = req.processedAt!.getTime() - req.createdAt.getTime();
          return sum + responseTime;
        }, 0) / processedRequests.length / (1000 * 60 * 60) // Convert to hours
      : 0;

    return {
      totalRequests,
      statusBreakdown: {
        new: newRequests,
        contacted: contactedRequests,
        scheduled: scheduledRequests,
        completed: completedRequests,
        cancelled: cancelledRequests,
      },
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageResponseTimeHours: Math.round(avgResponseTime * 100) / 100,
    };
  }

  /**
   * Get requests requiring attention
   */
  static async getRequestsRequiringAttention(): Promise<{
    newRequests: ConsultationRequest[];
    overdue: ConsultationRequest[];
    followUpNeeded: ConsultationRequest[];
  }> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const [newRequests, overdue, followUpNeeded] = await Promise.all([
      // New requests not yet contacted
      prisma.consultationRequest.findMany({
        where: {
          status: RequestStatus.NEW,
        },
        include: { user: true },
        orderBy: { createdAt: 'asc' },
      }),
      // Requests older than 24 hours without response
      prisma.consultationRequest.findMany({
        where: {
          status: RequestStatus.NEW,
          createdAt: { lte: oneDayAgo },
        },
        include: { user: true },
        orderBy: { createdAt: 'asc' },
      }),
      // Contacted requests older than 3 days without follow-up
      prisma.consultationRequest.findMany({
        where: {
          status: RequestStatus.CONTACTED,
          processedAt: { lte: threeDaysAgo },
        },
        include: { user: true },
        orderBy: { processedAt: 'asc' },
      }),
    ]);

    return {
      newRequests,
      overdue,
      followUpNeeded,
    };
  }

  /**
   * Get daily consultation request trends
   */
  static async getDailyTrends(days: number = 30): Promise<Array<{
    date: string;
    count: number;
    completed: number;
  }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const requests = await prisma.consultationRequest.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        status: true,
      },
    });

    // Group by date
    const dailyData: Record<string, { count: number; completed: number }> = {};

    requests.forEach(request => {
      const date = request.createdAt.toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { count: 0, completed: 0 };
      }
      dailyData[date].count++;
      if (request.status === RequestStatus.COMPLETED) {
        dailyData[date].completed++;
      }
    });

    return Object.entries(dailyData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Validate status transitions
   */
  private static validateStatusTransition(currentStatus: RequestStatus, newStatus: RequestStatus): void {
    const validTransitions: Record<RequestStatus, RequestStatus[]> = {
      [RequestStatus.NEW]: [RequestStatus.CONTACTED, RequestStatus.CANCELLED],
      [RequestStatus.CONTACTED]: [RequestStatus.SCHEDULED, RequestStatus.CANCELLED],
      [RequestStatus.SCHEDULED]: [RequestStatus.COMPLETED, RequestStatus.CANCELLED],
      [RequestStatus.COMPLETED]: [], // Final state
      [RequestStatus.CANCELLED]: [], // Final state
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  /**
   * Check if email has recent requests
   */
  static async hasRecentRequest(email: string, hoursAgo: number = 24): Promise<boolean> {
    const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    const recentRequest = await prisma.consultationRequest.findFirst({
      where: {
        email,
        createdAt: { gte: cutoffTime },
      },
    });

    return !!recentRequest;
  }

  /**
   * Get consultation requests by user
   */
  static async findByUserId(userId: string): Promise<ConsultationRequest[]> {
    return prisma.consultationRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Archive old completed/cancelled requests
   */
  static async archiveOldRequests(monthsOld: number = 12): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsOld);

    const result = await prisma.consultationRequest.deleteMany({
      where: {
        status: {
          in: [RequestStatus.COMPLETED, RequestStatus.CANCELLED],
        },
        createdAt: {
          lte: cutoffDate,
        },
      },
    });

    return result.count;
  }
}