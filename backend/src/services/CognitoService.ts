/**
 * AWS Cognito Service
 * Handles User Pool operations and OAuth flows
 */

import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminDeleteUserCommand,
  ListUsersCommand,
  AdminSetUserPasswordCommand,
  AdminCreateUserCommand,
  GlobalSignOutCommand,
  AdminInitiateAuthCommand,
  RespondToAuthChallengeCommand
} from '@aws-sdk/client-cognito-identity-provider';
import {
  CognitoConfig,
  CognitoUserInfo,
  CognitoServiceResponse,
  CognitoTokens,
  CognitoUserAttributes,
  LanguageConfig
} from '../types/cognito';
import {
  LoginRequest,
  LoginResponse,
  TokenExchangeRequest,
  TokenResponse,
  RefreshTokenRequest,
  LogoutRequest,
  LogoutResponse,
  AuthErrorCode
} from '../types/auth';

export class CognitoService {
  private client: CognitoIdentityProviderClient;
  private config: CognitoConfig;
  private languageConfig: LanguageConfig;

  constructor() {
    this.config = {
      userPoolId: process.env.AWS_COGNITO_USER_POOL_ID!,
      clientId: process.env.AWS_COGNITO_CLIENT_ID!,
      clientSecret: process.env.AWS_COGNITO_CLIENT_SECRET,
      region: process.env.AWS_REGION!,
      domain: process.env.AWS_COGNITO_DOMAIN!,
      redirectUri: process.env.NODE_ENV === 'production'
        ? 'https://frontend-sigma-topaz-44.vercel.app/auth/callback'
        : 'http://localhost:3000/auth/callback',
      logoutUri: process.env.NODE_ENV === 'production'
        ? 'https://frontend-sigma-topaz-44.vercel.app/'
        : 'http://localhost:3000/'
    };

    this.client = new CognitoIdentityProviderClient({
      region: this.config.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });

    this.languageConfig = {
      he: {
        locale: 'he-IL',
        ui_locales: 'he',
        direction: 'rtl'
      },
      en: {
        locale: 'en-US',
        ui_locales: 'en',
        direction: 'ltr'
      }
    };
  }

  /**
   * Generate OAuth authorization URL for login
   */
  async generateAuthorizationUrl(request: LoginRequest): Promise<CognitoServiceResponse<LoginResponse>> {
    try {
      const state = request.state || this.generateState();
      const language = request.language || 'he';

      const params = new URLSearchParams({
        client_id: this.config.clientId,
        response_type: 'code',
        scope: 'email openid profile',
        redirect_uri: request.redirectUri || this.config.redirectUri,
        state: state,
        ui_locales: this.languageConfig[language].ui_locales
      });

      const authorizationUrl = `https://${this.config.domain}/oauth2/authorize?${params.toString()}`;

      return {
        success: true,
        data: {
          authorizationUrl,
          state
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: AuthErrorCode.COGNITO_ERROR,
          message: 'Failed to generate authorization URL',
          details: error
        }
      };
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(request: TokenExchangeRequest): Promise<CognitoServiceResponse<TokenResponse>> {
    try {
      const tokenEndpoint = `https://${this.config.domain}/oauth2/token`;

      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        code: request.code,
        redirect_uri: this.config.redirectUri
      });

      // Add client secret if configured
      if (this.config.clientSecret) {
        body.append('client_secret', this.config.clientSecret);
      }

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });

      if (!response.ok) {
        const errorData = await response.json() as any;
        throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error}`);
      }

      const tokens = await response.json() as any;

      return {
        success: true,
        data: {
          accessToken: tokens.access_token as string,
          idToken: tokens.id_token as string,
          refreshToken: tokens.refresh_token as string,
          tokenType: (tokens.token_type || 'Bearer') as 'Bearer',
          expiresIn: tokens.expires_in as number
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: AuthErrorCode.AUTHORIZATION_CODE_EXPIRED,
          message: 'Failed to exchange authorization code for tokens',
          details: error
        }
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(request: RefreshTokenRequest): Promise<CognitoServiceResponse<TokenResponse>> {
    try {
      const tokenEndpoint = `https://${this.config.domain}/oauth2/token`;

      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        refresh_token: request.refreshToken
      });

      if (this.config.clientSecret) {
        body.append('client_secret', this.config.clientSecret);
      }

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });

      if (!response.ok) {
        const errorData = await response.json() as any;
        throw new Error(`Token refresh failed: ${errorData.error_description || errorData.error}`);
      }

      const tokens = await response.json() as any;

      return {
        success: true,
        data: {
          accessToken: tokens.access_token as string,
          idToken: tokens.id_token as string,
          refreshToken: (tokens.refresh_token || request.refreshToken) as string, // Keep original if not returned
          tokenType: (tokens.token_type || 'Bearer') as 'Bearer',
          expiresIn: tokens.expires_in as number
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: AuthErrorCode.TOKEN_EXPIRED,
          message: 'Failed to refresh tokens',
          details: error
        }
      };
    }
  }

  /**
   * Get user information from Cognito
   */
  async getUserInfo(cognitoId: string): Promise<CognitoServiceResponse<CognitoUserInfo>> {
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: this.config.userPoolId,
        Username: cognitoId
      });

      const response = await this.client.send(command);

      if (!response.UserAttributes) {
        throw new Error('User attributes not found');
      }

      const attributes = this.parseUserAttributes(response.UserAttributes);

      const userInfo: CognitoUserInfo = {
        sub: cognitoId,
        email: attributes.email,
        email_verified: attributes.email_verified === 'true',
        given_name: attributes.given_name,
        family_name: attributes.family_name,
        phone_number: attributes.phone_number,
        phone_number_verified: attributes.phone_number_verified === 'true',
        preferred_language: attributes['custom:preferred_language'] as 'he' | 'en' || 'he',
        role: attributes['custom:role'] as 'student' | 'admin' | 'instructor' || 'student',
        marketing_consent: attributes['custom:marketing_consent'] === 'true'
      };

      return {
        success: true,
        data: userInfo
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: AuthErrorCode.USER_NOT_FOUND,
          message: 'Failed to get user information',
          details: error
        }
      };
    }
  }

  /**
   * Update user attributes in Cognito
   */
  async updateUserAttributes(
    cognitoId: string,
    attributes: Partial<CognitoUserAttributes>
  ): Promise<CognitoServiceResponse<void>> {
    try {
      const userAttributes = Object.entries(attributes).map(([key, value]) => ({
        Name: key,
        Value: String(value)
      }));

      const command = new AdminUpdateUserAttributesCommand({
        UserPoolId: this.config.userPoolId,
        Username: cognitoId,
        UserAttributes: userAttributes
      });

      await this.client.send(command);

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: AuthErrorCode.COGNITO_ERROR,
          message: 'Failed to update user attributes',
          details: error
        }
      };
    }
  }

  /**
   * Generate logout URL
   */
  async generateLogoutUrl(request: LogoutRequest): Promise<CognitoServiceResponse<LogoutResponse>> {
    try {
      const logoutUri = request.redirectUri || this.config.logoutUri;

      const params = new URLSearchParams({
        client_id: this.config.clientId,
        logout_uri: logoutUri
      });

      const logoutUrl = `https://${this.config.domain}/logout?${params.toString()}`;

      return {
        success: true,
        data: {
          message: 'Successfully logged out',
          logoutUrl
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: AuthErrorCode.COGNITO_ERROR,
          message: 'Failed to generate logout URL',
          details: error
        }
      };
    }
  }

  /**
   * Global sign out (invalidate all user sessions)
   */
  async globalSignOut(cognitoId: string): Promise<CognitoServiceResponse<void>> {
    try {
      const command = new GlobalSignOutCommand({
        AccessToken: cognitoId // This should be the access token, not user ID
      });

      await this.client.send(command);

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: AuthErrorCode.COGNITO_ERROR,
          message: 'Failed to sign out globally',
          details: error
        }
      };
    }
  }

  /**
   * Helper: Parse Cognito user attributes array into object
   */
  private parseUserAttributes(attributes: any[]): Record<string, string> {
    return attributes.reduce((acc, attr) => {
      acc[attr.Name] = attr.Value;
      return acc;
    }, {} as Record<string, string>);
  }

  /**
   * Helper: Generate secure state parameter
   */
  private generateState(): string {
    return Buffer.from(Math.random().toString(36).substring(2, 15) +
                      Math.random().toString(36).substring(2, 15)).toString('base64');
  }

  /**
   * Get Cognito configuration
   */
  getConfig(): CognitoConfig {
    return { ...this.config };
  }

  /**
   * Validate configuration
   */
  validateConfig(): boolean {
    const required = [
      'userPoolId',
      'clientId',
      'region',
      'domain',
      'redirectUri',
      'logoutUri'
    ];

    return required.every(key => {
      const value = this.config[key as keyof CognitoConfig];
      return value && value.length > 0;
    });
  }
}