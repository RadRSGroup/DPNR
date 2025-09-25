/**
 * JWT Service
 * Handles JWT token validation and claims extraction for AWS Cognito tokens
 */

import { verify, decode, JwtPayload } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import {
  JWTClaims,
  TokenVerificationResult,
  AuthErrorCode
} from '../types/auth';
import {
  CognitoServiceResponse,
  JWTVerificationConfig
} from '../types/cognito';

export class JWTService {
  private config: JWTVerificationConfig;
  private jwksClient: jwksClient.JwksClient;

  constructor() {
    this.config = {
      userPoolId: process.env.AWS_COGNITO_USER_POOL_ID!,
      region: process.env.AWS_REGION!,
      clientId: process.env.AWS_COGNITO_CLIENT_ID!,
      issuer: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_COGNITO_USER_POOL_ID}`,
      audience: process.env.AWS_COGNITO_CLIENT_ID!
    };

    // Initialize JWKS client for fetching public keys
    this.jwksClient = jwksClient({
      jwksUri: `${this.config.issuer}/.well-known/jwks.json`,
      cache: true,
      cacheMaxEntries: 10,
      cacheMaxAge: 600000, // 10 minutes
      rateLimit: true,
      jwksRequestsPerMinute: 10
    });
  }

  /**
   * Verify and decode JWT token
   */
  async verifyToken(token: string): Promise<CognitoServiceResponse<TokenVerificationResult>> {
    try {
      // Decode token header to get key ID
      const decodedHeader = decode(token, { complete: true });
      if (!decodedHeader || typeof decodedHeader === 'string' || !decodedHeader.header.kid) {
        return {
          success: false,
          error: {
            code: AuthErrorCode.INVALID_TOKEN,
            message: 'Invalid token format or missing key ID',
            details: null
          }
        };
      }

      // Get signing key from JWKS
      const signingKey = await this.getSigningKey(decodedHeader.header.kid);

      // Verify token
      const payload = verify(token, signingKey, {
        issuer: this.config.issuer,
        audience: this.config.audience,
        algorithms: ['RS256']
      }) as JwtPayload;

      // Validate required claims
      const claims = this.extractClaims(payload);
      if (!this.validateClaims(claims)) {
        return {
          success: false,
          error: {
            code: AuthErrorCode.INVALID_TOKEN,
            message: 'Token missing required claims',
            details: claims
          }
        };
      }

      return {
        success: true,
        data: {
          valid: true,
          exp: claims.exp,
          sub: claims.sub,
          claims
        }
      };
    } catch (error: any) {
      // Handle specific JWT errors
      if (error.name === 'TokenExpiredError') {
        return {
          success: false,
          error: {
            code: AuthErrorCode.TOKEN_EXPIRED,
            message: 'Token has expired',
            details: error
          }
        };
      }

      if (error.name === 'JsonWebTokenError') {
        return {
          success: false,
          error: {
            code: AuthErrorCode.INVALID_TOKEN,
            message: 'Invalid token signature or format',
            details: error
          }
        };
      }

      return {
        success: false,
        error: {
          code: AuthErrorCode.INVALID_TOKEN,
          message: 'Token verification failed',
          details: error
        }
      };
    }
  }

  /**
   * Extract access token from Authorization header
   */
  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): JWTClaims | null {
    try {
      const decoded = decode(token) as JwtPayload;
      return this.extractClaims(decoded);
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    try {
      const decoded = decode(token) as JwtPayload;
      if (!decoded || !decoded.exp) {
        return true;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(token: string): Date | null {
    try {
      const decoded = decode(token) as JwtPayload;
      if (!decoded || !decoded.exp) {
        return null;
      }

      return new Date(decoded.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate token format without verification
   */
  validateTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    const parts = token.split('.');
    return parts.length === 3;
  }

  /**
   * Get signing key from JWKS
   */
  private async getSigningKey(kid: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.jwksClient.getSigningKey(kid, (err, key) => {
        if (err) {
          reject(err);
          return;
        }

        const signingKey = key?.getPublicKey();
        if (!signingKey) {
          reject(new Error('Unable to get signing key'));
          return;
        }

        resolve(signingKey);
      });
    });
  }

  /**
   * Extract claims from JWT payload
   */
  private extractClaims(payload: JwtPayload): JWTClaims {
    return {
      sub: payload.sub || '',
      email: payload.email || '',
      email_verified: payload.email_verified === true,
      phone_number: payload.phone_number,
      phone_number_verified: payload.phone_number_verified === true,
      'custom:preferred_language': payload['custom:preferred_language'],
      'custom:role': payload['custom:role'],
      'custom:marketing_consent': payload['custom:marketing_consent'],
      aud: (typeof payload.aud === 'string' ? payload.aud : payload.aud?.[0]) || '',
      iss: payload.iss || '',
      token_use: payload.token_use || 'access',
      exp: payload.exp || 0,
      iat: payload.iat || 0
    };
  }

  /**
   * Validate required claims are present
   */
  private validateClaims(claims: JWTClaims): boolean {
    const required = ['sub', 'email', 'aud', 'iss', 'exp', 'iat'];
    return required.every(claim => {
      const value = claims[claim as keyof JWTClaims];
      return value !== undefined && value !== null && value !== '';
    });
  }

  /**
   * Get JWT configuration
   */
  getConfig(): JWTVerificationConfig {
    return { ...this.config };
  }

  /**
   * Validate JWT configuration
   */
  validateConfig(): boolean {
    const required = ['userPoolId', 'region', 'clientId', 'issuer', 'audience'];
    return required.every(key =>
      this.config[key as keyof JWTVerificationConfig] &&
      this.config[key as keyof JWTVerificationConfig].length > 0
    );
  }
}