'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, Loader2, AlertCircle } from 'lucide-react';

interface OAuthLoginButtonProps {
  locale?: 'he' | 'en';
  redirectTo?: string;
}

export default function OAuthLoginButton({ locale = 'he', redirectTo }: OAuthLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const isRTL = locale === 'he';

  const content = {
    he: {
      title: 'התחברות לחשבון DPNR',
      subtitle: 'התחבר באמצעות AWS Cognito',
      loginButton: 'התחבר',
      loading: 'מתחבר...',
      error: 'שגיאה בהתחברות. אנא נסה שוב.',
    },
    en: {
      title: 'Sign in to DPNR Account',
      subtitle: 'Sign in using AWS Cognito',
      loginButton: 'Sign In',
      loading: 'Signing in...',
      error: 'Login error. Please try again.',
    }
  };

  const t = content[locale];

  const handleLogin = async () => {
    setError('');
    setIsLoading(true);

    try {
      await login({
        redirectUri: `${window.location.origin}/auth/callback`,
        language: locale,
      });
      // The login function will redirect to Cognito, so we won't reach here
    } catch (error: any) {
      setError(error.message || t.error);
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {t.title}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t.subtitle}
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className={`${isRTL ? 'mr-3' : 'ml-3'}`}>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Login Button */}
          <div>
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {t.loading}
                </>
              ) : (
                <>
                  <LogIn className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t.loginButton}
                </>
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              {locale === 'he'
                ? 'תתבקש להתחבר דרך AWS Cognito'
                : 'You will be redirected to AWS Cognito for authentication'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}