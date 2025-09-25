/**
 * Frontend Authentication Types
 * Client-side types for authentication state management
 */

export interface User {
  id: string;
  cognitoId: string;
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
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  expiresAt: Date;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  tokens: AuthTokens | null;
  error: string | null;

  // Language preference
  preferredLanguage: 'he' | 'en';

  // Redirect handling
  redirectUrl?: string;
  returnTo?: string;
}

export interface LoginRequest {
  redirectUri?: string;
  language?: 'he' | 'en';
  state?: string;
}

export interface LoginResponse {
  authorizationUrl: string;
  state: string;
}

export interface TokenExchangeRequest {
  code: string;
  state?: string;
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

export interface AuthError {
  code: string;
  message: string;
  details?: any;
}

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: AuthError;
}

// Auth context methods
export interface AuthContextType extends AuthState {
  // Actions
  login: (request?: LoginRequest) => Promise<void>;
  logout: (request?: LogoutRequest) => Promise<void>;
  handleCallback: (code: string, state?: string) => Promise<void>;
  refreshTokens: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;

  // Utilities
  isTokenExpired: () => boolean;
  getTokenExpiration: () => Date | null;
  clearError: () => void;
  setLanguage: (language: 'he' | 'en') => void;
}

// Storage keys
export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: 'dpnr_access_token',
  ID_TOKEN: 'dpnr_id_token',
  REFRESH_TOKEN: 'dpnr_refresh_token',
  TOKEN_EXPIRES_AT: 'dpnr_token_expires_at',
  USER_DATA: 'dpnr_user_data',
  PREFERRED_LANGUAGE: 'dpnr_preferred_language',
  RETURN_TO: 'dpnr_return_to'
} as const;

// Error codes
export enum AuthErrorCode {
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  ACCESS_DENIED = 'ACCESS_DENIED',
  COGNITO_ERROR = 'COGNITO_ERROR',
  MISSING_TOKEN = 'MISSING_TOKEN',
  INVALID_STATE = 'INVALID_STATE',
  AUTHORIZATION_CODE_EXPIRED = 'AUTHORIZATION_CODE_EXPIRED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR'
}

// Route protection types
export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

// OAuth state management
export interface OAuthState {
  state: string;
  redirectUri: string;
  language: 'he' | 'en';
  returnTo?: string;
  timestamp: number;
}

// Auth event types for analytics
export interface AuthEvent {
  type: 'login' | 'logout' | 'token_refresh' | 'profile_update' | 'error';
  timestamp: Date;
  userId?: string;
  error?: string;
  metadata?: Record<string, any>;
}