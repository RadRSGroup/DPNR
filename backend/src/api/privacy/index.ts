import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrivacyServiceStub as PrivacyService } from '@/services/stubs';
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
const consentParamsSchema = z.object({
  id: z.string().uuid('Invalid consent ID format'),
});

const recordConsentSchema = z.object({
  consentType: z.enum([
    'TERMS_OF_SERVICE',
    'PRIVACY_POLICY',
    'MARKETING_EMAILS',
    'MARKETING_SMS',
    'DATA_PROCESSING',
    'COOKIES',
    'ANALYTICS'
  ]),
  granted: z.boolean(),
  version: z.string().min(1, 'Version is required'),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const updateConsentSchema = z.object({
  granted: z.boolean(),
  reason: z.string().max(500).optional(),
});

const querySchema = z.object({
  consentType: z.enum([
    'TERMS_OF_SERVICE',
    'PRIVACY_POLICY',
    'MARKETING_EMAILS',
    'MARKETING_SMS',
    'DATA_PROCESSING',
    'COOKIES',
    'ANALYTICS'
  ]).optional(),
  granted: z.boolean().optional(),
  version: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * POST /privacy/consent
 * Record user consent (public endpoint with optional auth)
 */
router.post('/consent',
  optionalAuth,
  strictRateLimit(300000, 10), // 10 consent records per 5 minutes
  validateRequest({ body: recordConsentSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const consentData = {
      ...req.body,
      userId: req.user?.sub,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    const consent = await PrivacyService.recordConsent(consentData);

    res.created({
      id: consent.id,
      consentType: consent.consentType,
      granted: consent.granted,
      version: consent.version,
      recordedAt: consent.createdAt,
    }, 'Consent recorded successfully');
  })
);

/**
 * GET /privacy/consent/current
 * Get current user's consent status
 */
router.get('/consent/current',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const consents = await PrivacyService.getUserCurrentConsents(userId);

    res.success(consents, 'Current consent status retrieved successfully');
  })
);

/**
 * GET /privacy/consent/history
 * Get user's consent history
 */
router.get('/consent/history',
  authenticateToken,
  validateRequest({ query: querySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const filters = {
      consentType: req.query.consentType as any,
      granted: req.query.granted,
      version: req.query.version,
      startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
      limit: req.query.limit,
      offset: req.query.offset,
    };

    const history = await PrivacyService.getUserConsentHistory(userId, filters);

    res.success(history, 'Consent history retrieved successfully');
  })
);

/**
 * PATCH /privacy/consent/:id
 * Update existing consent
 */
router.patch('/consent/:id',
  authenticateToken,
  validateRequest({
    params: consentParamsSchema,
    body: updateConsentSchema,
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { granted, reason } = req.body;
    const userId = req.user!.sub;

    // Verify user owns this consent record
    const existingConsent = await PrivacyService.getConsentById(id);
    if (!existingConsent || existingConsent.userId !== userId) {
      return res.error(403, 'Access denied to this consent record');
    }

    const updatedConsent = await PrivacyService.updateConsent(id, {
      granted,
      reason,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    res.success({
      id: updatedConsent.id,
      consentType: updatedConsent.consentType,
      granted: updatedConsent.granted,
      updatedAt: updatedConsent.updatedAt,
    }, 'Consent updated successfully');
  })
);

/**
 * POST /privacy/withdraw-all
 * Withdraw all marketing consents
 */
router.post('/withdraw-all',
  authenticateToken,
  validateRequest({
    body: z.object({
      reason: z.string().max(500).optional(),
      keepEssential: z.boolean().default(true),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const { reason, keepEssential } = req.body;

    const result = await PrivacyService.withdrawAllConsents(userId, {
      reason,
      keepEssential,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    res.success({
      withdrawnConsents: result.withdrawnConsents,
      keptConsents: result.keptConsents,
      message: keepEssential
        ? 'Marketing consents withdrawn. Essential consents maintained for service delivery.'
        : 'All consents withdrawn.',
    }, 'Consents withdrawn successfully');
  })
);

/**
 * GET /privacy/policies/current
 * Get current privacy policy and terms versions (public endpoint)
 */
router.get('/policies/current',
  asyncHandler(async (req: Request, res: Response) => {
    const policies = await PrivacyService.getCurrentPolicyVersions();

    res.success(policies, 'Current policy versions retrieved successfully');
  })
);

/**
 * GET /privacy/data-processing
 * Get user's data processing activities
 */
router.get('/data-processing',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const activities = await PrivacyService.getDataProcessingActivities(userId);

    res.success(activities, 'Data processing activities retrieved successfully');
  })
);

/**
 * POST /privacy/data-portability
 * Request data portability (GDPR Article 20)
 */
router.post('/data-portability',
  authenticateToken,
  strictRateLimit(86400000, 1), // 1 request per day
  validateRequest({
    body: z.object({
      format: z.enum(['JSON', 'CSV', 'XML']).default('JSON'),
      includeHistory: z.boolean().default(true),
      dataTypes: z.array(z.enum([
        'PROFILE',
        'ENROLLMENTS',
        'PAYMENTS',
        'CONSULTATIONS',
        'CONSENTS',
        'ACTIVITY_LOGS'
      ])).optional(),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const { format, includeHistory, dataTypes } = req.body;

    const request = await PrivacyService.requestDataPortability(userId, {
      format,
      includeHistory,
      dataTypes,
    });

    res.success({
      requestId: request.id,
      status: request.status,
      estimatedCompletionTime: request.estimatedCompletionTime,
      downloadUrl: request.downloadUrl,
      expiresAt: request.expiresAt,
    }, 'Data portability request submitted successfully');
  })
);

/**
 * GET /privacy/data-portability/:requestId
 * Check data portability request status
 */
router.get('/data-portability/:requestId',
  authenticateToken,
  validateRequest({
    params: z.object({
      requestId: z.string().uuid('Invalid request ID format'),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { requestId } = req.params;
    const userId = req.user!.sub;

    const request = await PrivacyService.getDataPortabilityRequest(requestId, userId);

    if (!request) {
      return res.error(404, 'Data portability request not found');
    }

    res.success({
      id: request.id,
      status: request.status,
      progress: request.progress,
      downloadUrl: request.downloadUrl,
      expiresAt: request.expiresAt,
      createdAt: request.createdAt,
      completedAt: request.completedAt,
    }, 'Data portability request status retrieved');
  })
);

/**
 * POST /privacy/cookie-preferences
 * Update cookie preferences
 */
router.post('/cookie-preferences',
  optionalAuth,
  validateRequest({
    body: z.object({
      essential: z.boolean().default(true),
      analytics: z.boolean().default(false),
      marketing: z.boolean().default(false),
      preferences: z.boolean().default(false),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const preferences = req.body;
    const userId = req.user?.sub;

    const result = await PrivacyService.updateCookiePreferences({
      userId,
      preferences,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    res.success({
      preferences: result.preferences,
      consentId: result.consentId,
    }, 'Cookie preferences updated successfully');
  })
);

// ==================== ADMIN ENDPOINTS ====================

/**
 * GET /privacy/consent
 * Get all consent records with filtering (admin only)
 */
router.get('/consent',
  authenticateToken,
  requireAdmin,
  validateRequest({ query: querySchema.extend({
    userId: z.string().uuid().optional(),
  }) }),
  asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      userId: req.query.userId,
      consentType: req.query.consentType as any,
      granted: req.query.granted,
      version: req.query.version,
      startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
      limit: req.query.limit,
      offset: req.query.offset,
    };

    const consents = await PrivacyService.getAllConsents(filters);

    res.success(consents, 'Consent records retrieved successfully');
  })
);

/**
 * GET /privacy/statistics
 * Get privacy and consent statistics (admin only)
 */
router.get('/statistics',
  authenticateToken,
  requireAdmin,
  validateRequest({
    query: z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      groupBy: z.enum(['DAY', 'WEEK', 'MONTH']).default('DAY'),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
      groupBy: req.query.groupBy as any,
    };

    const statistics = await PrivacyService.getConsentStatistics(filters);

    res.success(statistics, 'Privacy statistics retrieved successfully');
  })
);

/**
 * GET /privacy/compliance-report
 * Generate GDPR compliance report (admin only)
 */
router.get('/compliance-report',
  authenticateToken,
  requireAdmin,
  validateRequest({
    query: z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      format: z.enum(['JSON', 'CSV']).default('JSON'),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
      format: req.query.format as any,
    };

    const report = await PrivacyService.generateComplianceReport(filters);

    if (filters.format === 'CSV') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=compliance-report.csv');
      res.send(report);
    } else {
      res.success(report, 'Compliance report generated successfully');
    }
  })
);

/**
 * POST /privacy/policies
 * Create new policy version (admin only)
 */
router.post('/policies',
  authenticateToken,
  requireAdmin,
  validateRequest({
    body: z.object({
      type: z.enum(['PRIVACY_POLICY', 'TERMS_OF_SERVICE', 'COOKIE_POLICY']),
      version: z.string().min(1, 'Version is required'),
      content: z.string().min(100, 'Policy content must be at least 100 characters'),
      effectiveDate: z.string().datetime().optional(),
      summary: z.string().max(1000).optional(),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const policyData = {
      ...req.body,
      effectiveDate: req.body.effectiveDate ? new Date(req.body.effectiveDate) : new Date(),
      createdBy: req.user!.sub,
    };

    const policy = await PrivacyService.createPolicyVersion(policyData);

    res.created(policy, 'Policy version created successfully');
  })
);

export default router;