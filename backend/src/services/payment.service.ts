import { TransactionStatus } from '@prisma/client';
import type { PaymentTransaction, Enrollment } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Tranzila payment schemas
export const createPaymentSchema = z.object({
  enrollmentId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMethod: z.object({
    token: z.string().min(1),
    cardLast4: z.string().length(4).optional(),
    cardType: z.string().optional(),
  }),
  installmentNumber: z.number().int().min(1).optional(),
  saveCard: z.boolean().default(false),
});

export const webhookPayloadSchema = z.object({
  reference: z.string(),
  status: z.string(),
  amount: z.number(),
  currency: z.string().default('ILS'),
  transactionId: z.string(),
  signature: z.string(),
});

export type CreatePaymentData = z.infer<typeof createPaymentSchema>;
export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;

// Tranzila API configuration
const TRANZILA_CONFIG = {
  terminal: process.env.TRANZILA_TERMINAL!,
  apiKey: process.env.TRANZILA_API_KEY!,
  baseUrl: process.env.TRANZILA_MODE === 'production'
    ? 'https://secure5.tranzila.com'
    : 'https://sandbox.tranzila.com',
  webhookSecret: process.env.TRANZILA_WEBHOOK_SECRET!,
};

export class PaymentService {
  /**
   * Create payment transaction
   */
  static async createPayment(data: CreatePaymentData): Promise<{
    transaction: PaymentTransaction;
    paymentUrl?: string;
    redirectUrl?: string;
  }> {
    const validatedData = createPaymentSchema.parse(data);

    // Validate enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: validatedData.enrollmentId },
      include: { user: true, cohort: true },
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    if (enrollment.status !== 'PENDING_PAYMENT' && enrollment.status !== 'ACTIVE') {
      throw new Error('Enrollment is not in a payable state');
    }

    // Validate payment amount
    const expectedAmount = this.calculateExpectedAmount(enrollment, validatedData.installmentNumber);
    if (Math.abs(validatedData.amount - expectedAmount) > 0.01) {
      throw new Error(`Payment amount mismatch. Expected: ${expectedAmount}, Received: ${validatedData.amount}`);
    }

    // Generate unique transaction reference
    const reference = this.generateTransactionReference();

    // Create transaction record
    const transaction = await prisma.paymentTransaction.create({
      data: {
        enrollmentId: validatedData.enrollmentId,
        tranzillaReference: reference,
        amount: validatedData.amount,
        installmentNumber: validatedData.installmentNumber,
        status: TransactionStatus.PENDING,
        paymentMethod: this.maskPaymentMethod(validatedData.paymentMethod),
      },
    });

    // Process payment with Tranzila
    const paymentResult = await this.processTranzillaPayment({
      reference,
      amount: validatedData.amount,
      token: validatedData.paymentMethod.token,
      userDetails: {
        email: enrollment.user.email,
        firstName: enrollment.user.firstName,
        lastName: enrollment.user.lastName,
        phone: enrollment.user.phone,
      },
      courseDetails: {
        courseName: enrollment.cohort.name,
        description: `DPNR Course - ${enrollment.cohort.name}`,
      },
      installment: validatedData.installmentNumber ?? undefined,
    });

    // Update transaction with Tranzila response
    const updatedTransaction = await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: paymentResult.success ? TransactionStatus.SUCCESS : TransactionStatus.FAILED,
        failureReason: paymentResult.errorMessage,
        processedAt: new Date(),
      },
    });

    // If payment successful, update enrollment
    if (paymentResult.success) {
      await this.updateEnrollmentAfterPayment(enrollment, validatedData.amount);
    }

    return {
      transaction: updatedTransaction,
      paymentUrl: paymentResult.paymentUrl ?? undefined,
      redirectUrl: paymentResult.redirectUrl ?? undefined,
    };
  }

  /**
   * Process Tranzila webhook
   */
  static async processWebhook(payload: WebhookPayload): Promise<{
    processed: boolean;
    transactionId?: string;
  }> {
    const validatedPayload = webhookPayloadSchema.parse(payload);

    // Verify webhook signature
    if (!this.verifyWebhookSignature(payload, validatedPayload.signature)) {
      throw new Error('Invalid webhook signature');
    }

    // Find transaction by reference
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { tranzillaReference: validatedPayload.reference },
      include: { enrollment: true },
    });

    if (!transaction) {
      console.warn(`Webhook received for unknown transaction: ${validatedPayload.reference}`);
      return { processed: false };
    }

    // Update transaction status
    const newStatus = this.mapTranzillaStatus(validatedPayload.status);
    const updatedTransaction = await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: newStatus,
        processedAt: new Date(),
      },
    });

    // Update enrollment if payment successful
    if (newStatus === TransactionStatus.SUCCESS) {
      await this.updateEnrollmentAfterPayment(transaction.enrollment, validatedPayload.amount);
    }

    // Send notification emails
    await this.sendPaymentNotification(updatedTransaction, newStatus);

    return {
      processed: true,
      transactionId: transaction.id,
    };
  }

  /**
   * Refund payment
   */
  static async refundPayment(transactionId: string, amount?: number): Promise<PaymentTransaction> {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
      include: { enrollment: { include: { user: true } } },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== TransactionStatus.SUCCESS) {
      throw new Error('Can only refund successful transactions');
    }

    const refundAmount = amount || transaction.amount.toNumber();
    if (refundAmount > transaction.amount.toNumber()) {
      throw new Error('Refund amount cannot exceed original payment');
    }

    // Process refund with Tranzila
    const refundResult = await this.processTranzillaRefund(
      transaction.tranzillaReference,
      refundAmount
    );

    if (!refundResult.success) {
      throw new Error(`Refund failed: ${refundResult.errorMessage}`);
    }

    // Update transaction status
    const updatedTransaction = await prisma.paymentTransaction.update({
      where: { id: transactionId },
      data: {
        status: TransactionStatus.REFUNDED,
        processedAt: new Date(),
      },
    });

    // Update enrollment
    await this.updateEnrollmentAfterRefund(transaction.enrollment, refundAmount);

    // Send refund confirmation
    await this.sendRefundNotification(updatedTransaction, refundAmount);

    return updatedTransaction;
  }

  /**
   * Get payment statistics
   */
  static async getPaymentStatistics(filters?: {
    startDate?: Date;
    endDate?: Date;
    cohortId?: string;
  }) {
    const where: any = {};

    if (filters?.startDate || filters?.endDate) {
      where.processedAt = {};
      if (filters.startDate) {
        where.processedAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.processedAt.lte = filters.endDate;
      }
    }

    if (filters?.cohortId) {
      where.enrollment = {
        cohortId: filters.cohortId,
      };
    }

    const [
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      refundedTransactions,
      totalRevenue,
      refundedAmount,
    ] = await Promise.all([
      prisma.paymentTransaction.count({ where }),
      prisma.paymentTransaction.count({
        where: { ...where, status: TransactionStatus.SUCCESS },
      }),
      prisma.paymentTransaction.count({
        where: { ...where, status: TransactionStatus.FAILED },
      }),
      prisma.paymentTransaction.count({
        where: { ...where, status: TransactionStatus.REFUNDED },
      }),
      prisma.paymentTransaction.aggregate({
        where: { ...where, status: TransactionStatus.SUCCESS },
        _sum: { amount: true },
      }),
      prisma.paymentTransaction.aggregate({
        where: { ...where, status: TransactionStatus.REFUNDED },
        _sum: { amount: true },
      }),
    ]);

    const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;
    const refundRate = successfulTransactions > 0 ? (refundedTransactions / successfulTransactions) * 100 : 0;
    const netRevenue = (totalRevenue._sum.amount?.toNumber() || 0) - (refundedAmount._sum.amount?.toNumber() || 0);

    return {
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      refundedTransactions,
      successRate: Math.round(successRate * 100) / 100,
      refundRate: Math.round(refundRate * 100) / 100,
      totalRevenue: totalRevenue._sum.amount?.toNumber() || 0,
      refundedAmount: refundedAmount._sum.amount?.toNumber() || 0,
      netRevenue,
    };
  }

  /**
   * Process payment with Tranzila API
   */
  private static async processTranzillaPayment(paymentData: {
    reference: string;
    amount: number;
    token: string;
    userDetails: any;
    courseDetails: any;
    installment?: number;
  }): Promise<{
    success: boolean;
    transactionId?: string;
    errorMessage?: string;
    paymentUrl?: string;
    redirectUrl?: string;
  }> {
    try {
      // In a real implementation, this would make an HTTP request to Tranzila API
      // For now, we'll simulate the API call

      console.log(`Processing Tranzila payment: ${paymentData.reference} for ${paymentData.amount} ILS`);

      // Simulate payment processing
      const isSuccess = Math.random() > 0.1; // 90% success rate for simulation

      if (isSuccess) {
        return {
          success: true,
          transactionId: `TZ_${Date.now()}`,
          redirectUrl: process.env.FRONTEND_URL + '/payment/success',
        };
      } else {
        return {
          success: false,
          errorMessage: 'Payment declined by issuer',
        };
      }
    } catch (error) {
      console.error('Tranzila payment error:', error);
      return {
        success: false,
        errorMessage: 'Payment service temporarily unavailable',
      };
    }
  }

  /**
   * Process refund with Tranzila API
   */
  private static async processTranzillaRefund(
    originalReference: string,
    amount: number
  ): Promise<{
    success: boolean;
    refundId?: string;
    errorMessage?: string;
  }> {
    try {
      console.log(`Processing Tranzila refund: ${originalReference} for ${amount} ILS`);

      // Simulate refund processing
      return {
        success: true,
        refundId: `RF_${Date.now()}`,
      };
    } catch (error) {
      console.error('Tranzila refund error:', error);
      return {
        success: false,
        errorMessage: 'Refund service temporarily unavailable',
      };
    }
  }

  /**
   * Calculate expected payment amount
   */
  private static calculateExpectedAmount(enrollment: Enrollment, _installmentNumber?: number): number {
    const totalAmount = enrollment.totalAmount.toNumber();
    const paidAmount = enrollment.paidAmount.toNumber();

    if (enrollment.paymentPlan === 'FULL') {
      return totalAmount - paidAmount;
    }

    // For installment plans
    const installmentConfig = {
      FIVE_INSTALLMENTS: { amount: 1360, total: 6800 },
      TWELVE_INSTALLMENTS: { amount: 580, total: 6960 },
    };

    const config = installmentConfig[enrollment.paymentPlan as keyof typeof installmentConfig];
    return config?.amount || totalAmount - paidAmount;
  }

  /**
   * Update enrollment after successful payment
   */
  private static async updateEnrollmentAfterPayment(
    enrollment: Enrollment,
    paymentAmount: number
  ): Promise<void> {
    const newPaidAmount = enrollment.paidAmount.toNumber() + paymentAmount;
    const totalAmount = enrollment.totalAmount.toNumber();

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        paidAmount: newPaidAmount,
        status: newPaidAmount >= totalAmount ? 'ACTIVE' : enrollment.status,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Update enrollment after refund
   */
  private static async updateEnrollmentAfterRefund(
    enrollment: Enrollment,
    refundAmount: number
  ): Promise<void> {
    const newPaidAmount = Math.max(0, enrollment.paidAmount.toNumber() - refundAmount);

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        paidAmount: newPaidAmount,
        status: newPaidAmount === 0 ? 'CANCELLED' : enrollment.status,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Generate unique transaction reference
   */
  private static generateTransactionReference(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return `DPNR_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Mask payment method for storage
   */
  private static maskPaymentMethod(paymentMethod: any): string {
    if (paymentMethod.cardLast4) {
      return `****-****-****-${paymentMethod.cardLast4}`;
    }
    return 'Payment Token';
  }

  /**
   * Verify webhook signature
   */
  private static verifyWebhookSignature(payload: any, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', TRANZILA_CONFIG.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Map Tranzila status to our status enum
   */
  private static mapTranzillaStatus(tranzillaStatus: string): TransactionStatus {
    switch (tranzillaStatus.toLowerCase()) {
      case 'success':
      case 'approved':
        return TransactionStatus.SUCCESS;
      case 'failed':
      case 'declined':
      case 'error':
        return TransactionStatus.FAILED;
      case 'refunded':
        return TransactionStatus.REFUNDED;
      default:
        return TransactionStatus.PENDING;
    }
  }

  /**
   * Send payment notification
   */
  private static async sendPaymentNotification(
    transaction: PaymentTransaction,
    status: TransactionStatus
  ): Promise<void> {
    // TODO: Implement email service
    console.log(`Sending payment notification: Transaction ${transaction.id} - ${status}`);
  }

  /**
   * Send refund notification
   */
  private static async sendRefundNotification(
    transaction: PaymentTransaction,
    amount: number
  ): Promise<void> {
    // TODO: Implement email service
    console.log(`Sending refund notification: Transaction ${transaction.id} - ${amount} ILS`);
  }

  /**
   * Get failed payments requiring retry
   */
  static async getFailedPaymentsForRetry(): Promise<PaymentTransaction[]> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return prisma.paymentTransaction.findMany({
      where: {
        status: TransactionStatus.FAILED,
        processedAt: { gte: oneDayAgo },
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
   * Retry failed payment
   */
  static async retryPayment(transactionId: string): Promise<PaymentTransaction> {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
      include: { enrollment: { include: { user: true } } },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== TransactionStatus.FAILED) {
      throw new Error('Can only retry failed transactions');
    }

    // Create new transaction for retry
    const retryReference = this.generateTransactionReference();

    const retryTransaction = await prisma.paymentTransaction.create({
      data: {
        enrollmentId: transaction.enrollmentId,
        tranzillaReference: retryReference,
        amount: transaction.amount,
        installmentNumber: transaction.installmentNumber,
        status: TransactionStatus.PENDING,
        paymentMethod: transaction.paymentMethod,
      },
    });

    // TODO: Process retry with original payment method if saved
    console.log(`Created retry transaction ${retryTransaction.id} for failed payment ${transactionId}`);

    return retryTransaction;
  }
}