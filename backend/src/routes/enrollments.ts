/**
 * Enrollment Routes
 * Handles course enrollment endpoints with authentication and payment processing
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { EnrollmentModel, createEnrollmentSchema, updateEnrollmentSchema, questionnaireSchema } from '../models/enrollment.model';
import {
  asyncHandler,
  sendSuccessResponse,
  sendErrorResponse,
  createError,
  ErrorCode,
  isZodError,
  isAppError,
  transformZodError
} from '../utils/errorHandling';
import {
  AuthenticatedRequest,
  AuthenticatedRouteHandler,
  IdParams,
  StandardQuery
} from '../types/express';
import { EnrollmentStatus, PaymentPlan } from '@prisma/client';

const router = Router();

// Request validation schemas
const enrollmentParamsSchema = z.object({
  id: z.string().uuid('Invalid enrollment ID format')
});

const createEnrollmentRequestSchema = z.object({
  cohortId: z.string().uuid('Invalid cohort ID format'),
  paymentPlan: z.nativeEnum(PaymentPlan, { errorMap: () => ({ message: 'Invalid payment plan' }) }),
  questionnaire: questionnaireSchema
});

const updateEnrollmentRequestSchema = z.object({
  status: z.nativeEnum(EnrollmentStatus).optional(),
  questionnaire: questionnaireSchema.optional()
});

const enrollmentQuerySchema = z.object({
  status: z.string().optional(),
  cohortId: z.string().uuid().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional()
});

/**
 * POST /v1/enrollments
 * Create new enrollment (requires authentication)
 */
router.post('/', authenticate, asyncHandler<AuthenticatedRequest>(async (req, res) => {
  try {
    // Validate request body
    const validatedData = createEnrollmentRequestSchema.parse(req.body);

    // Create enrollment data with authenticated user ID
    const enrollmentData = {
      userId: req.user.id,
      cohortId: validatedData.cohortId,
      paymentPlan: validatedData.paymentPlan,
      questionnaire: validatedData.questionnaire
    };

    const enrollment = await EnrollmentModel.create(enrollmentData);

    sendSuccessResponse(res, enrollment, 'Enrollment created successfully', 201);
  } catch (error: any) {
    if (isZodError(error)) {
      const appError = transformZodError(error);
      sendErrorResponse(res, appError.statusCode, appError.code, appError.message, appError.details);
      return;
    }

    if (error.message === 'User is already enrolled in this cohort') {
      sendErrorResponse(res, 409, ErrorCode.DUPLICATE_RESOURCE, 'You are already enrolled in this cohort');
      return;
    }

    if (error.message === 'Cohort not found') {
      sendErrorResponse(res, 404, ErrorCode.RESOURCE_NOT_FOUND, 'Cohort not found');
      return;
    }

    if (error.message === 'Cohort is at full capacity') {
      sendErrorResponse(res, 409, ErrorCode.RESOURCE_CONFLICT, 'This cohort is at full capacity');
      return;
    }

    console.error('Create enrollment error:', error);
    sendErrorResponse(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to create enrollment');
  }
}));

/**
 * GET /v1/enrollments/my
 * Get current user's enrollments (requires authentication)
 */
router.get('/my', authenticate, asyncHandler<AuthenticatedRequest>(async (req, res) => {
  try {
    const enrollments = await EnrollmentModel.findByUserId(req.user.id);

    // Transform response to include only necessary data
    const enrollmentSummary = enrollments.map(enrollment => ({
      id: enrollment.id,
      status: enrollment.status,
      paymentPlan: enrollment.paymentPlan,
      totalAmount: enrollment.totalAmount,
      paidAmount: enrollment.paidAmount,
      enrollmentDate: enrollment.enrollmentDate,
      cohort: {
        id: enrollment.cohort.id,
        name: enrollment.cohort.name,
        startDate: enrollment.cohort.startDate,
        endDate: enrollment.cohort.endDate,
        location: enrollment.cohort.location,
        schedule: enrollment.cohort.schedule
      },
      questionnaire: enrollment.questionnaire,
      remainingAmount: EnrollmentModel.calculateRemainingAmount(enrollment),
      isFullyPaid: EnrollmentModel.isFullyPaid(enrollment),
      nextInstallmentAmount: enrollment.paymentPlan !== PaymentPlan.FULL
        ? EnrollmentModel.getNextInstallmentAmount(enrollment)
        : null
    }));

    sendSuccessResponse(res, enrollmentSummary, 'User enrollments retrieved successfully');
  } catch (error: any) {
    console.error('Get user enrollments error:', error);
    sendErrorResponse(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve enrollments');
  }
}));

/**
 * GET /v1/enrollments/:id
 * Get specific enrollment by ID (requires authentication)
 */
router.get('/:id', authenticate, asyncHandler<AuthenticatedRequest>(async (req, res) => {
  try {
    // Validate parameters
    const { id } = enrollmentParamsSchema.parse(req.params);

    const enrollment = await EnrollmentModel.findById(id);

    if (!enrollment) {
      sendErrorResponse(res, 404, ErrorCode.RESOURCE_NOT_FOUND, 'Enrollment not found');
      return;
    }

    // Check if user owns this enrollment or is admin
    if (enrollment.userId !== req.user.id && req.user.role !== 'admin') {
      sendErrorResponse(res, 403, ErrorCode.FORBIDDEN, 'Access denied to this enrollment');
      return;
    }

    // Build detailed enrollment response
    const enrollmentDetails = {
      id: enrollment.id,
      status: enrollment.status,
      paymentPlan: enrollment.paymentPlan,
      totalAmount: enrollment.totalAmount,
      paidAmount: enrollment.paidAmount,
      enrollmentDate: enrollment.enrollmentDate,
      createdAt: enrollment.createdAt,
      updatedAt: enrollment.updatedAt,
      user: {
        id: enrollment.user.id,
        firstName: enrollment.user.firstName,
        lastName: enrollment.user.lastName,
        email: enrollment.user.email,
        phone: enrollment.user.phone
      },
      cohort: {
        id: enrollment.cohort.id,
        name: enrollment.cohort.name,
        startDate: enrollment.cohort.startDate,
        endDate: enrollment.cohort.endDate,
        location: enrollment.cohort.location,
        schedule: enrollment.cohort.schedule,
        status: enrollment.cohort.status
      },
      questionnaire: enrollment.questionnaire,
      paymentTransactions: enrollment.paymentTransactions.map(transaction => ({
        id: transaction.id,
        amount: transaction.amount,
        status: transaction.status,
        installmentNumber: transaction.installmentNumber,
        processedAt: transaction.processedAt,
        paymentMethod: transaction.paymentMethod
      })),
      remainingAmount: EnrollmentModel.calculateRemainingAmount(enrollment),
      isFullyPaid: EnrollmentModel.isFullyPaid(enrollment),
      nextInstallmentAmount: enrollment.paymentPlan !== PaymentPlan.FULL
        ? EnrollmentModel.getNextInstallmentAmount(enrollment)
        : null
    };

    sendSuccessResponse(res, enrollmentDetails, 'Enrollment details retrieved successfully');
  } catch (error: any) {
    if (isZodError(error)) {
      const appError = transformZodError(error);
      sendErrorResponse(res, appError.statusCode, appError.code, appError.message, appError.details);
      return;
    }

    console.error('Get enrollment error:', error);
    sendErrorResponse(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve enrollment');
  }
}));

/**
 * PATCH /v1/enrollments/:id
 * Update enrollment (requires authentication)
 */
router.patch('/:id', authenticate, asyncHandler<AuthenticatedRequest>(async (req, res) => {
  try {
    // Validate parameters and body
    const { id } = enrollmentParamsSchema.parse(req.params);
    const updateData = updateEnrollmentRequestSchema.parse(req.body);

    // Check if enrollment exists and user owns it
    const existingEnrollment = await EnrollmentModel.findById(id);

    if (!existingEnrollment) {
      sendErrorResponse(res, 404, ErrorCode.RESOURCE_NOT_FOUND, 'Enrollment not found');
      return;
    }

    // Check permissions
    if (existingEnrollment.userId !== req.user.id && req.user.role !== 'admin') {
      sendErrorResponse(res, 403, ErrorCode.FORBIDDEN, 'Access denied to this enrollment');
      return;
    }

    // Validate status updates (only certain transitions allowed for students)
    if (updateData.status && req.user.role !== 'admin') {
      const allowedStudentStatusUpdates = [EnrollmentStatus.CANCELLED];

      if (!allowedStudentStatusUpdates.includes(updateData.status)) {
        sendErrorResponse(res, 403, ErrorCode.FORBIDDEN, 'You can only cancel your enrollment');
        return;
      }

      // Don't allow cancellation if already paid or completed
      if (updateData.status === EnrollmentStatus.CANCELLED &&
          (existingEnrollment.status === EnrollmentStatus.COMPLETED ||
           existingEnrollment.status === EnrollmentStatus.ACTIVE)) {
        sendErrorResponse(res, 409, ErrorCode.OPERATION_NOT_ALLOWED, 'Cannot cancel an active or completed enrollment');
        return;
      }
    }

    const updatedEnrollment = await EnrollmentModel.update(id, updateData);

    sendSuccessResponse(res, updatedEnrollment, 'Enrollment updated successfully');
  } catch (error: any) {
    if (isZodError(error)) {
      const appError = transformZodError(error);
      sendErrorResponse(res, appError.statusCode, appError.code, appError.message, appError.details);
      return;
    }

    console.error('Update enrollment error:', error);
    sendErrorResponse(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to update enrollment');
  }
}));

/**
 * DELETE /v1/enrollments/:id
 * Cancel/Delete enrollment (requires authentication)
 */
router.delete('/:id', authenticate, asyncHandler<AuthenticatedRequest>(async (req, res) => {
  try {
    // Validate parameters
    const { id } = enrollmentParamsSchema.parse(req.params);

    // Check if enrollment exists
    const enrollment = await EnrollmentModel.findById(id);

    if (!enrollment) {
      sendErrorResponse(res, 404, ErrorCode.RESOURCE_NOT_FOUND, 'Enrollment not found');
      return;
    }

    // Check permissions
    if (enrollment.userId !== req.user.id && req.user.role !== 'admin') {
      sendErrorResponse(res, 403, ErrorCode.FORBIDDEN, 'Access denied to this enrollment');
      return;
    }

    // Check if enrollment can be cancelled
    if (enrollment.status === EnrollmentStatus.COMPLETED) {
      sendErrorResponse(res, 409, ErrorCode.OPERATION_NOT_ALLOWED, 'Cannot delete a completed enrollment');
      return;
    }

    if (enrollment.status === EnrollmentStatus.ACTIVE && req.user.role !== 'admin') {
      sendErrorResponse(res, 409, ErrorCode.OPERATION_NOT_ALLOWED, 'Cannot delete an active enrollment. Please contact support for cancellation.');
      return;
    }

    // For admins, hard delete. For students, update status to cancelled
    if (req.user.role === 'admin') {
      await EnrollmentModel.delete(id);
      sendSuccessResponse(res, { deleted: true }, 'Enrollment deleted successfully');
    } else {
      // Update status to cancelled for students
      const cancelledEnrollment = await EnrollmentModel.updateStatus(id, EnrollmentStatus.CANCELLED);
      sendSuccessResponse(res, cancelledEnrollment, 'Enrollment cancelled successfully');
    }
  } catch (error: any) {
    if (isZodError(error)) {
      const appError = transformZodError(error);
      sendErrorResponse(res, appError.statusCode, appError.code, appError.message, appError.details);
      return;
    }

    console.error('Delete enrollment error:', error);
    sendErrorResponse(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to delete enrollment');
  }
}));

/**
 * GET /v1/enrollments
 * Get all enrollments with filtering (admin only)
 */
router.get('/', authenticate, asyncHandler<AuthenticatedRequest>(async (req, res) => {
  try {
    // Only admins can access this endpoint
    if (req.user.role !== 'admin') {
      sendErrorResponse(res, 403, ErrorCode.FORBIDDEN, 'Admin access required');
      return;
    }

    // Validate query parameters
    const queryParams = enrollmentQuerySchema.parse(req.query);

    const filters = {
      status: queryParams.status,
      limit: queryParams.limit || 50,
      offset: queryParams.page ? (queryParams.page - 1) * (queryParams.limit || 50) : 0
    };

    const enrollments = await EnrollmentModel.findAll(filters);

    // Transform response for admin view
    const enrollmentList = enrollments.map(enrollment => ({
      id: enrollment.id,
      status: enrollment.status,
      paymentPlan: enrollment.paymentPlan,
      totalAmount: enrollment.totalAmount,
      paidAmount: enrollment.paidAmount,
      enrollmentDate: enrollment.enrollmentDate,
      user: {
        id: enrollment.user.id,
        firstName: enrollment.user.firstName,
        lastName: enrollment.user.lastName,
        email: enrollment.user.email,
        phone: enrollment.user.phone
      },
      cohort: {
        id: enrollment.cohort.id,
        name: enrollment.cohort.name,
        startDate: enrollment.cohort.startDate,
        endDate: enrollment.cohort.endDate
      },
      remainingAmount: EnrollmentModel.calculateRemainingAmount(enrollment),
      isFullyPaid: EnrollmentModel.isFullyPaid(enrollment)
    }));

    const responseData = {
      enrollments: enrollmentList,
      pagination: {
        page: queryParams.page || 1,
        limit: filters.limit,
        total: enrollmentList.length
      }
    };

    sendSuccessResponse(res, responseData, 'Enrollments retrieved successfully');
  } catch (error: any) {
    if (isZodError(error)) {
      const appError = transformZodError(error);
      sendErrorResponse(res, appError.statusCode, appError.code, appError.message, appError.details);
      return;
    }

    console.error('Get all enrollments error:', error);
    sendErrorResponse(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve enrollments');
  }
}));

/**
 * GET /v1/enrollments/statistics
 * Get enrollment statistics (admin only)
 */
router.get('/statistics', authenticate, asyncHandler<AuthenticatedRequest>(async (req, res) => {
  try {
    // Only admins can access this endpoint
    if (req.user.role !== 'admin') {
      sendErrorResponse(res, 403, ErrorCode.FORBIDDEN, 'Admin access required');
      return;
    }

    const cohortId = req.query.cohortId as string;
    const statistics = await EnrollmentModel.getStatistics(cohortId);

    sendSuccessResponse(res, statistics, 'Enrollment statistics retrieved successfully');
  } catch (error: any) {
    console.error('Get enrollment statistics error:', error);
    sendErrorResponse(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve statistics');
  }
}));

/**
 * GET /v1/enrollments/pending
 * Get enrollments requiring action (admin only)
 */
router.get('/pending', authenticate, asyncHandler<AuthenticatedRequest>(async (req, res) => {
  try {
    // Only admins can access this endpoint
    if (req.user.role !== 'admin') {
      sendErrorResponse(res, 403, ErrorCode.FORBIDDEN, 'Admin access required');
      return;
    }

    const enrollmentsRequiringAction = await EnrollmentModel.getEnrollmentsRequiringAction();

    sendSuccessResponse(res, enrollmentsRequiringAction, 'Enrollments requiring action retrieved successfully');
  } catch (error: any) {
    console.error('Get pending enrollments error:', error);
    sendErrorResponse(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve pending enrollments');
  }
}));

/**
 * POST /v1/enrollments/:id/payment
 * Process payment for enrollment (requires authentication)
 */
router.post('/:id/payment', authenticate, asyncHandler<AuthenticatedRequest>(async (req, res) => {
  try {
    // Validate parameters
    const { id } = enrollmentParamsSchema.parse(req.params);

    // Validate payment data
    const paymentSchema = z.object({
      amount: z.number().positive('Payment amount must be positive'),
      paymentMethod: z.string().min(1, 'Payment method is required'),
      tranzillaReference: z.string().min(1, 'Transaction reference is required')
    });

    const paymentData = paymentSchema.parse(req.body);

    // Check if enrollment exists and user owns it
    const enrollment = await EnrollmentModel.findById(id);

    if (!enrollment) {
      sendErrorResponse(res, 404, ErrorCode.RESOURCE_NOT_FOUND, 'Enrollment not found');
      return;
    }

    if (enrollment.userId !== req.user.id) {
      sendErrorResponse(res, 403, ErrorCode.FORBIDDEN, 'Access denied to this enrollment');
      return;
    }

    // Check if enrollment can accept payments
    if (enrollment.status === EnrollmentStatus.COMPLETED || enrollment.status === EnrollmentStatus.CANCELLED) {
      sendErrorResponse(res, 409, ErrorCode.OPERATION_NOT_ALLOWED, 'Cannot process payment for this enrollment status');
      return;
    }

    // Check if already fully paid
    if (EnrollmentModel.isFullyPaid(enrollment)) {
      sendErrorResponse(res, 409, ErrorCode.OPERATION_NOT_ALLOWED, 'Enrollment is already fully paid');
      return;
    }

    // Update enrollment with payment
    const updatedEnrollment = await EnrollmentModel.addPayment(id, paymentData.amount);

    sendSuccessResponse(res, {
      enrollment: updatedEnrollment,
      paymentProcessed: true,
      remainingAmount: EnrollmentModel.calculateRemainingAmount(updatedEnrollment),
      isFullyPaid: EnrollmentModel.isFullyPaid(updatedEnrollment)
    }, 'Payment processed successfully');
  } catch (error: any) {
    if (isZodError(error)) {
      const appError = transformZodError(error);
      sendErrorResponse(res, appError.statusCode, appError.code, appError.message, appError.details);
      return;
    }

    console.error('Process payment error:', error);
    sendErrorResponse(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to process payment');
  }
}));

export default router;