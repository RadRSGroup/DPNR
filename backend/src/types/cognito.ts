/**
 * AWS Cognito Configuration Types
 * Configuration interfaces for Cognito User Pool integration
 */

export interface CognitoConfig {
  userPoolId: string;            // AWS User Pool ID
  clientId: string;              // App Client ID
  clientSecret?: string;         // App Client Secret (if configured)
  region: string;                // AWS Region (e.g., 'il-central-1')
  domain: string;                // Hosted UI domain
  redirectUri: string;           // OAuth redirect URI
  logoutUri: string;             // Post-logout redirect URI
}

export interface CognitoUserPool {
  userPoolId: string;            // AWS User Pool ID
  clientId: string;              // App Client ID
  region: string;                // AWS Region (e.g., 'il-central-1')
  domain: string;                // Hosted UI domain
  redirectUri: string;           // OAuth redirect URI
  logoutUri: string;             // Post-logout redirect URI

  // Custom attributes for DPNR
  customAttributes: {
    'custom:preferred_language': 'he' | 'en';
    'custom:role': 'student' | 'admin' | 'instructor';
    'custom:marketing_consent': boolean;
    'custom:terms_accepted_version': string;
  };
}

export interface CognitoUserAttributes {
  sub: string;                   // Unique user identifier
  email: string;                 // Email address
  email_verified: boolean;       // Email verification status
  phone_number?: string;         // Phone number
  phone_number_verified?: boolean; // Phone verification status
  given_name: string;            // First name
  family_name: string;           // Last name
  preferred_username?: string;   // Username
  'custom:preferred_language'?: 'he' | 'en';
  'custom:role'?: 'student' | 'admin' | 'instructor';
  'custom:marketing_consent'?: string;
  'custom:terms_accepted_version'?: string;
}

export interface CognitoTokens {
  AccessToken: string;
  IdToken: string;
  RefreshToken: string;
  TokenType: string;
  ExpiresIn: number;
}

export interface CognitoAuthorizationParams {
  client_id: string;
  response_type: 'code';
  scope: string;
  redirect_uri: string;
  state?: string;
  ui_locales?: 'he' | 'en';
}

export interface CognitoTokenExchangeParams {
  grant_type: 'authorization_code';
  client_id: string;
  client_secret?: string;
  code: string;
  redirect_uri: string;
}

export interface CognitoRefreshTokenParams {
  grant_type: 'refresh_token';
  client_id: string;
  client_secret?: string;
  refresh_token: string;
}

export interface CognitoLogoutParams {
  client_id: string;
  logout_uri: string;
}

// Error types from Cognito
export interface CognitoError {
  __type: string;
  message: string;
}

export enum CognitoErrorType {
  NotAuthorizedException = 'NotAuthorizedException',
  UserNotFoundException = 'UserNotFoundException',
  CodeExpiredException = 'ExpiredCodeException',
  InvalidParameterException = 'InvalidParameterException',
  TooManyRequestsException = 'TooManyRequestsException',
  UserNotConfirmedException = 'UserNotConfirmedException',
  InvalidPasswordException = 'InvalidPasswordException'
}

// Environment-based configuration
export interface CognitoEnvironmentConfig {
  development: CognitoConfig;
  production: CognitoConfig;
}

// Cognito service responses
export interface CognitoUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  given_name: string;
  family_name: string;
  phone_number?: string;
  phone_number_verified?: boolean;
  preferred_language?: 'he' | 'en';
  role?: 'student' | 'admin' | 'instructor';
  marketing_consent?: boolean;
}

export interface CognitoServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// JWT verification configuration
export interface JWTVerificationConfig {
  userPoolId: string;
  region: string;
  clientId: string;
  issuer: string;
  audience: string;
}

// Language-specific configurations
export interface LanguageConfig {
  he: {
    locale: 'he-IL';
    ui_locales: 'he';
    direction: 'rtl';
  };
  en: {
    locale: 'en-US';
    ui_locales: 'en';
    direction: 'ltr';
  };
}