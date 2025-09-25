/**
 * Authentication Routes
 * Handles OAuth flows and user authentication endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { CognitoService } from '../services/CognitoService';
import { JWTService } from '../services/JWTService';
import { authenticate, optionalAuthenticate, authCors, authLogger, authErrorHandler } from '../middleware/auth';
import {
  LoginRequest,
  TokenExchangeRequest,
  RefreshTokenRequest,
  LogoutRequest,
  AuthenticatedRequest,
  AuthErrorCode
} from '../types/auth';

const router = Router();
const cognitoService = new CognitoService();
const jwtService = new JWTService();

// Apply middleware to all auth routes
router.use(authCors);
router.use(authLogger);

/**
 * POST /auth/login
 * Initiate OAuth login flow - returns authorization URL
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const loginRequest: LoginRequest = {
      redirectUri: req.body.redirectUri,
      language: req.body.language || 'he',
      state: req.body.state
    };

    const result = await cognitoService.generateAuthorizationUrl(loginRequest);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error
      });
      return;
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error: any) {
    console.error('Login endpoint error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: AuthErrorCode.COGNITO_ERROR,
        message: 'Failed to initiate login',
        details: error.message
      }
    });
  }
});

/**
 * POST /auth/callback
 * Handle OAuth callback - exchange code for tokens
 */
router.post('/callback', async (req: Request, res: Response): Promise<void> => {
  try {
    const tokenRequest: TokenExchangeRequest = {
      code: req.body.code,
      state: req.body.state
    };

    if (!tokenRequest.code) {
      res.status(400).json({
        success: false,
        error: {
          code: AuthErrorCode.INVALID_TOKEN,
          message: 'Authorization code is required'
        }
      });
      return;
    }

    const result = await cognitoService.exchangeCodeForTokens(tokenRequest);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error
      });
      return;
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error: any) {
    console.error('Callback endpoint error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: AuthErrorCode.AUTHORIZATION_CODE_EXPIRED,
        message: 'Failed to process authentication callback',
        details: error.message
      }
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh access tokens using refresh token
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshRequest: RefreshTokenRequest = {
      refreshToken: req.body.refreshToken
    };

    if (!refreshRequest.refreshToken) {
      res.status(400).json({
        success: false,
        error: {
          code: AuthErrorCode.INVALID_TOKEN,
          message: 'Refresh token is required'
        }
      });
      return;
    }

    const result = await cognitoService.refreshTokens(refreshRequest);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error
      });
      return;
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error: any) {
    console.error('Refresh endpoint error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: AuthErrorCode.TOKEN_EXPIRED,
        message: 'Failed to refresh tokens',
        details: error.message
      }
    });
  }
});

/**
 * GET /auth/profile
 * Get current user profile (requires authentication)
 */
router.get('/profile', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // User information is already attached by the authenticate middleware
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: AuthErrorCode.USER_NOT_FOUND,
          message: 'User information not found'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error: any) {
    console.error('Profile endpoint error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: AuthErrorCode.COGNITO_ERROR,
        message: 'Failed to get user profile',
        details: error.message
      }
    });
  }
});

/**
 * PUT /auth/profile
 * Update user profile (requires authentication)
 */
router.put('/profile', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: AuthErrorCode.USER_NOT_FOUND,
          message: 'User not found'
        }
      });
      return;
    }

    // Extract allowed profile updates
    const allowedUpdates = {
      'custom:preferred_language': req.body.preferredLanguage,
      'custom:marketing_consent': req.body.marketingConsent?.toString(),
      given_name: req.body.firstName,
      family_name: req.body.lastName,
      phone_number: req.body.phone
    };

    // Filter out undefined values
    const updates = Object.fromEntries(
      Object.entries(allowedUpdates).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: AuthErrorCode.COGNITO_ERROR,
          message: 'No valid updates provided'
        }
      });
      return;
    }

    const result = await cognitoService.updateUserAttributes(user.cognitoId, updates);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error
      });
      return;
    }

    // Get updated user info
    const updatedUserResult = await cognitoService.getUserInfo(user.cognitoId);

    if (!updatedUserResult.success) {
      res.status(500).json({
        success: false,
        error: updatedUserResult.error
      });
      return;
    }

    // Convert Cognito user info to our user format
    const cognitoUser = updatedUserResult.data!;
    const updatedUser = {
      id: user.id,
      cognitoId: user.cognitoId,
      email: cognitoUser.email,
      firstName: cognitoUser.given_name,
      lastName: cognitoUser.family_name,
      phone: cognitoUser.phone_number,
      preferredLanguage: cognitoUser.preferred_language || 'he',
      role: cognitoUser.role || 'student',
      emailVerified: cognitoUser.email_verified,
      phoneVerified: cognitoUser.phone_number_verified || false,
      mfaEnabled: user.mfaEnabled,
      lastLoginAt: user.lastLoginAt
    };

    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error: any) {
    console.error('Profile update endpoint error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: AuthErrorCode.COGNITO_ERROR,
        message: 'Failed to update user profile',
        details: error.message
      }
    });
  }
});

/**
 * GET /auth/verify
 * Verify current token validity
 */
router.get('/verify', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    const session = req.session;

    if (!user || !session) {
      res.json({
        success: true,
        data: {
          valid: false,
          user: null
        }
      });
      return;
    }

    // Check if token is close to expiring
    const now = new Date();
    const expiresAt = session.expiresAt;
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    const refreshThreshold = 5 * 60 * 1000; // 5 minutes

    res.json({
      success: true,
      data: {
        valid: true,
        user: user,
        expiresAt: expiresAt,
        shouldRefresh: timeUntilExpiry < refreshThreshold
      }
    });
  } catch (error: any) {
    console.error('Verify endpoint error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: AuthErrorCode.COGNITO_ERROR,
        message: 'Failed to verify token',
        details: error.message
      }
    });
  }
});

/**
 * POST /auth/logout
 * Logout user and generate logout URL
 */
router.post('/logout', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const logoutRequest: LogoutRequest = {
      redirectUri: req.body.redirectUri
    };

    const result = await cognitoService.generateLogoutUrl(logoutRequest);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error
      });
      return;
    }

    // If user is authenticated, we could also call global sign out
    // but for now we'll just return the logout URL

    res.json({
      success: true,
      data: result.data
    });
  } catch (error: any) {
    console.error('Logout endpoint error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: AuthErrorCode.COGNITO_ERROR,
        message: 'Failed to logout',
        details: error.message
      }
    });
  }
});

/**
 * GET /auth/config
 * Get client-safe authentication configuration
 */
router.get('/config', async (req: Request, res: Response): Promise<void> => {
  try {
    const config = cognitoService.getConfig();

    // Return only client-safe configuration
    const clientConfig = {
      userPoolId: config.userPoolId,
      clientId: config.clientId,
      region: config.region,
      domain: config.domain,
      redirectUri: config.redirectUri,
      logoutUri: config.logoutUri
    };

    res.json({
      success: true,
      data: clientConfig
    });
  } catch (error: any) {
    console.error('Config endpoint error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: AuthErrorCode.COGNITO_ERROR,
        message: 'Failed to get configuration',
        details: error.message
      }
    });
  }
});

/**
 * GET /auth/health
 * Health check for authentication service
 */
router.get('/health', async (req: Request, res: Response): Promise<void> => {
  try {
    const cognitoConfigValid = cognitoService.validateConfig();
    const jwtConfigValid = jwtService.validateConfig();

    const health = {
      status: cognitoConfigValid && jwtConfigValid ? 'healthy' : 'unhealthy',
      services: {
        cognito: cognitoConfigValid ? 'ok' : 'error',
        jwt: jwtConfigValid ? 'ok' : 'error'
      },
      timestamp: new Date().toISOString()
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      success: health.status === 'healthy',
      data: health
    });
  } catch (error: any) {
    console.error('Health endpoint error:', error);
    res.status(503).json({
      success: false,
      error: {
        code: AuthErrorCode.COGNITO_ERROR,
        message: 'Health check failed',
        details: error.message
      }
    });
  }
});

// Apply error handler
router.use(authErrorHandler);

export default router;