'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from './AuthProvider';
import CookieConsent from './CookieConsent';
import { localeDirections, type Locale } from '@/i18n/config';
import {
  Menu,
  X,
  Home,
  BookOpen,
  Calendar,
  User,
  Settings,
  LogOut,
  LogIn,
  UserPlus,
  Shield,
  Bell,
  ChevronDown,
  Globe,
  Sun,
  Moon
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  locale: Locale;
}

export default function Layout({ children, locale }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLocaleMenuOpen, setIsLocaleMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showCookieConsent, setShowCookieConsent] = useState(false);

  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isRTL = localeDirections[locale] === 'rtl';

  const tNav = useTranslations('navigation');
  const tAuth = useTranslations('auth');
  const tUser = useTranslations('userMenu');
  const tFooter = useTranslations('footer');
  const tAccessibility = useTranslations('accessibility');

  // Check for cookie consent on mount
  useEffect(() => {
    const hasConsent = localStorage.getItem('cookieConsent');
    if (!hasConsent) {
      setShowCookieConsent(true);
    }

    // Check for dark mode preference
    const darkMode = localStorage.getItem('darkMode');
    if (darkMode === 'true') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/');
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());

    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const switchLocale = (newLocale: 'he' | 'en') => {
    const currentPath = pathname;
    // Simple locale switching - in a real app you'd have more sophisticated routing
    if (newLocale === 'he') {
      router.push(currentPath);
    } else {
      router.push(`/en${currentPath}`);
    }
    setIsLocaleMenuOpen(false);
  };

  const navigationItems = [
    { href: '/', label: tNav('home'), icon: Home },
    { href: '/courses', label: tNav('courses'), icon: BookOpen },
    { href: '/consultation', label: tNav('consultation'), icon: Calendar },
  ];

  if (isAuthenticated) {
    navigationItems.push({ href: '/dashboard', label: tNav('dashboard'), icon: User });

    if (user?.role === 'admin' || user?.role === 'instructor') {
      navigationItems.push({ href: '/admin', label: tNav('admin'), icon: Shield });
    }
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Navigation Header */}
      <nav className="bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and primary navigation */}
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  DPNR
                </Link>
              </div>

              {/* Desktop navigation */}
              <div className="hidden md:ml-6 md:flex md:space-x-8">
                {navigationItems.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                      isActive(href)
                        ? 'border-blue-500 text-gray-900 dark:text-white'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-300 dark:hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right side controls */}
            <div className="flex items-center space-x-4">
              {/* Theme toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                aria-label={tAccessibility('toggleTheme')}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Language selector */}
              <div className="relative">
                <button
                  onClick={() => setIsLocaleMenuOpen(!isLocaleMenuOpen)}
                  className="flex items-center p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                  aria-label={tAccessibility('toggleLocale')}
                >
                  <Globe className="w-5 h-5" />
                  <ChevronDown className="w-3 h-3 ml-1" />
                </button>

                {isLocaleMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50">
                    <button
                      onClick={() => switchLocale('he')}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        locale === 'he' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      עברית
                    </button>
                    <button
                      onClick={() => switchLocale('en')}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        locale === 'en' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      English
                    </button>
                  </div>
                )}
              </div>

              {/* User menu or auth buttons */}
              {!isLoading && (
                <>
                  {isAuthenticated && user ? (
                    <div className="relative">
                      <button
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className="flex items-center max-w-xs bg-white dark:bg-gray-800 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        aria-label={tAccessibility('toggleUserMenu')}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {tAuth('welcome')}, {user.name}
                          </span>
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        </div>
                      </button>

                      {isUserMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50">
                          <Link
                            href="/dashboard/profile"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <User className={`w-4 h-4 ${isRTL ? 'ml-3' : 'mr-3'}`} />
                            {tUser('profile')}
                          </Link>
                          <Link
                            href="/dashboard/settings"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <Settings className={`w-4 h-4 ${isRTL ? 'ml-3' : 'mr-3'}`} />
                            {tUser('settings')}
                          </Link>
                          <Link
                            href="/privacy"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <Shield className={`w-4 h-4 ${isRTL ? 'ml-3' : 'mr-3'}`} />
                            {tUser('privacy')}
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <LogOut className={`w-4 h-4 ${isRTL ? 'ml-3' : 'mr-3'}`} />
                            {tUser('logout')}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="hidden md:flex items-center space-x-4">
                      <Link
                        href="/login"
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                      >
                        <LogIn className={`w-4 h-4 inline ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {tAuth('login')}
                      </Link>
                      <Link
                        href="/register"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                      >
                        <UserPlus className={`w-4 h-4 inline ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {tAuth('register')}
                      </Link>
                    </div>
                  )}
                </>
              )}

              {/* Mobile menu button */}
              <div className="md:hidden">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label={tAccessibility('toggleMenu')}
                >
                  {isMobileMenuOpen ? (
                    <X className="block h-6 w-6" />
                  ) : (
                    <Menu className="block h-6 w-6" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="pt-2 pb-3 space-y-1">
              {navigationItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                    isActive(href)
                      ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className={`w-5 h-5 ${isRTL ? 'ml-3' : 'mr-3'}`} />
                  {label}
                </Link>
              ))}
            </div>

            {/* Mobile auth section */}
            {!isLoading && (
              <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
                {isAuthenticated && user ? (
                  <div className="flex items-center px-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <div className={`${isRTL ? 'mr-3' : 'ml-3'}`}>
                      <div className="text-base font-medium text-gray-800 dark:text-white">
                        {user.name}
                      </div>
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {user.email}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 space-y-2">
                    <Link
                      href="/login"
                      className="block w-full text-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md text-base font-medium border border-gray-300 dark:border-gray-600"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {tAuth('login')}
                    </Link>
                    <Link
                      href="/register"
                      className="block w-full text-center bg-blue-600 text-white px-4 py-2 rounded-md text-base font-medium"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {tAuth('register')}
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                DPNR
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {locale === 'he'
                  ? 'פיתוח אישי ומקצועי למסע החיים שלכם'
                  : 'Personal and professional development for your life journey'
                }
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                {locale === 'he' ? 'קישורים מהירים' : 'Quick Links'}
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/privacy" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                    {tFooter('privacy')}
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                    {tFooter('terms')}
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                    {tFooter('contact')}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                {locale === 'he' ? 'צור קשר' : 'Contact'}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {locale === 'he'
                  ? 'אימייל: info@dpnr.co.il'
                  : 'Email: info@dpnr.co.il'
                }
              </p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              © 2024 {tFooter('copyright')}
            </p>
          </div>
        </div>
      </footer>

      {/* Cookie Consent */}
      {showCookieConsent && (
        <CookieConsent locale={locale} />
      )}

      {/* Click outside handler for dropdowns */}
      {(isUserMenuOpen || isLocaleMenuOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsUserMenuOpen(false);
            setIsLocaleMenuOpen(false);
          }}
        />
      )}
    </div>
  );
}