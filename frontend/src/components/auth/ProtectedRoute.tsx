'use client';

/**
 * Protected Route Component
 * Wrapper component for protecting routes based on authentication and roles
 */

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRouteProps } from '@/types/auth';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({
  children,
  requiredRole = [],
  fallback,
  redirectTo = '/auth/login'
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      )
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    // Redirect to login will be handled by useRequireAuth hook
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Redirecting to login...</p>
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // Check role requirements
  if (requiredRole.length > 0 && user) {
    const hasRequiredRole = requiredRole.includes(user.role);

    if (!hasRequiredRole) {
      return (
        fallback || (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center max-w-md mx-auto p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-red-800 mb-2">
                  Access Denied
                </h2>
                <p className="text-red-600 mb-4">
                  You don't have permission to access this page.
                </p>
                <p className="text-sm text-red-500">
                  Required role: {requiredRole.join(' or ')}<br />
                  Your role: {user.role}
                </p>
              </div>
            </div>
          </div>
        )
      );
    }
  }

  // All checks passed, render children
  return <>{children}</>;
}

// Convenience components for specific roles
export function AdminRoute({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole={['admin']} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

export function InstructorRoute({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole={['instructor', 'admin']} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

export function StudentRoute({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole={['student', 'instructor', 'admin']} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}