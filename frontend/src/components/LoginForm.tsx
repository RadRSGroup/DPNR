'use client';

import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, LogIn, Loader2, AlertCircle } from 'lucide-react';

interface LoginFormProps {
  locale?: 'he' | 'en';
  redirectTo?: string;
}

export default function LoginForm({ locale = 'he', redirectTo = '/' }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const router = useRouter();
  const isRTL = locale === 'he';

  const content = {
    he: {
      title: 'התחברות',
      subtitle: 'התחבר לחשבון שלך',
      email: 'כתובת אימייל',
      password: 'סיסמה',
      showPassword: 'הצג סיסמה',
      hidePassword: 'הסתר סיסמה',
      login: 'התחבר',
      forgotPassword: 'שכחת סיסמה?',
      noAccount: 'אין לך חשבון?',
      register: 'הרשם כאן',
      loading: 'מתחבר...',
      errors: {
        required: 'שדה חובה',
        invalidEmail: 'כתובת אימייל לא תקינה',
        loginFailed: 'הכניסה נכשלה. בדק את פרטי הכניסה שלך.',
        userNotConfirmed: 'החשבון לא אומת. בדוק את האימייל שלך.',
        userNotFound: 'משתמש לא נמצא.',
        incorrectPassword: 'סיסמה שגויה.',
        tooManyAttempts: 'יותר מדי ניסיונות. נסה שוב מאוחר יותר.'
      }
    },
    en: {
      title: 'Sign In',
      subtitle: 'Sign in to your account',
      email: 'Email address',
      password: 'Password',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
      login: 'Sign In',
      forgotPassword: 'Forgot password?',
      noAccount: "Don't have an account?",
      register: 'Register here',
      loading: 'Signing in...',
      errors: {
        required: 'This field is required',
        invalidEmail: 'Invalid email address',
        loginFailed: 'Login failed. Please check your credentials.',
        userNotConfirmed: 'Account not verified. Please check your email.',
        userNotFound: 'User not found.',
        incorrectPassword: 'Incorrect password.',
        tooManyAttempts: 'Too many attempts. Please try again later.'
      }
    }
  };

  const t = content[locale];

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const getErrorMessage = (error: string) => {
    if (error.includes('UserNotConfirmedException')) {
      return t.errors.userNotConfirmed;
    }
    if (error.includes('UserNotFoundException')) {
      return t.errors.userNotFound;
    }
    if (error.includes('NotAuthorizedException')) {
      return t.errors.incorrectPassword;
    }
    if (error.includes('TooManyRequestsException')) {
      return t.errors.tooManyAttempts;
    }
    return t.errors.loginFailed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Basic validation
    if (!email.trim()) {
      setError(t.errors.required);
      setIsLoading(false);
      return;
    }

    if (!validateEmail(email)) {
      setError(t.errors.invalidEmail);
      setIsLoading(false);
      return;
    }

    if (!password.trim()) {
      setError(t.errors.required);
      setIsLoading(false);
      return;
    }

    try {
      await login(email, password);
      // Redirect on successful login
      router.push(redirectTo);
    } catch (error: any) {
      setError(getErrorMessage(error.message));
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {t.title}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t.subtitle}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                {t.email}
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`appearance-none relative block w-full ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'} py-3 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                  placeholder={t.email}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                {t.password}
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`appearance-none relative block w-full ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} py-3 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                  placeholder={t.password}
                />
                <button
                  type="button"
                  className={`absolute inset-y-0 ${isRTL ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center`}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>
          </div>

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

          {/* Submit Button */}
          <div>
            <button
              type="submit"
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
                  {t.login}
                </>
              )}
            </button>
          </div>

          {/* Links */}
          <div className="flex items-center justify-between">
            <Link
              href="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              {t.forgotPassword}
            </Link>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              {t.noAccount}{' '}
              <Link
                href="/register"
                className="font-medium text-blue-600 hover:text-blue-800 underline"
              >
                {t.register}
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}