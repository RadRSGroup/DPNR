import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { RouteHandler } from '../types/express';
import { sendSuccessResponse, sendErrorResponse } from '../utils/errorHandling';
import logger from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Comprehensive health check endpoint
const healthCheck: RouteHandler = async (req, res) => {
  const startTime = Date.now();

  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(process.uptime()),
      checks: {
        database: { status: 'unknown', responseTime: 0 },
        memory: { status: 'healthy', usage: process.memoryUsage() },
        features: {
          registration: process.env.ENABLE_REGISTRATION === 'true',
          payments: process.env.ENABLE_PAYMENTS === 'true',
          consultations: process.env.ENABLE_CONSULTATIONS === 'true',
        },
      },
    };

    // Database health check
    const dbStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.checks.database = {
        status: 'healthy',
        responseTime: Date.now() - dbStart,
      };
    } catch (error) {
      health.checks.database = {
        status: 'unhealthy',
        responseTime: Date.now() - dbStart,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      health.status = 'degraded';
    }

    // Memory health check
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    if (memoryUsagePercent > 90) {
      health.checks.memory.status = 'critical';
      health.status = 'degraded';
    } else if (memoryUsagePercent > 75) {
      health.checks.memory.status = 'warning';
    }

    // Overall response time
    const responseTime = Date.now() - startTime;
    (health as any).responseTime = responseTime;

    // Log health check if there are issues
    if (health.status !== 'healthy') {
      logger.warn('Health check detected issues', health);
    }

    // Return appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 503 : 500;

    res.status(statusCode).json({
      success: health.status === 'healthy',
      data: health,
    });
  } catch (error) {
    logger.error('Health check failed', error);
    sendErrorResponse(res, 'Health check failed', 500, error);
  }
};

// Readiness check (for Kubernetes/container orchestration)
const readinessCheck: RouteHandler = async (req, res) => {
  try {
    // Check if application is ready to serve traffic
    await prisma.$queryRaw`SELECT 1`;
    
    sendSuccessResponse(res, { status: 'ready' }, 'Service is ready');
  } catch (error) {
    logger.error('Readiness check failed', error);
    sendErrorResponse(res, 'Service not ready', 503, error);
  }
};

// Liveness check (for Kubernetes/container orchestration)
const livenessCheck: RouteHandler = (req, res) => {
  // Simple check that the process is alive
  sendSuccessResponse(res, { status: 'alive' }, 'Service is alive');
};

// Metrics endpoint
const metrics: RouteHandler = async (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    };

    // Database metrics
    const dbMetrics = await getDatabaseMetrics();
    (metrics as any).database = dbMetrics;

    sendSuccessResponse(res, metrics, 'Metrics collected');
  } catch (error) {
    logger.error('Metrics collection failed', error);
    sendErrorResponse(res, 'Failed to collect metrics', 500, error);
  }
};

// Database-specific metrics
const getDatabaseMetrics = async () => {
  try {
    const [userCount, enrollmentCount, cohortCount] = await Promise.all([
      prisma.user.count(),
      prisma.enrollment.count(),
      prisma.cohort.count(),
    ]);

    return {
      tables: {
        users: userCount,
        enrollments: enrollmentCount,
        cohorts: cohortCount,
      },
      connectionPool: {
        // Prisma doesn't expose connection pool metrics directly
        status: 'healthy',
      },
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'unhealthy',
    };
  }
};

// Database connection test
const databaseCheck: RouteHandler = async (req, res) => {
  const startTime = Date.now();

  try {
    // Test basic connectivity
    await prisma.$queryRaw`SELECT NOW() as current_time`;
    
    // Test write capability with a transaction
    await prisma.$transaction(async (tx) => {
      // This doesn't actually create anything, just tests the transaction
      await tx.$queryRaw`SELECT 1`;
    });

    const responseTime = Date.now() - startTime;

    sendSuccessResponse(res, {
      status: 'healthy',
      responseTime,
      timestamp: new Date().toISOString(),
    }, 'Database connection healthy');
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Database check failed', { error, responseTime });
    
    sendErrorResponse(res, 'Database connection failed', 503, {
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
    });
  }
};

// Application info
const info: RouteHandler = (req, res) => {
  const info = {
    name: 'DPNR Course Registration API',
    version: process.env.npm_package_version || '1.0.0',
    description: 'Backend API for DPNR Personal Development Program',
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    features: {
      authentication: 'AWS Cognito',
      database: 'PostgreSQL with Prisma',
      payments: 'Tranzila',
      languages: ['Hebrew', 'English'],
    },
    endpoints: {
      health: '/health',
      readiness: '/ready',
      liveness: '/live',
      metrics: '/metrics',
      database: '/db-check',
      info: '/info',
    },
  };

  sendSuccessResponse(res, info, 'Application information');
};

// Routes
router.get('/health', healthCheck);
router.get('/ready', readinessCheck);
router.get('/live', livenessCheck);
router.get('/metrics', metrics);
router.get('/db-check', databaseCheck);
router.get('/info', info);

// Graceful shutdown cleanup
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
});

export default router;