/**
 * Authentication Middleware
 * Validates JWT tokens and attaches user information to requests
 */

import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../services/JWTService';
import { CognitoService } from '../services/CognitoService';
import {
  AuthenticatedRequest,
  AuthenticatedUser,
  UserSession,
  AuthErrorCode
} from '../types/auth';

const jwtService = new JWTService();
const cognitoService = new CognitoService();

/**
 * Authentication middleware - validates JWT tokens
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = jwtService.extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: AuthErrorCode.MISSING_TOKEN,
          message: 'Authorization token is required'
        }
      });
      return;
    }

    // Verify token
    const verificationResult = await jwtService.verifyToken(token);

    if (!verificationResult.success || !verificationResult.data?.valid) {
      res.status(401).json({
        success: false,
        error: verificationResult.error || {
          code: AuthErrorCode.INVALID_TOKEN,
          message: 'Invalid authorization token'
        }
      });
      return;
    }

    const claims = verificationResult.data.claims!;

    // Get user information from Cognito
    const userInfoResult = await cognitoService.getUserInfo(claims.sub);

    if (!userInfoResult.success || !userInfoResult.data) {
      res.status(401).json({
        success: false,
        error: userInfoResult.error || {
          code: AuthErrorCode.USER_NOT_FOUND,
          message: 'User not found'
        }
      });
      return;
    }

    const cognitoUser = userInfoResult.data;

    // Create authenticated user object
    const authenticatedUser: AuthenticatedUser = {
      id: claims.sub, // We'll map this to internal user ID when database is ready
      cognitoId: claims.sub,
      sub: claims.sub, // Add the required sub property
      email: cognitoUser.email,
      firstName: cognitoUser.given_name,
      lastName: cognitoUser.family_name,
      phone: cognitoUser.phone_number,
      preferredLanguage: cognitoUser.preferred_language || 'he',
      role: cognitoUser.role || 'student',
      emailVerified: cognitoUser.email_verified,
      phoneVerified: cognitoUser.phone_number_verified || false,
      mfaEnabled: false, // TODO: Get from Cognito when MFA is configured
      lastLoginAt: new Date() // TODO: Update in database when available
    };

    // Create session object
    const session: UserSession = {
      userId: claims.sub, // Will be mapped to internal user ID when database is ready
      cognitoId: claims.sub,
      accessToken: token,
      idToken: token, // In real implementation, we'd have separate ID token
      refreshToken: '', // TODO: Store refresh token securely
      tokenType: 'Bearer',
      expiresAt: new Date(claims.exp * 1000),
      refreshExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      scope: ['email', 'openid', 'profile'],
      createdAt: new Date(claims.iat * 1000),
      lastAccessedAt: new Date()
    };

    // Attach user and session to request
    req.user = authenticatedUser;
    req.session = session;

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: AuthErrorCode.COGNITO_ERROR,
        message: 'Internal authentication error'
      }
    });
  }
};

/**
 * Optional authentication middleware - allows both authenticated and anonymous access
 */
export const optionalAuthenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = jwtService.extractTokenFromHeader(authHeader);

    // If no token, continue without authentication
    if (!token) {
      next();
      return;
    }

    // Try to authenticate, but don't fail if invalid
    const verificationResult = await jwtService.verifyToken(token);

    if (verificationResult.success && verificationResult.data?.valid) {
      const claims = verificationResult.data.claims!;
      const userInfoResult = await cognitoService.getUserInfo(claims.sub);

      if (userInfoResult.success && userInfoResult.data) {
        const cognitoUser = userInfoResult.data;

        req.user = {
          id: claims.sub,
          cognitoId: claims.sub,
          sub: claims.sub, // Add the required sub property
          email: cognitoUser.email,
          firstName: cognitoUser.given_name,
          lastName: cognitoUser.family_name,
          phone: cognitoUser.phone_number,
          preferredLanguage: cognitoUser.preferred_language || 'he',
          role: cognitoUser.role || 'student',
          emailVerified: cognitoUser.email_verified,
          phoneVerified: cognitoUser.phone_number_verified || false,
          mfaEnabled: false,
          lastLoginAt: new Date()
        };
      }
    }

    next();
  } catch (error) {
    // Log error but don't fail the request
    console.error('Optional authentication error:', error);
    next();
  }
};

/**
 * Role-based authorization middleware
 */
export const authorize = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: AuthErrorCode.ACCESS_DENIED,
          message: 'Authentication required'
        }
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: AuthErrorCode.ACCESS_DENIED,
          message: 'Insufficient permissions'
        }
      });
      return;
    }

    next();
  };
};

/**
 * Admin-only authorization middleware
 */
export const requireAdmin = authorize(['admin']);

/**
 * Instructor or admin authorization middleware
 */
export const requireInstructorOrAdmin = authorize(['instructor', 'admin']);

/**
 * Token refresh middleware - checks if token needs refresh
 */
export const checkTokenExpiry = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.session) {
      next();
      return;
    }

    const now = new Date();
    const tokenExpiresAt = req.session.expiresAt;
    const refreshThreshold = 5 * 60 * 1000; // 5 minutes

    // Check if token expires within 5 minutes
    if (tokenExpiresAt.getTime() - now.getTime() < refreshThreshold) {
      // Add header to suggest token refresh
      res.setHeader('X-Token-Refresh-Suggested', 'true');
    }

    next();
  } catch (error) {
    console.error('Token expiry check error:', error);
    next();
  }
};

/**
 * CORS middleware for authentication endpoints
 */
export const authCors = (req: Request, res: Response, next: NextFunction): void => {
  const allowedOrigins = [
    'http://localhost:3000',
    'https://frontend-sigma-topaz-44.vercel.app',
    process.env.CORS_ORIGIN
  ].filter(Boolean);

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
};

/**
 * Request logging middleware for authentication
 */
export const authLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      timestamp: new Date().toISOString()
    };

    console.log('Auth Request:', JSON.stringify(logData));
  });

  next();
};

/**
 * Error handling middleware for authentication
 */
export const authErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Authentication error:', error);

  // JWT specific errors
  if (error.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: {
        code: AuthErrorCode.TOKEN_EXPIRED,
        message: 'Token has expired'
      }
    });
    return;
  }

  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: {
        code: AuthErrorCode.INVALID_TOKEN,
        message: 'Invalid token'
      }
    });
    return;
  }

  // Cognito specific errors
  if (error.name === 'NotAuthorizedException') {
    res.status(401).json({
      success: false,
      error: {
        code: AuthErrorCode.ACCESS_DENIED,
        message: 'Access denied'
      }
    });
    return;
  }

  // Generic error
  res.status(500).json({
    success: false,
    error: {
      code: AuthErrorCode.COGNITO_ERROR,
      message: 'Internal server error'
    }
  });
};