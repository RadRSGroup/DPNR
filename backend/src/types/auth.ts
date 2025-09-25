/**
 * Authentication Types and Interfaces
 * AWS Cognito integration for DPNR platform
 */

export interface JWTClaims {
  sub: string;                   // Cognito User ID (cognitoId)
  email: string;                 // Verified email
  email_verified: boolean;       // Email verification status
  phone_number?: string;         // Phone number
  phone_number_verified?: boolean; // Phone verification
  'custom:preferred_language'?: string;
  'custom:role'?: string;
  'custom:marketing_consent'?: string;
  aud: string;                   // App Client ID
  iss: string;                   // Cognito issuer URL
  token_use: 'access' | 'id';    // Token type
  exp: number;                   // Expiration timestamp
  iat: number;                   // Issued at timestamp
}

export interface UserSession {
  userId: string;                // Internal user ID
  cognitoId: string;             // Cognito sub
  accessToken: string;           // Cognito access token
  idToken: string;               // Cognito ID token
  refreshToken: string;          // Cognito refresh token
  tokenType: 'Bearer';           // Token type
  expiresAt: Date;               // Access token expiration
  refreshExpiresAt: Date;        // Refresh token expiration
  scope: string[];               // Token scopes
  createdAt: Date;
  lastAccessedAt: Date;
}

export interface AuthenticationState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user?: AuthenticatedUser;
  session?: UserSession;
  error?: AuthError;

  // Language preference from session
  preferredLanguage: 'he' | 'en';

  // Redirect handling
  redirectUrl?: string;
  returnTo?: string;
}

export interface AuthError {
  code: string;                  // Error code from Cognito
  message: string;               // User-friendly message
  details?: any;                 // Technical details
  timestamp: Date;
}

export interface AuthenticatedUser {
  id: string;
  cognitoId: string;
  sub: string;                          // Cognito sub ID (alias for cognitoId)
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  preferredLanguage: 'he' | 'en';
  role: 'student' | 'admin' | 'instructor';
  emailVerified: boolean;
  phoneVerified: boolean;
  mfaEnabled: boolean;
  lastLoginAt?: Date;
  groups?: string[];                    // Cognito user groups
}

export interface LoginRequest {
  redirectUri: string;
  language?: 'he' | 'en';
  state?: string;
}

export interface LoginResponse {
  authorizationUrl: string;
  state: string;
}

export interface TokenExchangeRequest {
  code: string;
  state: string;
}

export interface TokenResponse {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  redirectUri?: string;
}

export interface LogoutResponse {
  message: string;
  logoutUrl: string;
}

export interface TokenVerificationResult {
  valid: boolean;
  exp?: number;
  sub?: string;
  claims?: JWTClaims;
}

// Middleware types
import { Request as ExpressRequest } from 'express';

export interface AuthenticatedRequest extends ExpressRequest {
  user?: AuthenticatedUser;
  session?: UserSession;
}

// Error codes
export enum AuthErrorCode {
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  ACCESS_DENIED = 'ACCESS_DENIED',
  COGNITO_ERROR = 'COGNITO_ERROR',
  MISSING_TOKEN = 'MISSING_TOKEN',
  INVALID_STATE = 'INVALID_STATE',
  AUTHORIZATION_CODE_EXPIRED = 'AUTHORIZATION_CODE_EXPIRED'
}

// Auth events for metrics
export interface AuthMetrics {
  id: string;
  event: 'login' | 'logout' | 'registration' | 'password_reset' | 'token_refresh';
  userId?: string;
  cognitoId?: string;
  ipAddress: string;
  userAgent: string;
  language: 'he' | 'en';
  success: boolean;
  errorCode?: string;
  duration?: number;            // Request duration in ms
  timestamp: Date;
}