'use client';

/**
 * Authentication Context
 * Provides authentication state and methods throughout the application
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  AuthState,
  AuthContextType,
  User,
  AuthTokens,
  LoginRequest,
  LogoutRequest,
  AuthErrorCode
} from '@/types/auth';
import { authApi } from '@/lib/auth-api';

// Initial state
const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  tokens: null,
  error: null,
  preferredLanguage: 'he',
  redirectUrl: undefined,
  returnTo: undefined
};

// Action types
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_AUTHENTICATED'; payload: { user: User; tokens: AuthTokens } }
  | { type: 'SET_UNAUTHENTICATED' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'SET_LANGUAGE'; payload: 'he' | 'en' }
  | { type: 'SET_REDIRECT_URL'; payload: string | undefined }
  | { type: 'SET_RETURN_TO'; payload: string | undefined };

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_AUTHENTICATED':
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        user: action.payload.user,
        tokens: action.payload.tokens,
        error: null,
        preferredLanguage: action.payload.user.preferredLanguage
      };

    case 'SET_UNAUTHENTICATED':
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        tokens: null,
        error: null
      };

    case 'SET_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload
      };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null
      };

    case 'SET_LANGUAGE':
      return {
        ...state,
        preferredLanguage: action.payload,
        user: state.user ? { ...state.user, preferredLanguage: action.payload } : null
      };

    case 'SET_REDIRECT_URL':
      return { ...state, redirectUrl: action.payload };

    case 'SET_RETURN_TO':
      return { ...state, returnTo: action.payload };

    default:
      return state;
  }
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const router = useRouter();

  // Initialize authentication state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  // Set up token refresh interval
  useEffect(() => {
    if (state.isAuthenticated && state.tokens) {
      const refreshInterval = setInterval(() => {
        if (authApi.isTokenExpired()) {
          refreshTokens();
        }
      }, 5 * 60 * 1000); // Check every 5 minutes

      return () => clearInterval(refreshInterval);
    }
  }, [state.isAuthenticated, state.tokens]);

  const initializeAuth = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Check for stored authentication data
      const storedUser = authApi.getStoredUser();
      const storedTokens = authApi.getStoredTokens();

      if (storedUser && storedTokens.accessToken && !authApi.isTokenExpired()) {
        // Verify token with backend
        const verifyResult = await authApi.verifyToken();

        if (verifyResult.success && verifyResult.data?.valid) {
          const tokens: AuthTokens = {
            accessToken: storedTokens.accessToken,
            idToken: storedTokens.idToken || '',
            refreshToken: storedTokens.refreshToken || '',
            tokenType: 'Bearer',
            expiresIn: storedTokens.expiresAt ?
              Math.floor((storedTokens.expiresAt.getTime() - Date.now()) / 1000) : 3600,
            expiresAt: storedTokens.expiresAt || new Date()
          };

          dispatch({
            type: 'SET_AUTHENTICATED',
            payload: {
              user: verifyResult.data.user || storedUser,
              tokens
            }
          });

          // Update stored user data if backend returned updated info
          if (verifyResult.data.user) {
            authApi.storeUser(verifyResult.data.user);
          }
        } else {
          // Token invalid, clear stored data
          authApi.clearStoredAuth();
          dispatch({ type: 'SET_UNAUTHENTICATED' });
        }
      } else {
        // No valid stored authentication
        dispatch({ type: 'SET_UNAUTHENTICATED' });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      authApi.clearStoredAuth();
      dispatch({ type: 'SET_UNAUTHENTICATED' });
    }
  };

  const login = useCallback(async (request: LoginRequest = {}) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      // Store current URL for post-login redirect
      const currentUrl = window.location.pathname + window.location.search;
      if (currentUrl !== '/auth/callback' && currentUrl !== '/auth/login') {
        authApi.storeReturnTo(currentUrl);
      }

      const result = await authApi.login(request);

      if (result.success && result.data) {
        // Redirect to Cognito hosted UI
        window.location.href = result.data.authorizationUrl;
      } else {
        dispatch({
          type: 'SET_ERROR',
          payload: result.error?.message || 'Failed to initiate login'
        });
      }
    } catch (error: any) {
      dispatch({
        type: 'SET_ERROR',
        payload: error.message || 'Login failed'
      });
    }
  }, []);

  const handleCallback = useCallback(async (code: string, state?: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      // Exchange authorization code for tokens
      const tokenResult = await authApi.exchangeCodeForTokens({ code, state });

      if (!tokenResult.success || !tokenResult.data) {
        throw new Error(tokenResult.error?.message || 'Token exchange failed');
      }

      // Store tokens
      authApi.storeTokens(tokenResult.data);

      // Get user profile
      const profileResult = await authApi.getProfile();

      if (!profileResult.success || !profileResult.data) {
        throw new Error(profileResult.error?.message || 'Failed to get user profile');
      }

      // Store user data
      authApi.storeUser(profileResult.data);

      const tokens: AuthTokens = {
        ...tokenResult.data,
        expiresAt: new Date(Date.now() + tokenResult.data.expiresIn * 1000)
      };

      dispatch({
        type: 'SET_AUTHENTICATED',
        payload: {
          user: profileResult.data,
          tokens
        }
      });

      // Redirect to stored return URL or home
      const returnTo = authApi.getAndClearReturnTo();
      router.replace(returnTo || '/');

    } catch (error: any) {
      dispatch({
        type: 'SET_ERROR',
        payload: error.message || 'Authentication callback failed'
      });
      router.replace('/');
    }
  }, [router]);

  const refreshTokens = useCallback(async () => {
    try {
      const { refreshToken } = authApi.getStoredTokens();

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const result = await authApi.refreshTokens({ refreshToken });

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Token refresh failed');
      }

      // Store new tokens
      authApi.storeTokens(result.data);

      // Update state with new tokens
      const tokens: AuthTokens = {
        ...result.data,
        expiresAt: new Date(Date.now() + result.data.expiresIn * 1000)
      };

      dispatch({
        type: 'SET_AUTHENTICATED',
        payload: {
          user: state.user!,
          tokens
        }
      });

    } catch (error: any) {
      console.error('Token refresh failed:', error);
      // If refresh fails, logout user
      logout();
    }
  }, [state.user]);

  const logout = useCallback(async (request: LogoutRequest = {}) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Call logout API
      const result = await authApi.logout(request);

      // Clear stored data regardless of API result
      authApi.clearStoredAuth();
      dispatch({ type: 'SET_UNAUTHENTICATED' });

      // Redirect to Cognito logout URL if provided
      if (result.success && result.data?.logoutUrl) {
        window.location.href = result.data.logoutUrl;
      } else {
        router.replace('/');
      }
    } catch (error: any) {
      console.error('Logout error:', error);
      // Even if logout API fails, clear local state
      authApi.clearStoredAuth();
      dispatch({ type: 'SET_UNAUTHENTICATED' });
      router.replace('/');
    }
  }, [router]);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    try {
      const result = await authApi.updateProfile(updates);

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Profile update failed');
      }

      // Update stored user data
      authApi.storeUser(result.data);

      // Update state
      dispatch({ type: 'UPDATE_USER', payload: updates });

    } catch (error: any) {
      dispatch({
        type: 'SET_ERROR',
        payload: error.message || 'Failed to update profile'
      });
    }
  }, []);

  const isTokenExpired = useCallback(() => {
    return authApi.isTokenExpired();
  }, []);

  const getTokenExpiration = useCallback(() => {
    const { expiresAt } = authApi.getStoredTokens();
    return expiresAt;
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const setLanguage = useCallback((language: 'he' | 'en') => {
    dispatch({ type: 'SET_LANGUAGE', payload: language });
    if (typeof window !== 'undefined') {
      localStorage.setItem('dpnr_preferred_language', language);
    }
  }, []);

  const contextValue: AuthContextType = {
    ...state,
    login,
    logout,
    handleCallback,
    refreshTokens,
    updateProfile,
    isTokenExpired,
    getTokenExpiration,
    clearError,
    setLanguage
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}