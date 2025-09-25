import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { EnrollmentServiceStub as EnrollmentService } from '@/services/stubs';
import { PaymentServiceStub as PaymentService } from '@/services/stubs';
import { UserServiceStub as UserService } from '@/services/stubs';
import { CohortServiceStub as CohortService } from '@/services/stubs';
import { UserModelStub as UserModel } from '@/models/stubs';
import { EnrollmentModel } from '@/models/enrollment.model';
import {
  asyncHandler,
  validateRequest,
  authenticateToken,
  requireAdmin,
  optionalAuth,
  responseHelpers,
  requestLogger,
  strictRateLimit,
} from '@/utils/middleware';

const router = Router();

// Apply middleware
router.use(responseHelpers);
router.use(requestLogger);

// Validation schemas
const enrollmentParamsSchema = z.object({
  id: z.string().uuid('Invalid enrollment ID format'),
});

const questionnaireSchema = z.object({
  motivation: z.string().min(10, 'Motivation must be at least 10 characters'),
  previousExperience: z.boolean(),
  expectations: z.string().min(5, 'Expectations must be provided'),
  referralSource: z.string().optional(),
  specialNeeds: z.string().optional(),
  agreedToTerms: z.boolean().refine(val => val === true, 'Must agree to terms'),
  agreedToPrivacy: z.boolean().refine(val => val === true, 'Must agree to privacy policy'),
  marketingConsent: z.boolean(),
});

const createEnrollmentSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email format'),
  phone: z.string().regex(/^(\+972|0)(5[0-9]|7[23479])-?\d{7}$/, 'Invalid Israeli phone number'),
  preferredLanguage: z.enum(['HE', 'EN']).default('HE'),
  paymentPlan: z.enum(['FULL', 'FIVE_INSTALLMENTS', 'TWELVE_INSTALLMENTS']),
  cohortId: z.string().uuid().optional(), // If not provided, use current cohort
  questionnaire: questionnaireSchema,
});

const paymentRequestSchema = z.object({
  token: z.string().min(1, 'Payment token is required'),
  saveCard: z.boolean().default(false),
  cardLast4: z.string().length(4).optional(),
  cardType: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['PENDING_PAYMENT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'REFUNDED']),
  reason: z.string().optional(),
});

/**
 * POST /enrollments
 * Create new enrollment (public endpoint with rate limiting)
 */
router.post('/',
  strictRateLimit(900000, 3), // 3 enrollments per 15 minutes
  optionalAuth,
  validateRequest({ body: createEnrollmentSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const enrollmentData = req.body as any;

    // Get current cohort if not specified
    let cohortId = enrollmentData.cohortId;
    if (!cohortId) {
      const currentCohort = await CohortService.getCurrentCohort();
      if (!currentCohort) {
        res.error(400, 'אין קבוצה זמינה להרשמה / No cohort available for enrollment');
        return;
      }
      cohortId = currentCohort.id;
    }

    // Create or sync user
    let user;
    if (req.user) {
      // User is authenticated, sync with existing account
      user = await UserService.syncFromCognito(req.user.sub, {
        email: enrollmentData.email,
        given_name: enrollmentData.firstName,
        family_name: enrollmentData.lastName,
        phone_number: enrollmentData.phone,
        locale: enrollmentData.preferredLanguage === 'EN' ? 'en' : 'he',
      });
    } else {
      // Anonymous enrollment - check if user exists by email
      const existingUser = await UserModel.findByEmail(enrollmentData.email);
      if (existingUser) {
        res.error(409, 'כבר קיים חשבון עם כתובת אימייל זו. אנא התחברו לחשבון / An account with this email already exists. Please log in to enroll.');
        return;
      }

      // For now, we'll create a placeholder user record
      // In production, this would trigger account creation flow
      user = await UserModel.create({
        cognitoId: `temp_${Date.now()}`, // Temporary ID
        email: enrollmentData.email,
        firstName: enrollmentData.firstName,
        lastName: enrollmentData.lastName,
        phone: enrollmentData.phone,
        preferredLanguage: enrollmentData.preferredLanguage,
        role: 'STUDENT',
      });
    }

    // Create enrollment
    const result = await EnrollmentService.createEnrollment({
      userId: user.id,
      cohortId,
      paymentPlan: enrollmentData.paymentPlan,
      questionnaire: enrollmentData.questionnaire,
    });

    res.created({
      id: result.enrollment.id,
      status: result.enrollment.status,
      paymentPlan: result.enrollment.paymentPlan,
      totalAmount: result.enrollment.totalAmount,
      paymentUrl: result.paymentUrl,
      cohort: {
        id: result.cohort?.id || '',
        name: result.cohort?.name || '',
        startDate: result.cohort?.startDate || new Date(),
      },
    }, 'Enrollment created successfully');
  })
);

/**
 * GET /enrollments/:id
 * Get enrollment details
 */
router.get('/:id',
  authenticateToken,
  validateRequest({ params: enrollmentParamsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const enrollment = await EnrollmentService.getEnrollment(id);

    // Check if user owns this enrollment or is admin
    const isOwner = enrollment.userId === req.user?.sub;
    const isAdmin = req.user?.groups?.includes('admin');

    if (!isOwner && !isAdmin) {
      return res.error(403, 'Access denied to this enrollment');
    }

    res.success(enrollment, 'Enrollment retrieved successfully');
  })
);

/**
 * POST /enrollments/:id/payment
 * Process payment for enrollment
 */
router.post('/:id/payment',
  authenticateToken,
  strictRateLimit(300000, 5), // 5 payment attempts per 5 minutes
  validateRequest({
    params: enrollmentParamsSchema,
    body: paymentRequestSchema,
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const paymentData = req.body as any;

    // Get enrollment and verify ownership
    const enrollment = await EnrollmentService.getEnrollment(id);
    const isOwner = enrollment.userId === req.user?.sub;
    const isAdmin = req.user?.groups?.includes('admin');

    if (!isOwner && !isAdmin) {
      return res.error(403, 'Access denied to this enrollment');
    }

    // Check enrollment status
    if (enrollment.status !== 'PENDING_PAYMENT' && enrollment.status !== 'ACTIVE') {
      return res.error(400, 'Enrollment is not in a payable state');
    }

    // Calculate expected amount
    const expectedAmount = EnrollmentModel.getNextInstallmentAmount(enrollment);

    // Process payment
    const paymentResult = await PaymentService.createPayment({
      enrollmentId: id,
      amount: expectedAmount,
      paymentMethod: {
        token: paymentData.token,
        cardLast4: paymentData.cardLast4,
        cardType: paymentData.cardType,
      },
      installmentNumber: enrollment.paymentPlan === 'FULL' ? 1 : undefined,
      saveCard: paymentData.saveCard,
    });

    if (paymentResult.transaction.status === 'SUCCESS') {
      res.success({
        transactionId: paymentResult.transaction.id,
        amount: paymentResult.transaction.amount,
        status: paymentResult.transaction.status,
        enrollmentStatus: enrollment.status,
        nextInstallmentDate: calculateNextInstallmentDate(enrollment),
      }, 'Payment processed successfully');
    } else {
      res.error(400, 'Payment failed', {
        transactionId: paymentResult.transaction.id,
        reason: paymentResult.transaction.failureReason,
      });
    }
  })
);

/**
 * PATCH /enrollments/:id/status
 * Update enrollment status (admin only)
 */
router.patch('/:id/status',
  authenticateToken,
  requireAdmin,
  validateRequest({
    params: enrollmentParamsSchema,
    body: updateStatusSchema,
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, reason } = req.body as any;

    const enrollment = await EnrollmentService.updateEnrollmentStatus(id, status, req.user?.sub);

    res.success(enrollment, `Enrollment status updated to ${status}`);
  })
);

/**
 * POST /enrollments/:id/cancel
 * Cancel enrollment
 */
router.post('/:id/cancel',
  authenticateToken,
  validateRequest({
    params: enrollmentParamsSchema,
    body: z.object({
      reason: z.string().optional(),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body as any;

    // Get enrollment and verify ownership
    const enrollment = await EnrollmentService.getEnrollment(id);
    const isOwner = enrollment.userId === req.user?.sub;
    const isAdmin = req.user?.groups?.includes('admin');

    if (!isOwner && !isAdmin) {
      return res.error(403, 'Access denied to this enrollment');
    }

    const cancelledEnrollment = await EnrollmentService.cancelEnrollment(id, reason);

    res.success(cancelledEnrollment, 'Enrollment cancelled successfully');
  })
);

/**
 * GET /enrollments
 * Get enrollments (admin: all, user: own enrollments)
 */
router.get('/',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const isAdmin = req.user?.groups?.includes('admin');

    if (isAdmin) {
      // Admin can see all enrollments with filtering
      const filters = {
        status: req.query.status as any,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const enrollments = await EnrollmentModel.findAll(filters);
      res.success(enrollments, 'Enrollments retrieved successfully');
    } else {
      // Regular users see only their own enrollments
      const enrollments = await EnrollmentService.getUserEnrollments(req.user!.sub);
      res.success(enrollments, 'Your enrollments retrieved successfully');
    }
  })
);

/**
 * GET /enrollments/statistics
 * Get enrollment statistics (admin only)
 */
router.get('/statistics',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const cohortId = req.query.cohortId as string;
    const statistics = await EnrollmentService.getEnrollmentStatistics(cohortId);

    res.success(statistics, 'Enrollment statistics retrieved');
  })
);

/**
 * GET /enrollments/check-eligibility
 * Check if user can enroll in a cohort
 */
router.get('/check-eligibility',
  authenticateToken,
  validateRequest({
    query: z.object({
      cohortId: z.string().uuid().optional(),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    let cohortId = req.query.cohortId as string;

    // Use current cohort if not specified
    if (!cohortId) {
      const currentCohort = await CohortService.getCurrentCohort();
      if (!currentCohort) {
        return res.error(400, 'אין קבוצה זמינה להרשמה / No cohort available for enrollment');
      }
      cohortId = currentCohort.id;
    }

    const eligibility = await EnrollmentService.canUserEnroll(userId, cohortId);

    res.success(eligibility, 'Enrollment eligibility checked');
  })
);

/**
 * Helper function to calculate next installment date
 */
function calculateNextInstallmentDate(enrollment: any): Date | null {
  if (enrollment.paymentPlan === 'FULL') {
    return null;
  }

  const installmentInterval = enrollment.paymentPlan === 'FIVE_INSTALLMENTS' ? 30 : 30; // Monthly
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + installmentInterval);

  return nextDate;
}

export default router;