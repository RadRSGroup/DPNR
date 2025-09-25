import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { UserServiceStub as UserService } from '@/services/stubs';
import { UserModelStub as UserModel } from '@/models/stubs';
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
const userParamsSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
});

const updateProfileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50).optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50).optional(),
  phone: z.string().regex(/^(\+972|0)(5[0-9]|7[23479])-?\d{7}$/, 'Invalid Israeli phone number').optional(),
  preferredLanguage: z.enum(['HE', 'EN']).optional(),
  dateOfBirth: z.string().datetime().optional(),
  emergencyContact: z.object({
    name: z.string().min(2).max(100),
    phone: z.string().regex(/^(\+972|0)(5[0-9]|7[23479])-?\d{7}$/, 'Invalid Israeli phone number'),
    relationship: z.string().min(2).max(50),
  }).optional(),
  marketingConsent: z.boolean().optional(),
  profileVisibility: z.enum(['PUBLIC', 'COHORT_ONLY', 'PRIVATE']).optional(),
});

const adminCreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50),
  phone: z.string().regex(/^(\+972|0)(5[0-9]|7[23479])-?\d{7}$/, 'Invalid Israeli phone number').optional(),
  preferredLanguage: z.enum(['HE', 'EN']).default('HE'),
  role: z.enum(['USER', 'ADMIN', 'INSTRUCTOR']).default('USER'),
  sendInvitation: z.boolean().default(true),
});

const querySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING_DELETION']).optional(),
  role: z.enum(['USER', 'ADMIN', 'INSTRUCTOR']).optional(),
  cohortId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /users/profile
 * Get current user's profile
 */
router.get('/profile',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const user = await UserService.getUserById(userId);

    if (!user) {
      return res.error(404, 'User not found');
    }

    // Return user profile without sensitive information
    const profile = {
      id: user.id,
      cognitoId: user.cognitoId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      preferredLanguage: user.preferredLanguage,
      dateOfBirth: user.dateOfBirth,
      emergencyContact: user.emergencyContact,
      marketingConsent: user.marketingConsent,
      profileVisibility: user.profileVisibility,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.success(profile, 'User profile retrieved successfully');
  })
);

/**
 * PATCH /users/profile
 * Update current user's profile
 */
router.patch('/profile',
  authenticateToken,
  validateRequest({ body: updateProfileSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const updateData = req.body as any;

    const updatedUser = await UserService.updateUserProfile(userId, updateData);

    // Return updated profile without sensitive information
    const profile = {
      id: updatedUser.id,
      cognitoId: updatedUser.cognitoId,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      phone: updatedUser.phone,
      preferredLanguage: updatedUser.preferredLanguage,
      dateOfBirth: updatedUser.dateOfBirth,
      emergencyContact: updatedUser.emergencyContact,
      marketingConsent: updatedUser.marketingConsent,
      profileVisibility: updatedUser.profileVisibility,
      updatedAt: updatedUser.updatedAt,
    };

    res.success(profile, 'Profile updated successfully');
  })
);

/**
 * GET /users/data-export
 * Export user's personal data (GDPR compliance)
 */
router.get('/data-export',
  authenticateToken,
  strictRateLimit(3600000, 2), // 2 exports per hour
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const exportData = await UserService.exportUserData(userId);

    res.success(exportData, 'Personal data exported successfully');
  })
);

/**
 * POST /users/delete
 * Request account deletion (GDPR compliance)
 */
router.post('/delete',
  authenticateToken,
  strictRateLimit(86400000, 1), // 1 deletion request per day
  validateRequest({
    body: z.object({
      reason: z.string().max(500).optional(),
      confirmationText: z.string().refine(
        val => val === 'DELETE MY ACCOUNT',
        'Must type "DELETE MY ACCOUNT" to confirm'
      ),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const { reason } = req.body as any;

    const result = await UserService.requestAccountDeletion(userId, reason);

    res.success({
      deletionScheduledFor: result.deletionScheduledFor,
      message: 'Account deletion has been scheduled. You have 30 days to cancel this request.',
      cancellationInstructions: 'To cancel, log in again before the scheduled deletion date.',
    }, 'Account deletion request processed');
  })
);

/**
 * POST /users/cancel-deletion
 * Cancel account deletion request
 */
router.post('/cancel-deletion',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.sub;

    const user = await UserService.cancelAccountDeletion(userId);

    res.success({
      status: user.status,
      message: 'Account deletion request has been cancelled successfully.',
    }, 'Deletion cancelled');
  })
);

/**
 * GET /users/enrollments
 * Get current user's enrollment history
 */
router.get('/enrollments',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const enrollments = await UserService.getUserEnrollments(userId);

    res.success(enrollments, 'User enrollments retrieved successfully');
  })
);

/**
 * GET /users/consultations
 * Get current user's consultation history
 */
router.get('/consultations',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const consultations = await UserService.getUserConsultations(userId);

    res.success(consultations, 'User consultations retrieved successfully');
  })
);

/**
 * GET /users/payments
 * Get current user's payment history
 */
router.get('/payments',
  authenticateToken,
  validateRequest({
    query: z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      status: z.enum(['SUCCESS', 'FAILED', 'PENDING', 'REFUNDED']).optional(),
      limit: z.coerce.number().int().min(1).max(50).default(20),
      offset: z.coerce.number().int().min(0).default(0),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const filters = {
      startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
      status: req.query.status as any,
      limit: req.query.limit,
      offset: req.query.offset,
    };

    const payments = await UserService.getUserPayments(userId, filters);

    res.success(payments, 'User payment history retrieved successfully');
  })
);

/**
 * PATCH /users/preferences
 * Update user preferences (notifications, language, etc.)
 */
router.patch('/preferences',
  authenticateToken,
  validateRequest({
    body: z.object({
      emailNotifications: z.object({
        courseReminders: z.boolean().optional(),
        paymentReminders: z.boolean().optional(),
        promotional: z.boolean().optional(),
        systemUpdates: z.boolean().optional(),
      }).optional(),
      smsNotifications: z.object({
        courseReminders: z.boolean().optional(),
        paymentReminders: z.boolean().optional(),
        emergencyOnly: z.boolean().optional(),
      }).optional(),
      preferredLanguage: z.enum(['HE', 'EN']).optional(),
      timezone: z.string().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const preferences = req.body;

    const updatedUser = await UserService.updateUserPreferences(userId, preferences);

    res.success({
      preferences: updatedUser.preferences,
      preferredLanguage: updatedUser.preferredLanguage,
    }, 'User preferences updated successfully');
  })
);

// ==================== ADMIN ENDPOINTS ====================

/**
 * GET /users
 * Get all users with filtering (admin only)
 */
router.get('/',
  authenticateToken,
  requireAdmin,
  validateRequest({ query: querySchema }),
  asyncHandler(async (req, res) => {
    const { search, status, role, cohortId, limit, offset } = req.query;

    const filters = {
      search: search as string,
      status: status as any,
      role: role as any,
      cohortId: cohortId as string,
      limit,
      offset,
    };

    const result = await UserModel.findAll(filters);

    res.success(result, 'Users retrieved successfully');
  })
);

/**
 * GET /users/:id
 * Get user details by ID (admin only)
 */
router.get('/:id',
  authenticateToken,
  requireAdmin,
  validateRequest({ params: userParamsSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await UserService.getUserById(id);

    if (!user) {
      return res.error(404, 'User not found');
    }

    res.success(user, 'User retrieved successfully');
  })
);

/**
 * POST /users
 * Create new user (admin only)
 */
router.post('/',
  authenticateToken,
  requireAdmin,
  validateRequest({ body: adminCreateUserSchema }),
  asyncHandler(async (req, res) => {
    const userData = req.body;
    const result = await UserService.createUser(userData);

    res.created(result, 'User created successfully');
  })
);

/**
 * PATCH /users/:id
 * Update user (admin only)
 */
router.patch('/:id',
  authenticateToken,
  requireAdmin,
  validateRequest({
    params: userParamsSchema,
    body: updateProfileSchema.extend({
      role: z.enum(['USER', 'ADMIN', 'INSTRUCTOR']).optional(),
      status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING_DELETION']).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    const updatedUser = await UserService.updateUser(id, updateData);

    res.success(updatedUser, 'User updated successfully');
  })
);

/**
 * DELETE /users/:id
 * Permanently delete user (admin only)
 */
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  validateRequest({ params: userParamsSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await UserService.permanentlyDeleteUser(id);

    res.success(null, 'User permanently deleted');
  })
);

/**
 * GET /users/statistics
 * Get user statistics (admin only)
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
  asyncHandler(async (req, res) => {
    const filters = {
      startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
    };

    const statistics = await UserService.getUserStatistics(filters);

    res.success(statistics, 'User statistics retrieved successfully');
  })
);

/**
 * POST /users/:id/sync-cognito
 * Sync user data with Cognito (admin only)
 */
router.post('/:id/sync-cognito',
  authenticateToken,
  requireAdmin,
  validateRequest({ params: userParamsSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await UserService.syncUserWithCognito(id);

    res.success(user, 'User synced with Cognito successfully');
  })
);

export default router;