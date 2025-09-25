'use client';

import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import Link from 'next/link';
import { Mail, ArrowRight, ArrowLeft, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface ForgotPasswordFormProps {
  locale?: 'he' | 'en';
}

export default function ForgotPasswordForm({ locale = 'he' }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const { forgotPassword } = useAuth();
  const isRTL = locale === 'he';

  const content = {
    he: {
      title: 'שכחת סיסמה?',
      subtitle: 'הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה',
      email: 'כתובת אימייל',
      sendLink: 'שלח קישור',
      backToLogin: 'חזור להתחברות',
      loading: 'שולח...',
      success: {
        title: 'קישור נשלח בהצלחה!',
        description: 'קישור לאיפוס סיסמה נשלח לכתובת האימייל שלך. בדוק את תיבת הדואר ולחץ על הקישור לאיפוס.',
        button: 'חזור להתחברות'
      },
      errors: {
        required: 'שדה חובה',
        invalidEmail: 'כתובת אימייל לא תקינה',
        userNotFound: 'משתמש לא נמצא עם כתובת אימייל זו',
        sendFailed: 'שליחת הקישור נכשלה. נסה שוב מאוחר יותר.'
      }
    },
    en: {
      title: 'Forgot Password?',
      subtitle: 'Enter your email address and we\'ll send you a link to reset your password',
      email: 'Email address',
      sendLink: 'Send Link',
      backToLogin: 'Back to Login',
      loading: 'Sending...',
      success: {
        title: 'Link sent successfully!',
        description: 'A password reset link has been sent to your email address. Check your inbox and click the link to reset.',
        button: 'Back to Login'
      },
      errors: {
        required: 'This field is required',
        invalidEmail: 'Invalid email address',
        userNotFound: 'No user found with this email address',
        sendFailed: 'Failed to send reset link. Please try again later.'
      }
    }
  };

  const t = content[locale];

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const getErrorMessage = (error: string) => {
    if (error.includes('UserNotFoundException')) {
      return t.errors.userNotFound;
    }
    return t.errors.sendFailed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email) {
      setError(t.errors.required);
      return;
    }
    if (!validateEmail(email)) {
      setError(t.errors.invalidEmail);
      return;
    }

    setIsLoading(true);

    try {
      await forgotPassword(email);
      setIsSuccess(true);
    } catch (error: any) {
      setError(getErrorMessage(error.message));
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              {t.success.title}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {t.success.description}
            </p>
            <div className="mt-6">
              <Link
                href="/login"
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t.success.button}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                  {t.sendLink}
                  {isRTL ? (
                    <ArrowLeft className="w-4 h-4 ml-2" />
                  ) : (
                    <ArrowRight className="w-4 h-4 ml-2" />
                  )}
                </>
              )}
            </button>
          </div>

          {/* Back to Login */}
          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              {t.backToLogin}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}