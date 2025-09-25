/**
 * Authentication Hooks
 * Custom hooks for authentication-related functionality
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth as useAuthContext } from '@/contexts/AuthContext';
import { User } from '@/types/auth';

/**
 * Main authentication hook - re-exports auth context
 */
export { useAuth as useAuthContext } from '@/contexts/AuthContext';

/**
 * Hook for route protection
 */
export function useRequireAuth(redirectTo: string = '/auth/login') {
  const { isAuthenticated, isLoading } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Store current path for post-login redirect
      const returnTo = pathname;
      router.replace(`${redirectTo}?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [isAuthenticated, isLoading, router, redirectTo, pathname]);

  return { isAuthenticated, isLoading };
}

/**
 * Hook for role-based access control
 */
export function useRequireRole(allowedRoles: string[], redirectTo: string = '/') {
  const { user, isAuthenticated, isLoading } = useAuthContext();
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !user) {
        router.replace('/auth/login');
        return;
      }

      if (!allowedRoles.includes(user.role)) {
        router.replace(redirectTo);
        return;
      }

      setHasAccess(true);
    }
  }, [isAuthenticated, isLoading, user, allowedRoles, router, redirectTo]);

  return { hasAccess, isLoading };
}

/**
 * Hook for admin-only access
 */
export function useRequireAdmin(redirectTo: string = '/') {
  return useRequireRole(['admin'], redirectTo);
}

/**
 * Hook for instructor or admin access
 */
export function useRequireInstructorOrAdmin(redirectTo: string = '/') {
  return useRequireRole(['instructor', 'admin'], redirectTo);
}

/**
 * Hook for handling OAuth callback
 */
export function useAuthCallback() {
  const { handleCallback } = useAuthContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const processCallback = useCallback(async () => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      setError(null);

      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        throw new Error(searchParams.get('error_description') || errorParam);
      }

      if (!code) {
        throw new Error('Authorization code not found');
      }

      await handleCallback(code, state || undefined);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsProcessing(false);
    }
  }, [handleCallback, searchParams, isProcessing]);

  return {
    processCallback,
    isProcessing,
    error
  };
}

/**
 * Hook for user profile management
 */
export function useUserProfile() {
  const { user, updateProfile, error, isLoading } = useAuthContext();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const update = useCallback(async (updates: Partial<User>) => {
    try {
      setIsUpdating(true);
      setUpdateError(null);
      await updateProfile(updates);
    } catch (err: any) {
      setUpdateError(err.message || 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  }, [updateProfile]);

  return {
    user,
    update,
    isUpdating,
    updateError,
    error,
    isLoading
  };
}

/**
 * Hook for token management
 */
export function useTokens() {
  const { tokens, refreshTokens, isTokenExpired, getTokenExpiration } = useAuthContext();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;

    try {
      setIsRefreshing(true);
      await refreshTokens();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshTokens, isRefreshing]);

  const shouldRefresh = useCallback(() => {
    return isTokenExpired();
  }, [isTokenExpired]);

  return {
    tokens,
    refresh,
    isRefreshing,
    shouldRefresh,
    isExpired: isTokenExpired,
    expiresAt: getTokenExpiration()
  };
}

/**
 * Hook for language management
 */
export function useLanguage() {
  const { preferredLanguage, setLanguage, user } = useAuthContext();

  const changeLanguage = useCallback((language: 'he' | 'en') => {
    setLanguage(language);
    // Update user preference if authenticated
    if (user) {
      // This will be handled by the context automatically
    }
  }, [setLanguage, user]);

  return {
    language: preferredLanguage,
    changeLanguage,
    isRTL: preferredLanguage === 'he'
  };
}

/**
 * Hook for authentication status checks
 */
export function useAuthStatus() {
  const { isAuthenticated, isLoading, user, error } = useAuthContext();

  return {
    isAuthenticated,
    isLoading,
    isAnonymous: !isAuthenticated && !isLoading,
    isAdmin: user?.role === 'admin',
    isInstructor: user?.role === 'instructor',
    isStudent: user?.role === 'student',
    hasRole: (role: string) => user?.role === role,
    hasAnyRole: (roles: string[]) => user ? roles.includes(user.role) : false,
    error
  };
}

/**
 * Hook for logout functionality
 */
export function useLogout() {
  const { logout } = useAuthContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = useCallback(async (redirectTo?: string) => {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);
      await logout({ redirectUri: redirectTo });
    } finally {
      setIsLoggingOut(false);
    }
  }, [logout, isLoggingOut]);

  return {
    logout: handleLogout,
    isLoggingOut
  };
}

/**
 * Hook for login functionality
 */
export function useLogin() {
  const { login } = useAuthContext();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = useCallback(async (language?: 'he' | 'en', redirectUri?: string) => {
    if (isLoggingIn) return;

    try {
      setIsLoggingIn(true);
      await login({ language, redirectUri });
    } finally {
      setIsLoggingIn(false);
    }
  }, [login, isLoggingIn]);

  return {
    login: handleLogin,
    isLoggingIn
  };
}

/**
 * Hook for automatic token refresh
 */
export function useAutoRefresh(intervalMinutes: number = 5) {
  const { refreshTokens, isTokenExpired } = useAuthContext();

  useEffect(() => {
    const interval = setInterval(() => {
      if (isTokenExpired()) {
        refreshTokens();
      }
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshTokens, isTokenExpired, intervalMinutes]);
}

/**
 * Hook for handling authentication redirects
 */
export function useAuthRedirect() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthContext();

  const redirectIfAuthenticated = useCallback((to: string = '/') => {
    if (!isLoading && isAuthenticated) {
      router.replace(to);
    }
  }, [isAuthenticated, isLoading, router]);

  const redirectIfNotAuthenticated = useCallback((to: string = '/auth/login') => {
    if (!isLoading && !isAuthenticated) {
      router.replace(to);
    }
  }, [isAuthenticated, isLoading, router]);

  return {
    redirectIfAuthenticated,
    redirectIfNotAuthenticated
  };
}