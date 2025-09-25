/**
 * Cohort Management Routes
 * Handles comprehensive cohort CRUD operations with role-based access control
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../middleware/auth';
import { CohortModel, createCohortSchema, updateCohortSchema } from '../models/cohort.model';
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
  BaseRequest,
  IdParams,
  StandardQuery
} from '../types/express';
import { CohortStatus } from '@prisma/client';

const router = Router();

// Request validation schemas
const cohortParamsSchema = z.object({
  id: z.string().uuid('Invalid cohort ID format')
});

const createCohortRequestSchema = z.object({
  name: z.string().min(1, 'Cohort name is required'),
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
  maxCapacity: z.number().int().min(1).max(50).default(20),
  location: z.string().default('Mazkeret Batya'),
  schedule: z.string().default('Weekly evenings, 1.5-2 hours')
}).refine(data => new Date(data.endDate) > new Date(data.startDate), {
  message: 'End date must be after start date',
  path: ['endDate']
});

const updateCohortRequestSchema = z.object({
  name: z.string().min(1, 'Cohort name is required').optional(),
  startDate: z.string().datetime('Invalid start date format').optional(),
  endDate: z.string().datetime('Invalid end date format').optional(),
  maxCapacity: z.number().int().min(1).max(50).optional(),
  location: z.string().optional(),
  schedule: z.string().optional()
}).refine(data => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) > new Date(data.startDate);
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['endDate']
});

const cohortStatusSchema = z.object({
  status: z.nativeEnum(CohortStatus, { errorMap: () => ({ message: 'Invalid cohort status' }) })
});

const cohortQuerySchema = z.object({
  status: z.string().optional(),
  upcoming: z.string().transform(val => val === 'true').optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional()
});

/**
 * GET /v1/cohorts - List all cohorts (public for display)
 */
router.get('/', asyncHandler<BaseRequest>(async (req, res) => {
  try {
    // Validate query parameters
    const queryParams = cohortQuerySchema.parse(req.query);

    let cohorts;
    
    if (queryParams.status) {
      // Filter by specific status
      const status = queryParams.status.toUpperCase() as CohortStatus;
      if (!Object.values(CohortStatus).includes(status)) {
        sendErrorResponse(res, 400, ErrorCode.VALIDATION_ERROR, 'Invalid status parameter');
        return;
      }
      cohorts = await CohortModel.findByStatus(status);
    } else if (queryParams.upcoming) {
      // Get upcoming cohorts
      cohorts = await CohortModel.findByStatus(CohortStatus.UPCOMING);
    } else {
      // Get all cohorts
      cohorts = await CohortModel.findAll();
    }

    // Transform response for public consumption (hide sensitive data)
    const publicCohorts = cohorts.map(cohort => ({
      id: cohort.id,
      name: cohort.name,
      startDate: cohort.startDate,
      endDate: cohort.endDate,
      status: cohort.status,
      location: cohort.location,
      schedule: cohort.schedule,
      maxCapacity: cohort.maxCapacity,
      currentEnrollment: cohort.currentEnrollment,
      availableSpots: Math.max(0, cohort.maxCapacity - cohort.currentEnrollment),
      isEnrollmentOpen: cohort.status === CohortStatus.OPEN_ENROLLMENT && cohort.currentEnrollment < cohort.maxCapacity
    }));

    sendSuccessResponse(res, {
      cohorts: publicCohorts,
      total: publicCohorts.length
    }, 'Cohorts retrieved successfully');
  } catch (error: any) {
    if (isZodError(error)) {
      const appError = transformZodError(error);
      sendErrorResponse(res, appError.statusCode, appError.code, appError.message, appError.details);
      return;
    }

    console.error('Get cohorts error:', error);
    sendErrorResponse(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve cohorts');
  }
}));

/**
 * POST /v1/cohorts - Create new cohort (admin only)
 */
router.post('/', authenticate, requireAdmin, asyncHandler<AuthenticatedRequest>(async (req, res) => {
  try {
    // Validate request body
    const validatedData = createCohortRequestSchema.parse(req.body);

    // Convert string dates to Date objects
    const cohortData = {
      ...validatedData,
      startDate: new Date(validatedData.startDate),
      endDate: new Date(validatedData.endDate)
    };

    const cohort = await CohortModel.create(cohortData);

    sendSuccessResponse(res, cohort, 'Cohort created successfully', 201);
  } catch (error: any) {
    if (isZodError(error)) {
      const appError = transformZodError(error);
      sendErrorResponse(res, appError.statusCode, appError.code, appError.message, appError.details);
      return;
    }

    if (error.message === 'Cohort name must be unique') {
      sendErrorResponse(res, 409, ErrorCode.DUPLICATE_RESOURCE, 'A cohort with this name already exists');
      return;
    }

    console.error('Create cohort error:', error);
    sendErrorResponse(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to create cohort');
  }
}));

/**
 * GET /v1/cohorts/current - Get current active cohort
 */
router.get('/current', asyncHandler<BaseRequest>(async (req, res) => {
  try {
    const currentCohort = await CohortModel.getCurrentCohort();

    if (!currentCohort) {
      sendSuccessResponse(res, null, 'No active cohort found');
      return;
    }

    // Public response format
    const cohortInfo = {
      id: currentCohort.id,
      name: currentCohort.name,
      startDate: currentCohort.startDate,
      endDate: currentCohort.endDate,
      status: currentCohort.status,
      location: currentCohort.location,
      schedule: currentCohort.schedule,
      maxCapacity: currentCohort.maxCapacity,
      currentEnrollment: currentCohort.currentEnrollment,
      availableSpots: Math.max(0, currentCohort.maxCapacity - currentCohort.currentEnrollment),
      isEnrollmentOpen: currentCohort.status === CohortStatus.OPEN_ENROLLMENT && currentCohort.currentEnrollment < currentCohort.maxCapacity
    };

    sendSuccessResponse(res, cohortInfo, 'Current cohort retrieved successfully');
  } catch (error: any) {
    console.error('Get current cohort error:', error);
    sendErrorResponse(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve current cohort');
  }
}));

/**
 * GET /v1/cohorts/upcoming - Get upcoming cohorts
 */
router.get('/upcoming', asyncHandler<BaseRequest>(async (req, res) => {
  try {
    const upcomingCohorts = await CohortModel.findByStatus(CohortStatus.UPCOMING);

    // Transform for public consumption
    const cohortList = upcomingCohorts.map(cohort => ({
      id: cohort.id,
      name: cohort.name,
      startDate: cohort.startDate,
      endDate: cohort.endDate,
      status: cohort.status,
      location: cohort.location,
      schedule: cohort.schedule,
      maxCapacity: cohort.maxCapacity,
      currentEnrollment: cohort.currentEnrollment,
      availableSpots: Math.max(0, cohort.maxCapacity - cohort.currentEnrollment)
    }));

    sendSuccessResponse(res, {
      cohorts: cohortList,
      total: cohortList.length
    }, 'Upcoming cohorts retrieved successfully');
  } catch (error: any) {
    console.error('Get upcoming cohorts error:', error);
    sendErrorResponse(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve upcoming cohorts');
  }
}));

/**
 * GET /v1/cohorts/statistics - Get cohort statistics (admin only)
 */
router.get('/statistics', authenticate, requireAdmin, asyncHandler<AuthenticatedRequest>(async (req, res) => {
  try {
    const cohortId = req.query.cohortId as string;
    
    if (cohortId) {
      // Validate cohort ID format
      const { id } = cohortParamsSchema.parse({ id: cohortId });
      const statistics = await CohortModel.getStatistics(id);
      sendSuccessResponse(res, statistics, 'Cohort statistics retrieved successfully');
    } else {
      // Get overall statistics
      const statistics = await CohortModel.getStatistics();
      sendSuccessResponse(res, statistics, 'Overall statistics retrieved successfully');
    }
  } catch (error: any) {
    if (isZodError(error)) {
      const appError = transformZodError(error);
      sendErrorResponse(res, appError.statusCode, appError.code, appError.message, appError.details);
      return;
    }

    if (error.message === 'Cohort not found') {
      sendErrorResponse(res, 404, ErrorCode.RESOURCE_NOT_FOUND, 'Cohort not found');
      return;
    }

    console.error('Get cohort statistics error:', error);
    sendErrorResponse(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve statistics');
  }
}));

/**
 * GET /v1/cohorts/:id - Get specific cohort details
 */
router.get('/:id', asyncHandler<BaseRequest>(async (req, res) => {
  try {
    // Validate parameters
    const { id } = cohortParamsSchema.parse(req.params);

    const cohort = await CohortModel.findById(id);

    if (!cohort) {
      sendErrorResponse(res, 404, ErrorCode.RESOURCE_NOT_FOUND, 'Cohort not found');
      return;
    }

    // Check if user is authenticated for detailed view
    const user = (req as any).user;
    const isAdmin = user && user.role === 'admin';
    
    if (isAdmin) {
      // Admin gets full details including enrollments
      const cohortDetails = {
        id: cohort.id,
        name: cohort.name,
        startDate: cohort.startDate,
        endDate: cohort.endDate,
        status: cohort.status,
        location: cohort.location,
        schedule: cohort.schedule,
        maxCapacity: cohort.maxCapacity,
        currentEnrollment: cohort.currentEnrollment,
        availableSpots: Math.max(0, cohort.maxCapacity - cohort.currentEnrollment),
        createdAt: cohort.createdAt,
        updatedAt: cohort.updatedAt,
        enrollments: (cohort as any).enrollments?.map((enrollment: any) => ({
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
          }
        })) || []
      };
      
      sendSuccessResponse(res, cohortDetails, 'Cohort details retrieved successfully');
    } else {
      // Public gets basic information only
      const publicCohort = {
        id: cohort.id,
        name: cohort.name,
        startDate: cohort.startDate,
        endDate: cohort.endDate,
        status: cohort.status,
        location: cohort.location,
        schedule: cohort.schedule,
        maxCapacity: cohort.maxCapacity,
        currentEnrollment: cohort.currentEnrollment,
        availableSpots: Math.max(0, cohort.maxCapacity - cohort.currentEnrollment),
        isEnrollmentOpen: cohort.status === CohortStatus.OPEN_ENROLLMENT && cohort.currentEnrollment < cohort.maxCapacity
      };
      
      sendSuccessResponse(res, publicCohort, 'Cohort information retrieved successfully');
    }
  } catch (error: any) {
    if (isZodError(error)) {
      const appError = transformZodError(error);
      sendErrorResponse(res, appError.statusCode, appError.code, appError.message, appError.details);
      return;
    }

    console.error('Get cohort error:', error);
    sendErrorResponse(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve cohort');
  }
}));

/**
 * PATCH /v1/cohorts/:id - Update cohort (admin only)
 */
router.patch('/:id', authenticate, requireAdmin, asyncHandler<AuthenticatedRequest>(async (req, res) => {
  try {
    // Validate parameters and body
    const { id } = cohortParamsSchema.parse(req.params);
    const updateData = updateCohortRequestSchema.parse(req.body);

    // Convert string dates to Date objects if provided
    const cohortUpdateData: any = { ...updateData };
    if (updateData.startDate) {
      cohortUpdateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      cohortUpdateData.endDate = new Date(updateData.endDate);
    }

    const updatedCohort = await CohortModel.update(id, cohortUpdateData);

    sendSuccessResponse(res, updatedCohort, 'Cohort updated successfully');
  } catch (error: any) {
    if (isZodError(error)) {
      const appError = transformZodError(error);
      sendErrorResponse(res, appError.statusCode, appError.code, appError.message, appError.details);
      return;
    }

    if (error.message === 'Cohort not found') {
      sendErrorResponse(res, 404, ErrorCode.RESOURCE_NOT_FOUND, 'Cohort not found');
      return;
    }

    if (error.message === 'Cannot reduce capacity below current enrollment count') {
      sendErrorResponse(res, 409, ErrorCode.OPERATION_NOT_ALLOWED, 'Cannot reduce capacity below current enrollment count');
      return;
    }

    console.error('Update cohort error:', error);
    sendErrorResponse(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to update cohort');
  }
}));

/**
 * PATCH /v1/cohorts/:id/status - Update cohort status (admin only)
 */
router.patch('/:id/status', authenticate, requireAdmin, asyncHandler<AuthenticatedRequest>(async (req, res) => {
  try {
    // Validate parameters and body
    const { id } = cohortParamsSchema.parse(req.params);
    const { status } = cohortStatusSchema.parse(req.body);

    const updatedCohort = await CohortModel.updateStatus(id, status);

    sendSuccessResponse(res, {
      id: updatedCohort.id,
      name: updatedCohort.name,
      status: updatedCohort.status,
      updatedAt: updatedCohort.updatedAt
    }, 'Cohort status updated successfully');
  } catch (error: any) {
    if (isZodError(error)) {
      const appError = transformZodError(error);
      sendErrorResponse(res, appError.statusCode, appError.code, appError.message, appError.details);
      return;
    }

    if (error.message === 'Cohort not found') {
      sendErrorResponse(res, 404, ErrorCode.RESOURCE_NOT_FOUND, 'Cohort not found');
      return;
    }

    if (error.message.startsWith('Invalid status transition')) {
      sendErrorResponse(res, 409, ErrorCode.OPERATION_NOT_ALLOWED, error.message);
      return;
    }

    console.error('Update cohort status error:', error);
    sendErrorResponse(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to update cohort status');
  }
}));

/**
 * GET /v1/cohorts/:id/enrollments - Get cohort enrollments (admin only)
 */
router.get('/:id/enrollments', authenticate, requireAdmin, asyncHandler<AuthenticatedRequest>(async (req, res) => {
  try {
    // Validate parameters
    const { id } = cohortParamsSchema.parse(req.params);

    const cohort = await CohortModel.findById(id);

    if (!cohort) {
      sendErrorResponse(res, 404, ErrorCode.RESOURCE_NOT_FOUND, 'Cohort not found');
      return;
    }

    // Transform enrollments for admin view
    const enrollments = (cohort as any).enrollments?.map((enrollment: any) => ({
      id: enrollment.id,
      status: enrollment.status,
      paymentPlan: enrollment.paymentPlan,
      totalAmount: enrollment.totalAmount,
      paidAmount: enrollment.paidAmount,
      remainingAmount: enrollment.totalAmount.toNumber() - enrollment.paidAmount.toNumber(),
      enrollmentDate: enrollment.enrollmentDate,
      questionnaire: enrollment.questionnaire,
      user: {
        id: enrollment.user.id,
        firstName: enrollment.user.firstName,
        lastName: enrollment.user.lastName,
        email: enrollment.user.email,
        phone: enrollment.user.phone,
        preferredLanguage: enrollment.user.preferredLanguage
      },
      paymentTransactions: enrollment.paymentTransactions?.map(transaction => ({
        id: transaction.id,
        amount: transaction.amount,
        status: transaction.status,
        installmentNumber: transaction.installmentNumber,
        processedAt: transaction.processedAt,
        paymentMethod: transaction.paymentMethod
      })) || []
    })) || [];

    const enrollmentStats = {
      totalEnrollments: enrollments.length,
      enrollmentsByStatus: enrollments.reduce((acc, enrollment) => {
        acc[enrollment.status] = (acc[enrollment.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      totalRevenue: enrollments.reduce((sum, enrollment) => sum + enrollment.paidAmount, 0),
      outstandingPayments: enrollments.reduce((sum, enrollment) => sum + enrollment.remainingAmount, 0)
    };

    sendSuccessResponse(res, {
      cohort: {
        id: cohort.id,
        name: cohort.name,
        status: cohort.status,
        maxCapacity: cohort.maxCapacity,
        currentEnrollment: cohort.currentEnrollment
      },
      enrollments,
      statistics: enrollmentStats
    }, 'Cohort enrollments retrieved successfully');
  } catch (error: any) {
    if (isZodError(error)) {
      const appError = transformZodError(error);
      sendErrorResponse(res, appError.statusCode, appError.code, appError.message, appError.details);
      return;
    }

    console.error('Get cohort enrollments error:', error);
    sendErrorResponse(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve cohort enrollments');
  }
}));

/**
 * DELETE /v1/cohorts/:id - Delete cohort (admin only)
 */
router.delete('/:id', authenticate, requireAdmin, asyncHandler<AuthenticatedRequest>(async (req, res) => {
  try {
    // Validate parameters
    const { id } = cohortParamsSchema.parse(req.params);

    await CohortModel.delete(id);

    sendSuccessResponse(res, { deleted: true }, 'Cohort deleted successfully');
  } catch (error: any) {
    if (isZodError(error)) {
      const appError = transformZodError(error);
      sendErrorResponse(res, appError.statusCode, appError.code, appError.message, appError.details);
      return;
    }

    if (error.message === 'Cohort not found') {
      sendErrorResponse(res, 404, ErrorCode.RESOURCE_NOT_FOUND, 'Cohort not found');
      return;
    }

    if (error.message === 'Cannot delete cohort with existing enrollments') {
      sendErrorResponse(res, 409, ErrorCode.OPERATION_NOT_ALLOWED, 'Cannot delete cohort with existing enrollments');
      return;
    }

    console.error('Delete cohort error:', error);
    sendErrorResponse(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to delete cohort');
  }
}));

/**
 * POST /v1/cohorts/update-statuses - Update cohort statuses based on dates (admin only)
 * This endpoint can be called manually or scheduled to run daily
 */
router.post('/update-statuses', authenticate, requireAdmin, asyncHandler<AuthenticatedRequest>(async (req, res) => {
  try {
    await CohortModel.updateCohortStatuses();
    
    sendSuccessResponse(res, { updated: true }, 'Cohort statuses updated successfully');
  } catch (error: any) {
    console.error('Update cohort statuses error:', error);
    sendErrorResponse(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to update cohort statuses');
  }
}));

/**
 * GET /v1/cohorts/management/attention - Get cohorts needing attention (admin only)
 */
router.get('/management/attention', authenticate, requireAdmin, asyncHandler<AuthenticatedRequest>(async (req, res) => {
  try {
    const cohortsNeedingAttention = await CohortModel.getCohortsNeedingAttention();
    
    sendSuccessResponse(res, cohortsNeedingAttention, 'Cohorts needing attention retrieved successfully');
  } catch (error: any) {
    console.error('Get cohorts needing attention error:', error);
    sendErrorResponse(res, 500, ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to retrieve cohorts needing attention');
  }
}));

export default router;