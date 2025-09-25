'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'instructor' | 'student';
  redirectTo?: string;
  locale?: 'he' | 'en';
}

export default function ProtectedRoute({
  children,
  requiredRole,
  redirectTo = '/login',
  locale = 'he'
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const isRTL = locale === 'he';

  const content = {
    he: {
      loading: 'טוען...',
      unauthorized: 'אין לך הרשאה לגשת לעמוד זה',
      redirecting: 'מפנה...'
    },
    en: {
      loading: 'Loading...',
      unauthorized: 'You are not authorized to access this page',
      redirecting: 'Redirecting...'
    }
  };

  const t = content[locale];

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // Store intended destination for redirect after login
        const currentPath = window.location.pathname + window.location.search;
        localStorage.setItem('redirectAfterLogin', currentPath);
        router.push(redirectTo);
        return;
      }

      if (requiredRole && user) {
        const hasRequiredRole = () => {
          switch (requiredRole) {
            case 'admin':
              return user.role === 'admin';
            case 'instructor':
              return user.role === 'admin' || user.role === 'instructor';
            case 'student':
              return user.role === 'admin' || user.role === 'instructor' || user.role === 'student';
            default:
              return true;
          }
        };

        if (!hasRequiredRole()) {
          router.push('/unauthorized');
          return;
        }
      }
    }
  }, [isLoading, isAuthenticated, user, requiredRole, router, redirectTo]);

  // Show loading state
  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">{t.loading}</p>
        </div>
      </div>
    );
  }

  // Show unauthorized state
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">{t.redirecting}</p>
        </div>
      </div>
    );
  }

  // Show role-based unauthorized state
  if (requiredRole && user) {
    const hasRequiredRole = () => {
      switch (requiredRole) {
        case 'admin':
          return user.role === 'admin';
        case 'instructor':
          return user.role === 'admin' || user.role === 'instructor';
        case 'student':
          return user.role === 'admin' || user.role === 'instructor' || user.role === 'student';
        default:
          return true;
      }
    };

    if (!hasRequiredRole()) {
      return (
        <div className={`min-h-screen flex items-center justify-center bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">403</h1>
            <p className="text-gray-600">{t.unauthorized}</p>
          </div>
        </div>
      );
    }
  }

  // Render protected content
  return <>{children}</>;
}