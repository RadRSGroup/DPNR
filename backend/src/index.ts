import express from 'express';
import dotenv from 'dotenv';
import compression from 'compression';

// Load environment variables first
dotenv.config();

// Import security middleware
import {
  securityHeaders,
  corsConfig,
  generalRateLimit,
  authRateLimit,
  paymentRateLimit,
  enrollmentRateLimit,
  sanitizeRequest,
  securityLogger,
  requestSizeLimit,
} from './middleware/security';

// Import standardized utilities
import { globalErrorHandler, notFoundHandler, sendSuccessResponse } from './utils/errorHandling';
import { RouteHandler } from './types/express';

// Import API routes
import authRoutes from './routes/auth';
import enrollmentRoutes from './routes/enrollments';
import cohortRoutes from './routes/cohorts';
// import consultationRoutes from './api/consultations';
// import userRoutes from './api/users';
// import privacyRoutes from './api/privacy';

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy for production (Railway, AWS Lambda, etc.)
if (isProduction) {
  app.set('trust proxy', 1);
}

// Compression middleware for production
if (isProduction) {
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6,
    threshold: 1000,
  }));
}

// Security middleware
app.use(securityHeaders);
app.use(corsConfig);
app.use(securityLogger);
app.use(sanitizeRequest);
app.use(requestSizeLimit());

// Global rate limiting
app.use('/v1/', generalRateLimit);

// Body parsing middleware with security limits
const bodyLimit = process.env.MAX_FILE_SIZE || '10mb';
app.use(express.json({
  limit: bodyLimit,
  type: 'application/json',
  verify: (req, res, buf) => {
    // Store raw body for webhook verification if needed
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({
  extended: true,
  limit: bodyLimit,
  parameterLimit: 20,
}));

// Health check endpoint - using proper RouteHandler type
const healthHandler: RouteHandler = (_req, res): void => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    features: {
      registration: process.env.ENABLE_REGISTRATION === 'true',
      payments: process.env.ENABLE_PAYMENTS === 'true',
      consultations: process.env.ENABLE_CONSULTATIONS === 'true',
    },
  };

  // Remove sensitive information in production
  if (isProduction) {
    delete healthData.memory;
    delete healthData.features;
  }

  sendSuccessResponse(res, healthData, 'Service is healthy');
};

// Health check should not be rate limited
app.get('/health', healthHandler);
app.get('/v1/health', healthHandler);

// API routes with specific rate limiting
app.use('/v1/auth', authRateLimit, authRoutes);
app.use('/v1/enrollments', enrollmentRateLimit, enrollmentRoutes);
app.use('/v1/cohorts', cohortRoutes);
// app.use('/v1/payments', paymentRateLimit, paymentRoutes);
// app.use('/v1/consultations', consultationRoutes);
// app.use('/v1/users', userRoutes);
// app.use('/v1/privacy', privacyRoutes);

// Basic test route - using proper RouteHandler type
const testHandler: RouteHandler = (_req, res): void => {
  sendSuccessResponse(res, {
    message: 'DPNR Backend API is running!',
    version: '1.0.0'
  }, 'API is operational');
};

app.get('/v1/test', testHandler);

// Use standardized error handlers
app.use('*', notFoundHandler);
app.use(globalErrorHandler);

// Graceful shutdown handler
const gracefulShutdown = (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  // Close server
  server.close((err) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err);
      process.exit(1);
    }

    console.log('✅ Server closed successfully');

    // Close database connections, etc.
    // await prisma.$disconnect();

    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('⏰ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 DPNR Backend Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/v1`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 Security: Enhanced security middleware enabled`);
  console.log(`⚡ Compression: ${isProduction ? 'Enabled' : 'Disabled'}`);
  console.log(`🛡️ Rate limiting: Enabled`);

  if (isProduction) {
    console.log(`🏗️ Production mode: Optimizations active`);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;