import { Router, Request, Response } from 'express';
import { z } from 'zod';
// import '../../types/express';
import { CohortServiceStub as CohortService } from '@/services/stubs';
import {
  asyncHandler,
  validateRequest,
  authenticateToken,
  requireAdmin,
  optionalAuth,
  responseHelpers,
  requestLogger,
} from '@/utils/middleware';

const router = Router();

// Apply middleware
router.use(responseHelpers);
router.use(requestLogger);

// Validation schemas
const cohortParamsSchema = z.object({
  id: z.string().uuid('Invalid cohort ID format'),
});

const createCohortSchema = z.object({
  name: z.string().min(1, 'Cohort name is required'),
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
  maxCapacity: z.number().int().min(1).max(50).default(20),
  location: z.string().default('Mazkeret Batya'),
  schedule: z.string().default('Weekly evenings, 1.5-2 hours'),
});

const updateCohortSchema = createCohortSchema.partial();

const querySchema = z.object({
  status: z.enum(['UPCOMING', 'OPEN_ENROLLMENT', 'FULL', 'IN_PROGRESS', 'COMPLETED']).optional(),
});

/**
 * GET /cohorts/current
 * Get current cohort for landing page (public endpoint)
 */
router.get('/current',
  optionalAuth,
  asyncHandler(async (_req: Request, res: Response) => {
    const cohort = await CohortService.getCurrentCohort();

    if (!cohort) {
      res.error(404, 'אין קבוצה פעילה כרגע / No current cohort available');
      return;
    }

    // Get enrollment availability
    const availability = await CohortService.checkEnrollmentAvailability(cohort.id);

    res.success({
      id: cohort.id,
      name: cohort.name,
      startDate: cohort.startDate,
      endDate: cohort.endDate,
      location: cohort.location,
      schedule: cohort.schedule,
      status: cohort.status,
      capacity: {
        maximum: cohort.maxCapacity,
        current: cohort.currentEnrollment,
        available: availability.spotsAvailable,
      },
      enrollment: {
        canEnroll: availability.canEnroll,
        message: availability.message,
      },
    }, 'Current cohort retrieved successfully');
  })
);

/**
 * GET /cohorts
 * Get all cohorts (admin only)
 */
router.get('/',
  authenticateToken,
  requireAdmin,
  validateRequest({ query: querySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.query as { status?: string };
    const cohorts = await CohortService.getAllCohorts(status as any);

    const cohortsWithStats = await Promise.all(
      cohorts.map(async (cohort: any) => {
        const stats = await CohortService.getCohortStatistics(cohort.id);
        return {
          ...cohort,
          statistics: stats,
        };
      })
    );

    res.success(cohortsWithStats, 'Cohorts retrieved successfully');
  })
);

/**
 * GET /cohorts/:id
 * Get cohort details (admin only)
 */
router.get('/:id',
  authenticateToken,
  requireAdmin,
  validateRequest({ params: cohortParamsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const cohort = await CohortService.getCohortDetails(id);
    const statistics = await CohortService.getCohortStatistics(id);
    const trends = await CohortService.getEnrollmentTrends(id);

    res.success({
      ...cohort,
      statistics,
      enrollmentTrends: trends,
    }, 'Cohort details retrieved successfully');
  })
);

/**
 * POST /cohorts
 * Create new cohort (admin only)
 */
router.post('/',
  authenticateToken,
  requireAdmin,
  validateRequest({ body: createCohortSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as any;
    const cohortData = {
      ...body,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    };

    const cohort = await CohortService.createCohort(cohortData);

    res.created(cohort, 'Cohort created successfully');
  })
);

/**
 * PATCH /cohorts/:id
 * Update cohort (admin only)
 */
router.patch('/:id',
  authenticateToken,
  requireAdmin,
  validateRequest({
    params: cohortParamsSchema,
    body: updateCohortSchema,
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const updateData: any = { ...req.body as any };

    // Convert date strings to Date objects
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate);
    }

    const cohort = await CohortService.updateCohort(id, updateData);

    res.success(cohort, 'Cohort updated successfully');
  })
);

/**
 * PATCH /cohorts/:id/status
 * Update cohort status (admin only)
 */
router.patch('/:id/status',
  authenticateToken,
  requireAdmin,
  validateRequest({
    params: cohortParamsSchema,
    body: z.object({
      status: z.enum(['UPCOMING', 'OPEN_ENROLLMENT', 'FULL', 'IN_PROGRESS', 'COMPLETED']),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const { status } = req.body as { status: string };

    const cohort = await CohortService.updateCohortStatus(id, status as any);

    res.success(cohort, `Cohort status updated to ${status}`);
  })
);

/**
 * DELETE /cohorts/:id
 * Delete cohort (admin only)
 */
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  validateRequest({ params: cohortParamsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await CohortService.deleteCohort(id);

    res.success(null, 'Cohort deleted successfully');
  })
);

/**
 * GET /cohorts/:id/capacity
 * Get real-time capacity information for specific cohort (public)
 */
router.get('/:id/capacity',
  optionalAuth,
  validateRequest({ params: cohortParamsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const capacityInfo = await CohortService.getCapacityInfo(id);
      const availability = await CohortService.checkEnrollmentAvailability(id);

      const response = {
        cohortId: id,
        capacity: {
          maximum: capacityInfo.maximum,
          current: capacityInfo.current,
          available: capacityInfo.available,
          percentage: Math.round((capacityInfo.current / capacityInfo.maximum) * 100),
        },
        enrollment: {
          canEnroll: availability.canEnroll,
          status: availability.status,
          message: {
            en: availability.message,
            he: CohortService.translateMessage(availability.message, 'he'),
          },
        },
        waitlist: {
          enabled: capacityInfo.waitlistEnabled,
          position: null, // TODO: Implement waitlist position
        },
        updatedAt: new Date().toISOString(),
      };

      res.success(response, 'Capacity information retrieved successfully');
    } catch (error) {
      console.error('Error getting capacity info:', error);
      res.error(404, 'Cohort not found or capacity information unavailable');
    }
  })
);

/**
 * GET /cohorts/:id/availability
 * Check enrollment availability for specific cohort (public)
 */
router.get('/:id/availability',
  optionalAuth,
  validateRequest({ params: cohortParamsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const availability = await CohortService.checkEnrollmentAvailability(id);

    res.success(availability, 'Enrollment availability checked');
  })
);

/**
 * GET /cohorts/:id/statistics
 * Get cohort statistics (admin only)
 */
router.get('/:id/statistics',
  authenticateToken,
  requireAdmin,
  validateRequest({ params: cohortParamsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const statistics = await CohortService.getCohortStatistics(id);

    res.success(statistics, 'Cohort statistics retrieved');
  })
);

/**
 * GET /cohorts/statistics/overview
 * Get overall cohort statistics (admin only)
 */
router.get('/statistics/overview',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    const statistics = await CohortService.getCohortStatistics();

    res.success(statistics, 'Overall cohort statistics retrieved');
  })
);

export default router;