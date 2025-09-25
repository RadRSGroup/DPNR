import { PrismaClient } from '@prisma/client';

import prisma from '@/database/connection';

export type DataPortabilityStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
export type DataFormat = 'JSON' | 'CSV' | 'XML';
export type DataType = 'PROFILE' | 'ENROLLMENTS' | 'PAYMENTS' | 'CONSULTATIONS' | 'CONSENTS' | 'ACTIVITY_LOGS';

export interface DataPortabilityRequest {
  id: string;
  userId: string;
  format: DataFormat;
  includeHistory: boolean;
  dataTypes: DataType[];
  status: DataPortabilityStatus;
  progress: number;
  downloadUrl?: string;
  estimatedCompletionTime: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

export interface CreateDataPortabilityRequestParams {
  userId: string;
  format: DataFormat;
  includeHistory: boolean;
  dataTypes: DataType[];
  estimatedCompletionTime: Date;
  expiresAt: Date;
}

export class DataPortabilityRequestModel {
  /**
   * Create new data portability request
   */
  static async create(params: CreateDataPortabilityRequestParams): Promise<DataPortabilityRequest> {
    const request = await prisma.dataPortabilityRequest.create({
      data: {
        userId: params.userId,
        format: params.format,
        includeHistory: params.includeHistory,
        dataTypes: params.dataTypes,
        status: 'PENDING',
        progress: 0,
        estimatedCompletionTime: params.estimatedCompletionTime,
        expiresAt: params.expiresAt,
      },
    });

    return request as DataPortabilityRequest;
  }

  /**
   * Find request by ID
   */
  static async findById(id: string): Promise<DataPortabilityRequest | null> {
    const request = await prisma.dataPortabilityRequest.findUnique({
      where: { id },
    });

    return request as DataPortabilityRequest | null;
  }

  /**
   * Find requests by user ID
   */
  static async findByUserId(userId: string): Promise<DataPortabilityRequest[]> {
    const requests = await prisma.dataPortabilityRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return requests as DataPortabilityRequest[];
  }

  /**
   * Update request status
   */
  static async updateStatus(
    id: string,
    status: DataPortabilityStatus,
    errorMessage?: string
  ): Promise<DataPortabilityRequest> {
    const updateData: any = { status };

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
      updateData.progress = 100;
    }

    const request = await prisma.dataPortabilityRequest.update({
      where: { id },
      data: updateData,
    });

    return request as DataPortabilityRequest;
  }

  /**
   * Update progress
   */
  static async updateProgress(id: string, progress: number): Promise<DataPortabilityRequest> {
    const request = await prisma.dataPortabilityRequest.update({
      where: { id },
      data: {
        progress: Math.min(100, Math.max(0, progress)),
        status: progress >= 100 ? 'COMPLETED' : 'PROCESSING',
      },
    });

    return request as DataPortabilityRequest;
  }

  /**
   * Complete request with download URL
   */
  static async complete(id: string, downloadUrl: string): Promise<DataPortabilityRequest> {
    const request = await prisma.dataPortabilityRequest.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        progress: 100,
        downloadUrl,
        completedAt: new Date(),
      },
    });

    return request as DataPortabilityRequest;
  }

  /**
   * Get pending requests for processing
   */
  static async getPendingRequests(limit: number = 10): Promise<DataPortabilityRequest[]> {
    const requests = await prisma.dataPortabilityRequest.findMany({
      where: {
        status: { in: ['PENDING', 'PROCESSING'] },
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return requests as DataPortabilityRequest[];
  }

  /**
   * Get all requests with filtering
   */
  static async findAll(filters: {
    userId?: string;
    status?: DataPortabilityStatus;
    format?: DataFormat;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    requests: DataPortabilityRequest[];
    total: number;
    limit?: number;
    offset?: number;
  }> {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.status) where.status = filters.status;
    if (filters.format) where.format = filters.format;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [requests, total] = await Promise.all([
      prisma.dataPortabilityRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit,
        skip: filters.offset,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.dataPortabilityRequest.count({ where }),
    ]);

    return {
      requests: requests as DataPortabilityRequest[],
      total,
      limit: filters.limit,
      offset: filters.offset,
    };
  }

  /**
   * Check if user has recent pending request
   */
  static async hasRecentPendingRequest(
    userId: string,
    withinHours: number = 24
  ): Promise<boolean> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - withinHours);

    const request = await prisma.dataPortabilityRequest.findFirst({
      where: {
        userId,
        status: { in: ['PENDING', 'PROCESSING'] },
        createdAt: { gte: cutoffDate },
      },
    });

    return !!request;
  }

  /**
   * Mark expired requests
   */
  static async markExpiredRequests(): Promise<number> {
    const result = await prisma.dataPortabilityRequest.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        status: { in: ['PENDING', 'PROCESSING', 'COMPLETED'] },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    return result.count;
  }

  /**
   * Clean up old expired requests
   */
  static async cleanupExpiredRequests(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await prisma.dataPortabilityRequest.deleteMany({
      where: {
        status: 'EXPIRED',
        expiresAt: { lt: cutoffDate },
      },
    });

    return result.count;
  }

  /**
   * Get statistics for admin dashboard
   */
  static async getStatistics(filters: {
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<{
    overview: {
      totalRequests: number;
      pendingRequests: number;
      completedRequests: number;
      failedRequests: number;
      averageProcessingTime: number;
    };
    byFormat: Array<{ format: DataFormat; count: number }>;
    byStatus: Array<{ status: DataPortabilityStatus; count: number }>;
    trends: Array<{ date: string; count: number }>;
  }> {
    const where: any = {};

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    // Overview statistics
    const [
      totalRequests,
      pendingRequests,
      completedRequests,
      failedRequests,
      completedWithTime,
    ] = await Promise.all([
      prisma.dataPortabilityRequest.count({ where }),
      prisma.dataPortabilityRequest.count({ where: { ...where, status: 'PENDING' } }),
      prisma.dataPortabilityRequest.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.dataPortabilityRequest.count({ where: { ...where, status: 'FAILED' } }),
      prisma.dataPortabilityRequest.findMany({
        where: {
          ...where,
          status: 'COMPLETED',
          completedAt: { not: null },
        },
        select: { createdAt: true, completedAt: true },
      }),
    ]);

    // Calculate average processing time
    let averageProcessingTime = 0;
    if (completedWithTime.length > 0) {
      const totalProcessingTime = completedWithTime.reduce((sum, req) => {
        const processingTime = req.completedAt!.getTime() - req.createdAt.getTime();
        return sum + processingTime;
      }, 0);
      averageProcessingTime = totalProcessingTime / completedWithTime.length / (1000 * 60 * 60); // Convert to hours
    }

    // Statistics by format
    const byFormat = await prisma.dataPortabilityRequest.groupBy({
      by: ['format'],
      where,
      _count: true,
    });

    // Statistics by status
    const byStatus = await prisma.dataPortabilityRequest.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    // Daily trends
    const trends = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as count
      FROM data_portability_request
      WHERE 1=1
        ${filters.startDate ? `AND created_at >= ${filters.startDate}` : ''}
        ${filters.endDate ? `AND created_at <= ${filters.endDate}` : ''}
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    return {
      overview: {
        totalRequests,
        pendingRequests,
        completedRequests,
        failedRequests,
        averageProcessingTime,
      },
      byFormat: byFormat.map(item => ({
        format: item.format as DataFormat,
        count: item._count,
      })),
      byStatus: byStatus.map(item => ({
        status: item.status as DataPortabilityStatus,
        count: item._count,
      })),
      trends: trends.map(item => ({
        date: item.date,
        count: Number(item.count),
      })),
    };
  }

  /**
   * Delete request
   */
  static async delete(id: string): Promise<void> {
    await prisma.dataPortabilityRequest.delete({
      where: { id },
    });
  }
}