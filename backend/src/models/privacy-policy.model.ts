import { PrismaClient } from '@prisma/client';

import prisma from '@/database/connection';

export type PolicyType = 'PRIVACY_POLICY' | 'TERMS_OF_SERVICE' | 'COOKIE_POLICY';

export interface PrivacyPolicy {
  id: string;
  type: PolicyType;
  version: string;
  content: string;
  summary?: string;
  effectiveDate: Date;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePolicyParams {
  type: PolicyType;
  version: string;
  content: string;
  summary?: string;
  effectiveDate: Date;
  createdBy: string;
}

export class PrivacyPolicyModel {
  /**
   * Create new policy version
   */
  static async create(params: CreatePolicyParams): Promise<PrivacyPolicy> {
    // Deactivate previous version of the same type
    await prisma.privacyPolicy.updateMany({
      where: {
        type: params.type,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Create new policy version
    const policy = await prisma.privacyPolicy.create({
      data: {
        type: params.type,
        version: params.version,
        content: params.content,
        summary: params.summary,
        effectiveDate: params.effectiveDate,
        isActive: true,
        createdBy: params.createdBy,
      },
    });

    return policy as PrivacyPolicy;
  }

  /**
   * Get current active versions of all policy types
   */
  static async getCurrentVersions(): Promise<PrivacyPolicy[]> {
    const policies = await prisma.privacyPolicy.findMany({
      where: { isActive: true },
      orderBy: { type: 'asc' },
    });

    return policies as PrivacyPolicy[];
  }

  /**
   * Get current version of specific policy type
   */
  static async getCurrentVersion(type: PolicyType): Promise<PrivacyPolicy | null> {
    const policy = await prisma.privacyPolicy.findFirst({
      where: {
        type,
        isActive: true,
      },
      orderBy: { effectiveDate: 'desc' },
    });

    return policy as PrivacyPolicy | null;
  }

  /**
   * Get policy by ID
   */
  static async findById(id: string): Promise<PrivacyPolicy | null> {
    const policy = await prisma.privacyPolicy.findUnique({
      where: { id },
    });

    return policy as PrivacyPolicy | null;
  }

  /**
   * Get all versions of a policy type
   */
  static async getVersionHistory(type: PolicyType): Promise<PrivacyPolicy[]> {
    const policies = await prisma.privacyPolicy.findMany({
      where: { type },
      orderBy: { effectiveDate: 'desc' },
    });

    return policies as PrivacyPolicy[];
  }

  /**
   * Get policy version that was active at a specific date
   */
  static async getVersionAtDate(type: PolicyType, date: Date): Promise<PrivacyPolicy | null> {
    const policy = await prisma.privacyPolicy.findFirst({
      where: {
        type,
        effectiveDate: { lte: date },
      },
      orderBy: { effectiveDate: 'desc' },
    });

    return policy as PrivacyPolicy | null;
  }

  /**
   * Update policy
   */
  static async update(id: string, data: Partial<CreatePolicyParams>): Promise<PrivacyPolicy> {
    const policy = await prisma.privacyPolicy.update({
      where: { id },
      data,
    });

    return policy as PrivacyPolicy;
  }

  /**
   * Deactivate policy
   */
  static async deactivate(id: string): Promise<PrivacyPolicy> {
    const policy = await prisma.privacyPolicy.update({
      where: { id },
      data: { isActive: false },
    });

    return policy as PrivacyPolicy;
  }

  /**
   * Get all policies with filtering
   */
  static async findAll(filters: {
    type?: PolicyType;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    policies: PrivacyPolicy[];
    total: number;
    limit?: number;
    offset?: number;
  }> {
    const where: any = {};

    if (filters.type) where.type = filters.type;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;

    const [policies, total] = await Promise.all([
      prisma.privacyPolicy.findMany({
        where,
        orderBy: [{ type: 'asc' }, { effectiveDate: 'desc' }],
        take: filters.limit,
        skip: filters.offset,
      }),
      prisma.privacyPolicy.count({ where }),
    ]);

    return {
      policies: policies as PrivacyPolicy[],
      total,
      limit: filters.limit,
      offset: filters.offset,
    };
  }

  /**
   * Check if a policy version exists
   */
  static async versionExists(type: PolicyType, version: string): Promise<boolean> {
    const policy = await prisma.privacyPolicy.findFirst({
      where: { type, version },
    });

    return !!policy;
  }

  /**
   * Get policy statistics
   */
  static async getStatistics(): Promise<{
    totalPolicies: number;
    activePolicies: number;
    policyTypes: { type: PolicyType; versions: number; latestVersion: string }[];
  }> {
    const totalPolicies = await prisma.privacyPolicy.count();
    const activePolicies = await prisma.privacyPolicy.count({
      where: { isActive: true },
    });

    // Get version counts by type
    const versionStats = await prisma.privacyPolicy.groupBy({
      by: ['type'],
      _count: { version: true },
    });

    // Get latest version for each type
    const latestVersions = await Promise.all(
      versionStats.map(async (stat) => {
        const latest = await prisma.privacyPolicy.findFirst({
          where: { type: stat.type as PolicyType },
          orderBy: { effectiveDate: 'desc' },
          select: { version: true },
        });

        return {
          type: stat.type as PolicyType,
          versions: stat._count.version,
          latestVersion: latest?.version || 'N/A',
        };
      })
    );

    return {
      totalPolicies,
      activePolicies,
      policyTypes: latestVersions,
    };
  }

  /**
   * Clean up old inactive policies (maintenance task)
   */
  static async cleanupOldVersions(
    keepVersionsPerType: number = 5
  ): Promise<{ deletedCount: number }> {
    const policyTypes: PolicyType[] = ['PRIVACY_POLICY', 'TERMS_OF_SERVICE', 'COOKIE_POLICY'];

    let totalDeleted = 0;

    for (const type of policyTypes) {
      // Get all versions of this type, ordered by effective date (newest first)
      const versions = await prisma.privacyPolicy.findMany({
        where: { type },
        orderBy: { effectiveDate: 'desc' },
        select: { id: true },
      });

      // Keep the first N versions, delete the rest
      if (versions.length > keepVersionsPerType) {
        const versionsToDelete = versions.slice(keepVersionsPerType);
        const idsToDelete = versionsToDelete.map(v => v.id);

        const result = await prisma.privacyPolicy.deleteMany({
          where: {
            id: { in: idsToDelete },
            isActive: false, // Only delete inactive versions
          },
        });

        totalDeleted += result.count;
      }
    }

    return { deletedCount: totalDeleted };
  }
}