import { Language, UserRole, User } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/database/connection';
import { UserWithRelations, UserCreateData as PrismaUserCreateData } from '@/types/prisma';

// Validation schemas
export const createUserSchema = z.object({
  cognitoId: z.string().min(1, 'Cognito ID is required'),
  email: z.string().email('Invalid email format'),
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50),
  phone: z.string().regex(/^(\+972|0)(5[0-9]|7[23479])-?\d{7}$/, 'Invalid Israeli phone number'),
  preferredLanguage: z.nativeEnum(Language).default(Language.HE),
  role: z.nativeEnum(UserRole).default(UserRole.STUDENT),
});

export const updateUserSchema = createUserSchema.partial().omit({ cognitoId: true });

export const userGDPRExportSchema = z.object({
  includeEnrollments: z.boolean().default(true),
  includePayments: z.boolean().default(false), // Sensitive data
  includeConsents: z.boolean().default(true),
});

export type CreateUserData = z.infer<typeof createUserSchema>;
export type UpdateUserData = z.infer<typeof updateUserSchema>;
export type UserGDPRExport = z.infer<typeof userGDPRExportSchema>;

// User model class
export class UserModel {
  /**
   * Create a new user
   */
  static async create(data: CreateUserData): Promise<UserWithRelations> {
    const validatedData = createUserSchema.parse(data);

    return prisma.user.create({
      data: validatedData,
      include: {
        enrollments: {
          include: {
            cohort: true,
            paymentTransactions: true,
          },
        },
        consultationRequests: true,
        privacyConsents: true,
      },
    });
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<UserWithRelations | null> {
    return prisma.user.findUnique({
      where: { id },
      include: {
        enrollments: {
          include: {
            cohort: true,
            paymentTransactions: true,
          },
        },
        consultationRequests: true,
        privacyConsents: true,
      },
    });
  }

  /**
   * Find user by Cognito ID
   */
  static async findByCognitoId(cognitoId: string): Promise<UserWithRelations | null> {
    return prisma.user.findUnique({
      where: { cognitoId },
      include: {
        enrollments: {
          include: {
            cohort: true,
            paymentTransactions: true,
          },
        },
        consultationRequests: true,
        privacyConsents: true,
      },
    });
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Update user
   */
  static async update(id: string, data: UpdateUserData): Promise<UserWithRelations> {
    const validatedData = updateUserSchema.parse(data);

    return prisma.user.update({
      where: { id },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
      include: {
        enrollments: {
          include: {
            cohort: true,
            paymentTransactions: true,
          },
        },
        consultationRequests: true,
        privacyConsents: true,
      },
    });
  }

  /**
   * Soft delete user (GDPR compliance)
   */
  static async softDelete(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        email: `deleted_${Date.now()}@deleted.local`, // Anonymize email
        phone: 'DELETED',
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Hard delete user (after 30-day retention period)
   */
  static async hardDelete(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Export user data for GDPR compliance
   */
  static async exportUserData(id: string, options: UserGDPRExport = {}): Promise<any> {
    const { includeEnrollments, includePayments, includeConsents } = userGDPRExportSchema.parse(options);

    const userData = await prisma.user.findUnique({
      where: { id },
      include: {
        enrollments: includeEnrollments ? {
          include: {
            cohort: true,
            paymentTransactions: includePayments,
          },
        } : false,
        consultationRequests: true,
        privacyConsents: includeConsents,
      },
    });

    if (!userData) {
      throw new Error('User not found');
    }

    // Remove sensitive fields
    const exportData = {
      personalInfo: {
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        preferredLanguage: userData.preferredLanguage,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
      },
      enrollments: userData.enrollments?.map(enrollment => ({
        id: enrollment.id,
        courseName: enrollment.cohort.name,
        status: enrollment.status,
        enrollmentDate: enrollment.enrollmentDate,
        paymentPlan: enrollment.paymentPlan,
        totalAmount: enrollment.totalAmount,
        questionnaire: enrollment.questionnaire,
      })),
      consultationRequests: userData.consultationRequests?.map(req => ({
        id: req.id,
        createdAt: req.createdAt,
        status: req.status,
        preferredTimeSlot: req.preferredTimeSlot,
        message: req.message,
      })),
      privacyConsents: userData.privacyConsents?.map(consent => ({
        consentType: consent.consentType,
        granted: consent.granted,
        version: consent.version,
        createdAt: consent.createdAt,
        revokedAt: consent.revokedAt,
      })),
      exportTimestamp: new Date().toISOString(),
    };

    return exportData;
  }

  /**
   * Get users scheduled for deletion
   */
  static async getUsersScheduledForDeletion(): Promise<User[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return prisma.user.findMany({
      where: {
        deletedAt: {
          lte: thirtyDaysAgo,
        },
      },
    });
  }

  /**
   * Check if email exists
   */
  static async emailExists(email: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return !!user;
  }

  /**
   * Check if Cognito ID exists
   */
  static async cognitoIdExists(cognitoId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { cognitoId },
      select: { id: true },
    });
    return !!user;
  }

  /**
   * Get user statistics
   */
  static async getStatistics() {
    const [totalUsers, activeStudents, instructors, recentSignups] = await Promise.all([
      prisma.user.count({
        where: { deletedAt: null },
      }),
      prisma.user.count({
        where: {
          role: UserRole.STUDENT,
          deletedAt: null,
          enrollments: {
            some: {
              status: 'ACTIVE',
            },
          },
        },
      }),
      prisma.user.count({
        where: {
          role: UserRole.INSTRUCTOR,
          deletedAt: null,
        },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
          deletedAt: null,
        },
      }),
    ]);

    return {
      totalUsers,
      activeStudents,
      instructors,
      recentSignups,
    };
  }

  /**
   * Update marketing consent for user (placeholder for privacy service)
   */
  static async updateMarketingConsent(userId: string, consent: boolean): Promise<void> {
    // This is a placeholder method referenced by privacy service
    // In a real implementation, this would update user preferences
    console.log(`User ${userId} marketing consent updated to: ${consent}`);

    // For now, we'll just log this. In production, you might:
    // 1. Update a user preferences table
    // 2. Update marketing flags in the user record
    // 3. Trigger email unsubscribe/subscribe workflows
  }
}