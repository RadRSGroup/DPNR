'use client';

import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, User, UserPlus, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface RegisterFormProps {
  locale?: 'he' | 'en';
}

export default function RegisterForm({ locale = 'he' }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);

  const { register } = useAuth();
  const router = useRouter();
  const isRTL = locale === 'he';

  const content = {
    he: {
      title: 'הרשמה',
      subtitle: 'צור חשבון חדש',
      name: 'שם מלא',
      email: 'כתובת אימייל',
      password: 'סיסמה',
      confirmPassword: 'אימות סיסמה',
      showPassword: 'הצג סיסמה',
      hidePassword: 'הסתר סיסמה',
      register: 'הרשם',
      haveAccount: 'יש לך כבר חשבון?',
      login: 'התחבר כאן',
      loading: 'נרשם...',
      success: {
        title: 'הרשמה הושלמה בהצלחה!',
        description: 'קוד אימות נשלח לכתובת האימייל שלך. אנא בדוק את תיבת הדואר שלך ולחץ על הקישור לאימות.',
        button: 'אמת אימייל'
      },
      passwordRequirements: {
        title: 'דרישות סיסמה:',
        length: 'לפחות 8 תווים',
        uppercase: 'אות גדולה אחת לפחות',
        lowercase: 'אות קטנה אחת לפחות',
        number: 'מספר אחד לפחות',
        special: 'תו מיוחד אחד לפחות'
      },
      errors: {
        required: 'שדה חובה',
        invalidEmail: 'כתובת אימייל לא תקינה',
        passwordTooShort: 'הסיסמה חייבת להכיל לפחות 8 תווים',
        passwordWeak: 'הסיסמה לא עומדת בדרישות',
        passwordMismatch: 'הסיסמאות לא תואמות',
        emailExists: 'כתובת האימייל כבר קיימת במערכת',
        registrationFailed: 'ההרשמה נכשלה. נסה שוב מאוחר יותר.'
      }
    },
    en: {
      title: 'Register',
      subtitle: 'Create a new account',
      name: 'Full name',
      email: 'Email address',
      password: 'Password',
      confirmPassword: 'Confirm password',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
      register: 'Register',
      haveAccount: 'Already have an account?',
      login: 'Sign in here',
      loading: 'Registering...',
      success: {
        title: 'Registration successful!',
        description: 'A verification code has been sent to your email. Please check your inbox and click the verification link.',
        button: 'Verify Email'
      },
      passwordRequirements: {
        title: 'Password requirements:',
        length: 'At least 8 characters',
        uppercase: 'At least one uppercase letter',
        lowercase: 'At least one lowercase letter',
        number: 'At least one number',
        special: 'At least one special character'
      },
      errors: {
        required: 'This field is required',
        invalidEmail: 'Invalid email address',
        passwordTooShort: 'Password must be at least 8 characters',
        passwordWeak: 'Password does not meet requirements',
        passwordMismatch: 'Passwords do not match',
        emailExists: 'Email address already exists',
        registrationFailed: 'Registration failed. Please try again later.'
      }
    }
  };

  const t = content[locale];

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePassword = (password: string) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    return requirements;
  };

  const isPasswordValid = (password: string) => {
    const requirements = validatePassword(password);
    return Object.values(requirements).every(req => req);
  };

  const getErrorMessage = (error: string) => {
    if (error.includes('UsernameExistsException')) {
      return t.errors.emailExists;
    }
    return t.errors.registrationFailed;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError(t.errors.required);
      return;
    }
    if (!formData.email) {
      setError(t.errors.required);
      return;
    }
    if (!validateEmail(formData.email)) {
      setError(t.errors.invalidEmail);
      return;
    }
    if (!formData.password) {
      setError(t.errors.required);
      return;
    }
    if (formData.password.length < 8) {
      setError(t.errors.passwordTooShort);
      return;
    }
    if (!isPasswordValid(formData.password)) {
      setError(t.errors.passwordWeak);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError(t.errors.passwordMismatch);
      return;
    }

    setIsLoading(true);

    try {
      await register(formData.email, formData.password, formData.name);
      setIsRegistered(true);
    } catch (error: any) {
      setError(getErrorMessage(error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const passwordRequirements = validatePassword(formData.password);

  if (isRegistered) {
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
              <button
                onClick={() => router.push('/verify-email')}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t.success.button}
              </button>
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
          <div className="space-y-4">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                {t.name}
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`appearance-none relative block w-full ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'} py-3 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                  placeholder={t.name}
                />
              </div>
            </div>

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
                  value={formData.email}
                  onChange={handleInputChange}
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
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
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

              {/* Password Requirements */}
              {formData.password && (
                <div className="mt-2 text-xs space-y-1">
                  <p className="font-medium text-gray-700">{t.passwordRequirements.title}</p>
                  <div className="space-y-1">
                    {Object.entries(passwordRequirements).map(([key, valid]) => (
                      <div key={key} className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                        <CheckCircle className={`h-3 w-3 ${valid ? 'text-green-500' : 'text-gray-300'}`} />
                        <span className={valid ? 'text-green-700' : 'text-gray-500'}>
                          {t.passwordRequirements[key as keyof typeof t.passwordRequirements]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                {t.confirmPassword}
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`appearance-none relative block w-full ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} py-3 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                  placeholder={t.confirmPassword}
                />
                <button
                  type="button"
                  className={`absolute inset-y-0 ${isRTL ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center`}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
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
              disabled={isLoading || !isPasswordValid(formData.password)}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {t.loading}
                </>
              ) : (
                <>
                  <UserPlus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t.register}
                </>
              )}
            </button>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {t.haveAccount}{' '}
              <Link
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-800 underline"
              >
                {t.login}
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}