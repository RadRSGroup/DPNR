import { PaymentTransaction, TransactionStatus } from '@prisma/client';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '@/database/connection';

// Validation schemas
export const createPaymentTransactionSchema = z.object({
  enrollmentId: z.string().uuid(),
  tranzillaReference: z.string().min(1),
  amount: z.number().positive(),
  installmentNumber: z.number().int().positive().optional(),
  paymentMethod: z.string().min(1),
  failureReason: z.string().optional(),
});

export const updatePaymentTransactionSchema = z.object({
  status: z.nativeEnum(TransactionStatus).optional(),
  failureReason: z.string().optional(),
  processedAt: z.date().optional(),
});

export type CreatePaymentTransactionData = z.infer<typeof createPaymentTransactionSchema>;
export type UpdatePaymentTransactionData = z.infer<typeof updatePaymentTransactionSchema>;

export class PaymentTransactionModel {
  /**
   * Create a new payment transaction
   */
  static async create(data: CreatePaymentTransactionData): Promise<PaymentTransaction> {
    const validatedData = createPaymentTransactionSchema.parse(data);

    return prisma.paymentTransaction.create({
      data: {
        ...validatedData,
        amount: new Decimal(validatedData.amount),
        status: TransactionStatus.PENDING,
      },
      include: {
        enrollment: {
          include: {
            user: true,
            cohort: true,
          },
        },
      },
    });
  }

  /**
   * Find transaction by ID
   */
  static async findById(id: string): Promise<PaymentTransaction | null> {
    return prisma.paymentTransaction.findUnique({
      where: { id },
      include: {
        enrollment: {
          include: {
            user: true,
            cohort: true,
          },
        },
      },
    });
  }

  /**
   * Find transaction by Tranzilla reference
   */
  static async findByTranzillaReference(reference: string): Promise<PaymentTransaction | null> {
    return prisma.paymentTransaction.findUnique({
      where: { tranzillaReference: reference },
      include: {
        enrollment: true,
      },
    });
  }

  /**
   * Find transactions by enrollment ID
   */
  static async findByEnrollmentId(enrollmentId: string): Promise<PaymentTransaction[]> {
    return prisma.paymentTransaction.findMany({
      where: { enrollmentId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Update transaction
   */
  static async update(id: string, data: UpdatePaymentTransactionData): Promise<PaymentTransaction> {
    const validatedData = updatePaymentTransactionSchema.parse(data);

    return prisma.paymentTransaction.update({
      where: { id },
      data: {
        ...validatedData,
        processedAt: validatedData.status === TransactionStatus.SUCCESS || validatedData.status === TransactionStatus.FAILED
          ? new Date()
          : validatedData.processedAt,
      },
      include: {
        enrollment: {
          include: {
            user: true,
            cohort: true,
          },
        },
      },
    });
  }

  /**
   * Update transaction status
   */
  static async updateStatus(id: string, status: TransactionStatus, failureReason?: string): Promise<PaymentTransaction> {
    return this.update(id, {
      status,
      failureReason,
      processedAt: new Date(),
    });
  }

  /**
   * Get payment statistics
   */
  static async getStatistics(filters?: {
    startDate?: Date;
    endDate?: Date;
    enrollmentId?: string;
  }) {
    const where: any = {};

    if (filters?.enrollmentId) {
      where.enrollmentId = filters.enrollmentId;
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

    const [
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      pendingTransactions,
      totalRevenue,
    ] = await Promise.all([
      prisma.paymentTransaction.count({ where }),
      prisma.paymentTransaction.count({ where: { ...where, status: TransactionStatus.SUCCESS } }),
      prisma.paymentTransaction.count({ where: { ...where, status: TransactionStatus.FAILED } }),
      prisma.paymentTransaction.count({ where: { ...where, status: TransactionStatus.PENDING } }),
      prisma.paymentTransaction.aggregate({
        where: { ...where, status: TransactionStatus.SUCCESS },
        _sum: { amount: true },
      }),
    ]);

    const successRate = totalTransactions > 0
      ? Math.round((successfulTransactions / totalTransactions) * 100 * 100) / 100
      : 0;

    return {
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      pendingTransactions,
      successRate,
      totalRevenue: totalRevenue._sum.amount?.toNumber() || 0,
    };
  }

  /**
   * Get failed transactions for retry
   */
  static async getFailedTransactions(hoursAgo: number = 24): Promise<PaymentTransaction[]> {
    const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    return prisma.paymentTransaction.findMany({
      where: {
        status: TransactionStatus.FAILED,
        createdAt: { gte: cutoffTime },
      },
      include: {
        enrollment: {
          include: {
            user: true,
            cohort: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get pending transactions requiring attention
   */
  static async getPendingTransactions(): Promise<PaymentTransaction[]> {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    return prisma.paymentTransaction.findMany({
      where: {
        status: TransactionStatus.PENDING,
        createdAt: { lte: twoHoursAgo },
      },
      include: {
        enrollment: {
          include: {
            user: true,
            cohort: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Get user's payment history
   */
  static async getUserPaymentHistory(userId: string): Promise<PaymentTransaction[]> {
    return prisma.paymentTransaction.findMany({
      where: {
        enrollment: {
          userId,
        },
      },
      include: {
        enrollment: {
          include: {
            cohort: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get refundable transactions
   */
  static async getRefundableTransactions(): Promise<PaymentTransaction[]> {
    return prisma.paymentTransaction.findMany({
      where: {
        status: TransactionStatus.SUCCESS,
        enrollment: {
          status: {
            in: ['CANCELLED', 'REFUNDED'],
          },
        },
      },
      include: {
        enrollment: {
          include: {
            user: true,
            cohort: true,
          },
        },
      },
      orderBy: {
        processedAt: 'desc',
      },
    });
  }

  /**
   * Find transactions by user ID (for privacy service)
   */
  static async findByUserId(userId: string): Promise<PaymentTransaction[]> {
    return prisma.paymentTransaction.findMany({
      where: {
        enrollment: {
          userId,
        },
      },
      include: {
        enrollment: {
          include: {
            cohort: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}