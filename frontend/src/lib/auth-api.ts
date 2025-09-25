/**
 * Authentication API Service
 * Client-side service for authentication API calls
 */

import {
  LoginRequest,
  LoginResponse,
  TokenExchangeRequest,
  TokenResponse,
  RefreshTokenRequest,
  LogoutRequest,
  LogoutResponse,
  User,
  ApiResponse,
  AuthErrorCode
} from '@/types/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003/v1';

class AuthApiService {
  private async fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit = {},
    includeAuth = true
  ): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
      };

      // Add authorization header if available and requested
      if (includeAuth) {
        const accessToken = this.getStoredAccessToken();
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.error?.code || AuthErrorCode.NETWORK_ERROR,
            message: data.error?.message || `HTTP ${response.status}: ${response.statusText}`,
            details: data.error?.details
          }
        };
      }

      return {
        success: true,
        data: data.data || data
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: AuthErrorCode.NETWORK_ERROR,
          message: error.message || 'Network request failed',
          details: error
        }
      };
    }
  }

  /**
   * Initiate login flow - get authorization URL
   */
  async login(request: LoginRequest = {}): Promise<ApiResponse<LoginResponse>> {
    return this.fetchWithAuth<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        redirectUri: request.redirectUri || `${window.location.origin}/auth/callback`,
        language: request.language || 'he',
        state: request.state
      })
    }, false);
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(request: TokenExchangeRequest): Promise<ApiResponse<TokenResponse>> {
    return this.fetchWithAuth<TokenResponse>('/auth/callback', {
      method: 'POST',
      body: JSON.stringify(request)
    }, false);
  }

  /**
   * Refresh access tokens
   */
  async refreshTokens(request: RefreshTokenRequest): Promise<ApiResponse<TokenResponse>> {
    return this.fetchWithAuth<TokenResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(request)
    }, false);
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<ApiResponse<User>> {
    return this.fetchWithAuth<User>('/auth/profile', {
      method: 'GET'
    });
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<User>): Promise<ApiResponse<User>> {
    return this.fetchWithAuth<User>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  /**
   * Logout user
   */
  async logout(request: LogoutRequest = {}): Promise<ApiResponse<LogoutResponse>> {
    return this.fetchWithAuth<LogoutResponse>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({
        redirectUri: request.redirectUri || window.location.origin
      })
    });
  }

  /**
   * Verify current token is valid
   */
  async verifyToken(): Promise<ApiResponse<{ valid: boolean; user?: User }>> {
    return this.fetchWithAuth<{ valid: boolean; user?: User }>('/auth/verify', {
      method: 'GET'
    });
  }

  /**
   * Get stored access token from localStorage
   */
  private getStoredAccessToken(): string | null {
    if (typeof window === 'undefined') return null;

    try {
      return localStorage.getItem('dpnr_access_token');
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      return null;
    }
  }

  /**
   * Store tokens in localStorage
   */
  storeTokens(tokens: TokenResponse): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('dpnr_access_token', tokens.accessToken);
      localStorage.setItem('dpnr_id_token', tokens.idToken);
      localStorage.setItem('dpnr_refresh_token', tokens.refreshToken);

      const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
      localStorage.setItem('dpnr_token_expires_at', expiresAt.toISOString());
    } catch (error) {
      console.error('Error storing tokens:', error);
    }
  }

  /**
   * Store user data in localStorage
   */
  storeUser(user: User): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('dpnr_user_data', JSON.stringify(user));
      localStorage.setItem('dpnr_preferred_language', user.preferredLanguage);
    } catch (error) {
      console.error('Error storing user data:', error);
    }
  }

  /**
   * Get stored user data from localStorage
   */
  getStoredUser(): User | null {
    if (typeof window === 'undefined') return null;

    try {
      const userData = localStorage.getItem('dpnr_user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error retrieving user data:', error);
      return null;
    }
  }

  /**
   * Get stored tokens from localStorage
   */
  getStoredTokens(): {
    accessToken: string | null;
    idToken: string | null;
    refreshToken: string | null;
    expiresAt: Date | null;
  } {
    if (typeof window === 'undefined') {
      return {
        accessToken: null,
        idToken: null,
        refreshToken: null,
        expiresAt: null
      };
    }

    try {
      const accessToken = localStorage.getItem('dpnr_access_token');
      const idToken = localStorage.getItem('dpnr_id_token');
      const refreshToken = localStorage.getItem('dpnr_refresh_token');
      const expiresAtStr = localStorage.getItem('dpnr_token_expires_at');

      const expiresAt = expiresAtStr ? new Date(expiresAtStr) : null;

      return {
        accessToken,
        idToken,
        refreshToken,
        expiresAt
      };
    } catch (error) {
      console.error('Error retrieving tokens:', error);
      return {
        accessToken: null,
        idToken: null,
        refreshToken: null,
        expiresAt: null
      };
    }
  }

  /**
   * Check if stored token is expired
   */
  isTokenExpired(): boolean {
    const { expiresAt } = this.getStoredTokens();
    if (!expiresAt) return true;

    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

    return expiresAt.getTime() - now.getTime() < bufferTime;
  }

  /**
   * Clear all stored authentication data
   */
  clearStoredAuth(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem('dpnr_access_token');
      localStorage.removeItem('dpnr_id_token');
      localStorage.removeItem('dpnr_refresh_token');
      localStorage.removeItem('dpnr_token_expires_at');
      localStorage.removeItem('dpnr_user_data');
      localStorage.removeItem('dpnr_return_to');
    } catch (error) {
      console.error('Error clearing stored auth data:', error);
    }
  }

  /**
   * Store return URL for post-login redirect
   */
  storeReturnTo(url: string): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('dpnr_return_to', url);
    } catch (error) {
      console.error('Error storing return URL:', error);
    }
  }

  /**
   * Get and clear stored return URL
   */
  getAndClearReturnTo(): string | null {
    if (typeof window === 'undefined') return null;

    try {
      const returnTo = localStorage.getItem('dpnr_return_to');
      if (returnTo) {
        localStorage.removeItem('dpnr_return_to');
      }
      return returnTo;
    } catch (error) {
      console.error('Error retrieving return URL:', error);
      return null;
    }
  }
}

export const authApi = new AuthApiService();