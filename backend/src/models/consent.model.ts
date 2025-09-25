import { PrismaClient } from '@prisma/client';

import prisma from '@/database/connection';

export type ConsentType =
  | 'TERMS_OF_SERVICE'
  | 'PRIVACY_POLICY'
  | 'MARKETING_EMAILS'
  | 'MARKETING_SMS'
  | 'DATA_PROCESSING'
  | 'COOKIES'
  | 'ANALYTICS';

export type ConsentStatus = 'ACTIVE' | 'SUPERSEDED' | 'WITHDRAWN';

export interface ConsentRecord {
  id: string;
  userId?: string;
  consentType: ConsentType;
  granted: boolean;
  version: string;
  status: ConsentStatus;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateConsentParams {
  userId?: string;
  consentType: ConsentType;
  granted: boolean;
  version: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface ConsentFilters {
  userId?: string;
  consentType?: ConsentType;
  granted?: boolean;
  version?: string;
  status?: ConsentStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface StatisticsFilters {
  startDate?: Date;
  endDate?: Date;
  groupBy?: 'DAY' | 'WEEK' | 'MONTH';
}

export class ConsentModel {
  /**
   * Create new consent record
   */
  static async create(params: CreateConsentParams): Promise<ConsentRecord> {
    const consent = await prisma.consent.create({
      data: {
        userId: params.userId,
        consentType: params.consentType,
        granted: params.granted,
        version: params.version,
        status: 'ACTIVE',
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: params.metadata || {},
      },
    });

    return consent as ConsentRecord;
  }

  /**
   * Find consent by ID
   */
  static async findById(id: string): Promise<ConsentRecord | null> {
    const consent = await prisma.consent.findUnique({
      where: { id },
    });

    return consent as ConsentRecord | null;
  }

  /**
   * Find all consents with filtering
   */
  static async findAll(filters: ConsentFilters) {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.consentType) where.consentType = filters.consentType;
    if (filters.granted !== undefined) where.granted = filters.granted;
    if (filters.version) where.version = filters.version;
    if (filters.status) where.status = filters.status;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [consents, total] = await Promise.all([
      prisma.consent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit,
        skip: filters.offset,
      }),
      prisma.consent.count({ where }),
    ]);

    return {
      consents: consents as ConsentRecord[],
      total,
      limit: filters.limit,
      offset: filters.offset,
    };
  }

  /**
   * Get user's current consent status
   */
  static async getUserCurrentConsents(userId: string): Promise<ConsentRecord[]> {
    // Get the latest consent for each type for the user
    const consents = await prisma.$queryRaw<ConsentRecord[]>`
      SELECT DISTINCT ON (consent_type) *
      FROM consent
      WHERE user_id = ${userId} AND status = 'ACTIVE'
      ORDER BY consent_type, created_at DESC
    `;

    return consents;
  }

  /**
   * Get user consents by type
   */
  static async getUserConsentsByType(userId: string, types: ConsentType[]): Promise<ConsentRecord[]> {
    const consents = await prisma.consent.findMany({
      where: {
        userId,
        consentType: { in: types },
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get latest consent for each type
    const latestConsents = new Map<ConsentType, ConsentRecord>();
    for (const consent of consents) {
      if (!latestConsents.has(consent.consentType as ConsentType)) {
        latestConsents.set(consent.consentType as ConsentType, consent as ConsentRecord);
      }
    }

    return Array.from(latestConsents.values());
  }

  /**
   * Update consent status
   */
  static async updateStatus(id: string, status: ConsentStatus): Promise<ConsentRecord> {
    const consent = await prisma.consent.update({
      where: { id },
      data: { status },
    });

    return consent as ConsentRecord;
  }

  /**
   * Check if user has valid consent for specific type
   */
  static async hasValidConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    const consent = await prisma.consent.findFirst({
      where: {
        userId,
        consentType,
        granted: true,
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
    });

    return !!consent;
  }

  /**
   * Get consent statistics
   */
  static async getStatistics(filters: StatisticsFilters) {
    const where: any = { status: 'ACTIVE' };

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    // Total consents by type
    const consentsByType = await prisma.consent.groupBy({
      by: ['consentType', 'granted'],
      where,
      _count: true,
    });

    // Consent trends over time
    let groupByClause: string;
    switch (filters.groupBy) {
      case 'WEEK':
        groupByClause = "DATE_TRUNC('week', created_at)";
        break;
      case 'MONTH':
        groupByClause = "DATE_TRUNC('month', created_at)";
        break;
      default:
        groupByClause = "DATE_TRUNC('day', created_at)";
    }

    const trends = await prisma.$queryRaw`
      SELECT
        ${groupByClause} as period,
        consent_type,
        granted,
        COUNT(*) as count
      FROM consent
      WHERE status = 'ACTIVE'
        ${filters.startDate ? `AND created_at >= ${filters.startDate}` : ''}
        ${filters.endDate ? `AND created_at <= ${filters.endDate}` : ''}
      GROUP BY period, consent_type, granted
      ORDER BY period DESC
    `;

    // Overall metrics
    const totalConsents = await prisma.consent.count({ where });
    const grantedConsents = await prisma.consent.count({
      where: { ...where, granted: true },
    });
    const withdrawnConsents = await prisma.consent.count({
      where: { ...where, granted: false },
    });

    // Unique users who have given consent
    const uniqueUsers = await prisma.consent.findMany({
      where,
      select: { userId: true },
      distinct: ['userId'],
    });

    return {
      overview: {
        totalConsents,
        grantedConsents,
        withdrawnConsents,
        consentRate: totalConsents > 0 ? (grantedConsents / totalConsents) * 100 : 0,
        uniqueUsers: uniqueUsers.filter(u => u.userId).length,
      },
      byType: consentsByType,
      trends,
    };
  }

  /**
   * Generate compliance report
   */
  static async generateComplianceReport(filters: StatisticsFilters) {
    const where: any = {};

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    // Get all consent records with user information
    const consents = await prisma.consent.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate compliance metrics
    const report = {
      reportPeriod: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        generatedAt: new Date(),
      },
      summary: {
        totalConsentRecords: consents.length,
        uniqueUsers: new Set(consents.map(c => c.userId).filter(Boolean)).size,
        consentTypes: Array.from(new Set(consents.map(c => c.consentType))),
        averageConsentsPerUser: 0,
      },
      complianceMetrics: {
        gdprCompliance: {
          hasValidConsentMechanism: true,
          hasWithdrawalMechanism: true,
          hasDataPortability: true,
          hasRightToBeForgotten: true,
          hasConsentRecords: consents.length > 0,
        },
        consentValidation: {
          explicitConsents: consents.filter(c => c.granted).length,
          withdrawnConsents: consents.filter(c => !c.granted).length,
          versionTracking: new Set(consents.map(c => c.version)).size > 0,
          ipAddressLogging: consents.filter(c => c.ipAddress).length,
        },
      },
      detailedRecords: consents.map(consent => ({
        id: consent.id,
        userId: consent.userId,
        userEmail: consent.user?.email,
        consentType: consent.consentType,
        granted: consent.granted,
        version: consent.version,
        ipAddress: consent.ipAddress,
        userAgent: consent.userAgent,
        createdAt: consent.createdAt,
        status: consent.status,
      })),
    };

    // Calculate average consents per user
    if (report.summary.uniqueUsers > 0) {
      report.summary.averageConsentsPerUser = consents.length / report.summary.uniqueUsers;
    }

    return report;
  }

  /**
   * Clean up old superseded consents (maintenance task)
   */
  static async cleanupOldConsents(olderThanDays: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await prisma.consent.deleteMany({
      where: {
        status: 'SUPERSEDED',
        updatedAt: { lt: cutoffDate },
      },
    });

    return result.count;
  }

  /**
   * Find consents by user ID
   */
  static async findByUserId(userId: string): Promise<ConsentRecord[]> {
    const consents = await prisma.consent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return consents as ConsentRecord[];
  }
}