import { Request, Response, NextFunction } from 'express';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { AuthenticatedUser, UserSession } from '../types/auth';


// Initialize Cognito JWT verifier
let verifier: any = null;
try {
  if (process.env.AWS_COGNITO_USER_POOL_ID && process.env.AWS_COGNITO_CLIENT_ID) {
    verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.AWS_COGNITO_USER_POOL_ID,
      tokenUse: 'access',
      clientId: process.env.AWS_COGNITO_CLIENT_ID,
    });
  }
} catch (error) {
  console.warn('Cognito JWT verifier not initialized:', error);
}

/**
 * Authentication middleware - verifies Cognito JWT token
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!verifier) {
      res.status(500).json({
        error: 'Server Error',
        message: 'Authentication not configured',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Verify the token with Cognito
    const payload = await verifier.verify(token);

    // Create AuthenticatedUser object from JWT payload
    const authenticatedUser: AuthenticatedUser = {
      id: payload.sub, // Will be mapped to internal user ID when database is ready
      cognitoId: payload.sub,
      sub: payload.sub,
      email: (payload.email as string) || '',
      firstName: (payload.given_name as string) || '',
      lastName: (payload.family_name as string) || '',
      phone: (payload.phone_number as string) || undefined,
      emailVerified: (payload.email_verified as boolean) || false,
      mfaEnabled: false, // TODO: Get from Cognito when MFA is configured
      preferredLanguage: (payload['custom:preferred_language'] as 'he' | 'en') || 'he',
      role: (payload['custom:role'] as 'student' | 'instructor' | 'admin') || 'student',
      phoneVerified: (payload.phone_number_verified as boolean) || false,
      lastLoginAt: new Date(), // TODO: Update in database when available
      groups: payload['cognito:groups'] || []
    };

    // Create minimal session object
    const session: UserSession = {
      userId: payload.sub,
      cognitoId: payload.sub,
      accessToken: token,
      idToken: token, // In real implementation, we'd have separate ID token
      refreshToken: '', // Not available in access token flow
      tokenType: 'Bearer',
      expiresAt: new Date((payload.exp || 0) * 1000),
      refreshExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      scope: ['email', 'openid', 'profile'],
      createdAt: new Date((payload.iat || 0) * 1000),
      lastAccessedAt: new Date()
    };

    // Attach user and session to request
    req.user = authenticatedUser;
    req.session = session;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
      timestamp: new Date().toISOString(),
    });
    return;
  }
};

/**
 * Optional authentication - allows both authenticated and anonymous users
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token && verifier) {
      const payload = await verifier.verify(token);

      // Create AuthenticatedUser object from JWT payload
      const authenticatedUser: AuthenticatedUser = {
        id: payload.sub,
        cognitoId: payload.sub,
        sub: payload.sub,
        email: (payload.email as string) || '',
        firstName: (payload.given_name as string) || '',
        lastName: (payload.family_name as string) || '',
        phone: (payload.phone_number as string) || undefined,
        emailVerified: (payload.email_verified as boolean) || false,
        mfaEnabled: false,
        preferredLanguage: (payload['custom:preferred_language'] as 'he' | 'en') || 'he',
        role: (payload['custom:role'] as 'student' | 'instructor' | 'admin') || 'student',
        phoneVerified: (payload.phone_number_verified as boolean) || false,
        lastLoginAt: new Date(),
        groups: payload['cognito:groups'] || []
      };

      // Create minimal session object
      const session: UserSession = {
        userId: payload.sub,
        cognitoId: payload.sub,
        accessToken: token,
        idToken: token,
        refreshToken: '',
        tokenType: 'Bearer',
        expiresAt: new Date((payload.exp || 0) * 1000),
        refreshExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        scope: ['email', 'openid', 'profile'],
        createdAt: new Date((payload.iat || 0) * 1000),
        lastAccessedAt: new Date()
      };

      req.user = authenticatedUser;
      req.session = session;
    }

    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
};

/**
 * Admin authorization middleware
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const isAdmin = req.user.role === 'admin' || req.user.role === 'instructor';
  if (!isAdmin) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Admin privileges required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
};

/**
 * Validation middleware factory
 */
export const validateRequest = (schema: {
  body?: z.ZodSchema;
  params?: z.ZodSchema;
  query?: z.ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.errors,
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(error);
    }
  };
};

/**
 * Async error handler wrapper
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Pagination middleware
 */
export const paginate = (req: Request, _res: Response, next: NextFunction): void => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100 items
  const offset = (page - 1) * limit;

  req.query.pagination = {
    page,
    limit,
    offset,
  } as any;

  next();
};

/**
 * Response helpers
 */
export const responseHelpers = (_req: Request, res: Response, next: NextFunction): void => {
  // Success response helper
  res.success = (data: any, message?: string): Response => {
    return res.status(200).json({
      success: true,
      message: message || 'Request successful',
      data,
      timestamp: new Date().toISOString(),
    });
  };

  // Created response helper
  res.created = (data: any, message?: string): Response => {
    return res.status(201).json({
      success: true,
      message: message || 'Resource created successfully',
      data,
      timestamp: new Date().toISOString(),
    });
  };

  // Error response helper
  res.error = (statusCode: number, message: string, details?: any): Response => {
    return res.status(statusCode).json({
      success: false,
      error: message,
      details,
      timestamp: new Date().toISOString(),
    });
  };

  next();
};


/**
 * Rate limiting for sensitive endpoints
 */
export const strictRateLimit = (windowMs: number = 900000, max: number = 5) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

/**
 * Request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const userInfo = req.user ? `${req.user.email} (${req.user.sub})` : 'anonymous';

    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms - ${userInfo}`);
  });

  next();
};