import { Router, Request, Response } from 'express';
import prisma from '@/database/connection';

const router = Router();

/**
 * Health check endpoint
 * GET /health
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: 'checking...',
        memory: 'healthy',
        uptime: Math.floor(process.uptime()),
      }
    };

    // Database connectivity check
    try {
      await prisma.$queryRaw`SELECT 1`;

      // Get basic database stats
      const [userCount, cohortCount, enrollmentCount] = await Promise.all([
        prisma.user.count(),
        prisma.cohort.count(),
        prisma.enrollment.count(),
      ]);

      (healthStatus.checks as any).database = {
        status: 'healthy',
        stats: {
          users: userCount,
          cohorts: cohortCount,
          enrollments: enrollmentCount,
        },
      };
    } catch (dbError) {
      healthStatus.status = 'unhealthy';
      (healthStatus.checks as any).database = {
        status: 'error',
        error: dbError instanceof Error ? dbError.message : 'Unknown database error',
      };
    }

    // Memory usage check
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    };

    (healthStatus.checks as any).memory = {
      status: memUsageMB.heapUsed < 500 ? 'healthy' : 'warning',
      usage: memUsageMB,
    };

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

    res.status(statusCode).json(healthStatus);

  } catch (error) {
    console.error('Health check failed:', error);

    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed',
    });
  }
});

/**
 * Database-specific health check
 * GET /health/database
 */
router.get('/database', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();

    // Test basic connection
    await prisma.$connect();

    // Test query performance
    const result = await prisma.$queryRaw`
      SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    `;

    const queryTime = Date.now() - startTime;

    // Get connection info
    const dbInfo = await prisma.$queryRaw`
      SELECT
        version() as version,
        current_database() as database,
        current_user as user,
        pg_postmaster_start_time() as start_time,
        count(*) as active_connections
      FROM pg_stat_activity
      WHERE state = 'active';
    `;

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: `${queryTime}ms`,
      connection: {
        status: 'connected',
        info: dbInfo,
      },
      tables: result,
    });

  } catch (error) {
    console.error('Database health check failed:', error);

    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Database check failed',
    });
  } finally {
    await prisma.$disconnect();
  }
});

/**
 * Readiness check for Kubernetes/Docker
 * GET /health/ready
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if all required services are available
    await prisma.$queryRaw`SELECT 1`;

    // Check if environment variables are set
    const requiredEnvVars = [
      'DATABASE_URL',
      'NODE_ENV',
    ];

    const missingEnvVars = requiredEnvVars.filter(
      envVar => !process.env[envVar]
    );

    if (missingEnvVars.length > 0) {
      return res.status(503).json({
        status: 'not_ready',
        reason: 'Missing environment variables',
        missing: missingEnvVars,
      });
    }

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      reason: error instanceof Error ? error.message : 'Readiness check failed',
    });
  }
});

export default router;