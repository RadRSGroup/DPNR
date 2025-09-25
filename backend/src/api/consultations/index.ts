import { Router, Request, Response } from 'express';
import { z } from 'zod';
// import '../../types/express';
import { ConsultationServiceStub as ConsultationService } from '@/services/stubs';
import { ConsultationModel } from '@/models/consultation.model';
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
const consultationParamsSchema = z.object({
  id: z.string().uuid('Invalid consultation ID format'),
});

const createConsultationSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email format'),
  phone: z.string().regex(/^(\+972|0)(5[0-9]|7[23479])-?\d{7}$/, 'Invalid Israeli phone number'),
  preferredLanguage: z.enum(['HE', 'EN']).default('HE'),
  preferredTimeSlot: z.string().min(1, 'Preferred time slot is required'),
  message: z.string().max(500, 'Message must be less than 500 characters').optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED']),
  notes: z.string().optional(),
});

const scheduleConsultationSchema = z.object({
  scheduledDate: z.string().datetime('Invalid scheduled date format'),
  scheduledTime: z.string().min(1, 'Scheduled time is required'),
  meetingLink: z.string().url().optional(),
});

const completeConsultationSchema = z.object({
  outcome: z.enum(['enrolled', 'not_interested', 'follow_up_needed']),
  notes: z.string().optional(),
});

const querySchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * POST /consultations
 * Create new consultation request (public endpoint with strict rate limiting)
 */
router.post('/',
  strictRateLimit(900000, 2), // 2 consultation requests per 15 minutes
  optionalAuth,
  validateRequest({ body: createConsultationSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const consultationData = {
      ...req.body,
      userId: req.user?.sub, // Link to user if authenticated
    };

    const result = await ConsultationService.createConsultationRequest(consultationData);

    res.created({
      id: result.consultation.id,
      status: result.consultation.status,
      message: result.message,
      expectedResponseTime: '24 hours',
    }, 'Consultation request submitted successfully');
  })
);

/**
 * GET /consultations
 * Get consultation requests (admin: all with filters, user: own requests)
 */
router.get('/',
  authenticateToken,
  validateRequest({ query: querySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const isAdmin = req.user?.groups?.includes('admin');
    const { status, startDate, endDate, limit, offset } = req.query;

    if (isAdmin) {
      // Admin can see all consultations with filtering
      const cleanFilters: {
        status?: any;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
      } = {};

      if (status) cleanFilters.status = status as any;
      if (startDate) cleanFilters.startDate = new Date(startDate as string);
      if (endDate) cleanFilters.endDate = new Date(endDate as string);
      if (limit) cleanFilters.limit = Number(limit);
      if (offset) cleanFilters.offset = Number(offset);

      const consultations = await ConsultationService.getConsultationRequests(cleanFilters);
      res.success(consultations, 'Consultation requests retrieved successfully');
    } else {
      // Regular users see only their own consultation history
      const consultations = await ConsultationService.getUserConsultationHistory(req.user!.sub);
      res.success(consultations, 'Your consultation history retrieved successfully');
    }
  })
);

/**
 * GET /consultations/:id
 * Get consultation request details
 */
router.get('/:id',
  authenticateToken,
  validateRequest({ params: consultationParamsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const consultation = await ConsultationService.getConsultationRequest(id);

    // Check access permissions
    const isOwner = consultation.userId === req.user?.sub;
    const isAdmin = req.user?.groups?.includes('admin');

    if (!isOwner && !isAdmin) {
      return res.error(403, 'Access denied to this consultation request');
    }

    res.success(consultation, 'Consultation request retrieved successfully');
  })
);

/**
 * PATCH /consultations/:id/status
 * Update consultation status (admin only)
 */
router.patch('/:id/status',
  authenticateToken,
  requireAdmin,
  validateRequest({
    params: consultationParamsSchema,
    body: updateStatusSchema,
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, notes } = req.body;

    const consultation = await ConsultationService.updateConsultationStatus(id, status, notes);

    res.success(consultation, `Consultation status updated to ${status}`);
  })
);

/**
 * POST /consultations/:id/process
 * Mark consultation as contacted (admin only)
 */
router.post('/:id/process',
  authenticateToken,
  requireAdmin,
  validateRequest({
    params: consultationParamsSchema,
    body: z.object({
      contactMethod: z.string().min(1, 'Contact method is required'),
      notes: z.string().optional(),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { contactMethod, notes } = req.body;

    const consultation = await ConsultationService.processConsultationRequest(id, contactMethod, notes);

    res.success(consultation, 'Consultation request processed successfully');
  })
);

/**
 * POST /consultations/:id/schedule
 * Schedule consultation meeting (admin only)
 */
router.post('/:id/schedule',
  authenticateToken,
  requireAdmin,
  validateRequest({
    params: consultationParamsSchema,
    body: scheduleConsultationSchema,
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { scheduledDate, scheduledTime, meetingLink } = req.body;

    const consultation = await ConsultationService.scheduleConsultation(
      id,
      new Date(scheduledDate),
      scheduledTime,
      meetingLink
    );

    res.success(consultation, 'Consultation scheduled successfully');
  })
);

/**
 * POST /consultations/:id/complete
 * Complete consultation with outcome (admin only)
 */
router.post('/:id/complete',
  authenticateToken,
  requireAdmin,
  validateRequest({
    params: consultationParamsSchema,
    body: completeConsultationSchema,
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { outcome, notes } = req.body;

    const consultation = await ConsultationService.completeConsultation(id, outcome, notes);

    res.success(consultation, `Consultation completed with outcome: ${outcome}`);
  })
);

/**
 * POST /consultations/:id/cancel
 * Cancel consultation request
 */
router.post('/:id/cancel',
  authenticateToken,
  validateRequest({
    params: consultationParamsSchema,
    body: z.object({
      reason: z.string().optional(),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    const consultation = await ConsultationService.getConsultationRequest(id);

    // Check access permissions
    const isOwner = consultation.userId === req.user?.sub;
    const isAdmin = req.user?.groups?.includes('admin');

    if (!isOwner && !isAdmin) {
      return res.error(403, 'Access denied to this consultation request');
    }

    const cancelledConsultation = await ConsultationService.cancelConsultationRequest(id, reason);

    res.success(cancelledConsultation, 'Consultation request cancelled successfully');
  })
);

/**
 * POST /consultations/:id/link-user
 * Link consultation request to user account (admin only)
 */
router.post('/:id/link-user',
  authenticateToken,
  requireAdmin,
  validateRequest({
    params: consultationParamsSchema,
    body: z.object({
      userId: z.string().uuid('Invalid user ID format'),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId } = req.body;

    const consultation = await ConsultationService.linkConsultationToUser(id, userId);

    res.success(consultation, 'Consultation linked to user account successfully');
  })
);

/**
 * GET /consultations/statistics
 * Get consultation statistics (admin only)
 */
router.get('/statistics',
  authenticateToken,
  requireAdmin,
  validateRequest({
    query: z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const cleanFilters: {
      startDate?: Date;
      endDate?: Date;
    } = {};

    if (req.query.startDate) cleanFilters.startDate = new Date(req.query.startDate as string);
    if (req.query.endDate) cleanFilters.endDate = new Date(req.query.endDate as string);

    const statistics = await ConsultationService.getConsultationStatistics(cleanFilters);

    res.success(statistics, 'Consultation statistics retrieved successfully');
  })
);

/**
 * GET /consultations/requiring-attention
 * Get consultation requests requiring attention (admin only)
 */
router.get('/requiring-attention',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    const attention = await ConsultationService.getRequestsRequiringAttention();

    res.success({
      newRequests: attention.newRequests.length,
      overdue: attention.overdue.length,
      followUpNeeded: attention.followUpNeeded.length,
      details: attention,
    }, 'Consultation requests requiring attention retrieved');
  })
);

/**
 * GET /consultations/trends
 * Get daily consultation trends (admin only)
 */
router.get('/trends',
  authenticateToken,
  requireAdmin,
  validateRequest({
    query: z.object({
      days: z.coerce.number().int().min(1).max(365).default(30),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { days } = req.query as any;
    const numDays = Number(days) || 30;
    const trends = await ConsultationService.getDailyTrends(numDays);

    res.success(trends, `Consultation trends for last ${numDays} days retrieved`);
  })
);

/**
 * GET /consultations/check-recent
 * Check if email has recent consultation request (public endpoint)
 */
router.get('/check-recent',
  validateRequest({
    query: z.object({
      email: z.string().email('Invalid email format'),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.query as { email: string };
    const hasRecent = await ConsultationModel.hasRecentRequest(email, 24);

    res.success({
      hasRecentRequest: hasRecent,
      message: hasRecent
        ? 'A consultation request has been submitted recently from this email'
        : 'No recent consultation requests found',
    }, 'Recent request check completed');
  })
);

export default router;