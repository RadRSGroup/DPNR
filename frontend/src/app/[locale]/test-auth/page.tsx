'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthCallback } from '@/hooks/useAuth';

interface TestAuthPageProps {
  params: Promise<{
    locale: 'he' | 'en';
  }>;
}

export default async function TestAuthPage({ params }: TestAuthPageProps) {
  const { locale } = await params;
  const { isAuthenticated, user, isLoading, login, logout } = useAuth();

  const handleLogin = async () => {
    try {
      await login({
        redirectUri: `${window.location.origin}/auth/callback`,
        language: locale,
      });
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout({
        redirectUri: window.location.origin
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading authentication state...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 ${locale === 'he' ? 'rtl' : 'ltr'}`}>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            Authentication Test Page
          </h1>

          <div className="space-y-6">
            <div className="border rounded-lg p-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Authentication Status</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Authenticated:</span>
                  <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>
                    {isAuthenticated ? 'Yes ✅' : 'No ❌'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Loading:</span>
                  <span className={isLoading ? 'text-yellow-600' : 'text-gray-600'}>
                    {isLoading ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Locale:</span>
                  <span className="text-gray-600">{locale}</span>
                </div>
              </div>
            </div>

            {user && (
              <div className="border rounded-lg p-4">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">User Information</h2>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Email:</span>
                    <span className="text-gray-600">{user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Name:</span>
                    <span className="text-gray-600">{user.firstName} {user.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Role:</span>
                    <span className="text-gray-600">{user.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Language:</span>
                    <span className="text-gray-600">{user.preferredLanguage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Email Verified:</span>
                    <span className={user.emailVerified ? 'text-green-600' : 'text-red-600'}>
                      {user.emailVerified ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="border rounded-lg p-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Authentication Actions</h2>
              <div className="space-y-3">
                {!isAuthenticated ? (
                  <button
                    onClick={handleLogin}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Login with OAuth
                  </button>
                ) : (
                  <button
                    onClick={handleLogout}
                    className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Logout
                  </button>
                )}
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">API Test</h2>
              <div className="space-y-3">
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('http://localhost:3003/health');
                      const data = await response.json();
                      alert('Backend Health: ' + JSON.stringify(data, null, 2));
                    } catch (error) {
                      alert('Backend Error: ' + error);
                    }
                  }}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Test Backend Health
                </button>
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('http://localhost:3003/v1/auth/config');
                      const data = await response.json();
                      alert('Auth Config: ' + JSON.stringify(data, null, 2));
                    } catch (error) {
                      alert('Auth Config Error: ' + error);
                    }
                  }}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Test Auth Config
                </button>
              </div>
            </div>

            <div className="text-center text-sm text-gray-500">
              <p>Frontend: localhost:3000 | Backend: localhost:3003</p>
              <p>This page tests the authentication integration between frontend and backend.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}