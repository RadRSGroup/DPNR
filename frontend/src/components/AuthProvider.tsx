'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { CognitoUser, CognitoUserPool, AuthenticationDetails, CognitoUserSession, CognitoUserAttribute } from 'amazon-cognito-identity-js';

interface User {
  email: string;
  name: string;
  role: 'admin' | 'instructor' | 'student';
  id: string;
  isEmailVerified?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  confirmEmail: (email: string, code: string) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initialize Cognito User Pool only if environment variables are available
const userPool = (() => {
  const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;

  if (!userPoolId || !clientId || userPoolId === 'your-user-pool-id' || clientId === 'your-client-id') {
    console.warn('Cognito environment variables not configured properly. Authentication will be disabled.');
    return null;
  }

  try {
    return new CognitoUserPool({
      UserPoolId: userPoolId,
      ClientId: clientId,
    });
  } catch (error) {
    console.error('Failed to initialize Cognito User Pool:', error);
    return null;
  }
})();

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Check for existing session on mount
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      // If Cognito is not configured, skip authentication
      if (!userPool) {
        setIsLoading(false);
        return;
      }

      const currentUser = userPool.getCurrentUser();
      if (currentUser) {
        await new Promise<void>((resolve, reject) => {
          currentUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
            if (err) {
              reject(err);
              return;
            }
            if (session && session.isValid()) {
              const payload = session.getIdToken().payload;
              setUser({
                id: payload.sub,
                email: payload.email,
                name: payload.name || payload.email,
                role: payload['custom:role'] || 'student',
                isEmailVerified: payload.email_verified
              });

              // Store tokens in localStorage
              localStorage.setItem('accessToken', session.getAccessToken().getJwtToken());
              localStorage.setItem('idToken', session.getIdToken().getJwtToken());
              localStorage.setItem('refreshToken', session.getRefreshToken().getToken());
            }
            resolve();
          });
        });
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    if (!userPool) {
      throw new Error('Authentication is not configured. Please contact support.');
    }

    return new Promise((resolve, reject) => {
      const user = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      const authDetails = new AuthenticationDetails({
        Username: email,
        Password: password,
      });

      user.authenticateUser(authDetails, {
        onSuccess: (session) => {
          const payload = session.getIdToken().payload;
          setUser({
            id: payload.sub,
            email: payload.email,
            name: payload.name || payload.email,
            role: payload['custom:role'] || 'student',
            isEmailVerified: payload.email_verified
          });

          // Store tokens
          localStorage.setItem('accessToken', session.getAccessToken().getJwtToken());
          localStorage.setItem('idToken', session.getIdToken().getJwtToken());
          localStorage.setItem('refreshToken', session.getRefreshToken().getToken());

          resolve();
        },
        onFailure: (err) => {
          reject(new Error(err.message || 'Authentication failed'));
        },
        newPasswordRequired: () => {
          reject(new Error('New password required'));
        },
      });
    });
  };

  const logout = async (): Promise<void> => {
    return new Promise((resolve) => {
      if (userPool) {
        const currentUser = userPool.getCurrentUser();
        if (currentUser) {
          currentUser.signOut();
        }
      }

      setUser(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('idToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('cookieConsent');

      resolve();
    });
  };

  const register = async (email: string, password: string, name: string): Promise<void> => {
    if (!userPool) {
      throw new Error('Authentication is not configured. Please contact support.');
    }

    return new Promise((resolve, reject) => {
      userPool.signUp(
        email,
        password,
        [
          new CognitoUserAttribute({
            Name: 'email',
            Value: email,
          }),
          new CognitoUserAttribute({
            Name: 'name',
            Value: name,
          })
        ],
        [],
        (err, result) => {
          if (err) {
            reject(new Error(err.message || 'Registration failed'));
            return;
          }
          resolve();
        }
      );
    });
  };

  const confirmEmail = async (email: string, code: string): Promise<void> => {
    if (!userPool) {
      throw new Error('Authentication is not configured. Please contact support.');
    }

    return new Promise((resolve, reject) => {
      const user = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      user.confirmRegistration(code, true, (err) => {
        if (err) {
          reject(new Error(err.message || 'Email confirmation failed'));
          return;
        }
        resolve();
      });
    });
  };

  const resendConfirmation = async (email: string): Promise<void> => {
    if (!userPool) {
      throw new Error('Authentication is not configured. Please contact support.');
    }

    return new Promise((resolve, reject) => {
      const user = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      user.resendConfirmationCode((err) => {
        if (err) {
          reject(new Error(err.message || 'Failed to resend confirmation'));
          return;
        }
        resolve();
      });
    });
  };

  const forgotPassword = async (email: string): Promise<void> => {
    if (!userPool) {
      throw new Error('Authentication is not configured. Please contact support.');
    }

    return new Promise((resolve, reject) => {
      const user = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      user.forgotPassword({
        onSuccess: () => {
          resolve();
        },
        onFailure: (err) => {
          reject(new Error(err.message || 'Failed to send reset code'));
        },
      });
    });
  };

  const resetPassword = async (email: string, code: string, newPassword: string): Promise<void> => {
    if (!userPool) {
      throw new Error('Authentication is not configured. Please contact support.');
    }

    return new Promise((resolve, reject) => {
      const user = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      user.confirmPassword(code, newPassword, {
        onSuccess: () => {
          resolve();
        },
        onFailure: (err) => {
          reject(new Error(err.message || 'Failed to reset password'));
        },
      });
    });
  };

  const refreshToken = async (): Promise<void> => {
    if (!userPool) {
      throw new Error('Authentication is not configured. Please contact support.');
    }

    return new Promise((resolve, reject) => {
      const currentUser = userPool.getCurrentUser();
      if (!currentUser) {
        reject(new Error('No user found'));
        return;
      }

      currentUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err) {
          reject(err);
          return;
        }

        if (session && session.isValid()) {
          // Update stored tokens
          localStorage.setItem('accessToken', session.getAccessToken().getJwtToken());
          localStorage.setItem('idToken', session.getIdToken().getJwtToken());
          resolve();
        } else {
          reject(new Error('Invalid session'));
        }
      });
    });
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    register,
    confirmEmail,
    resendConfirmation,
    forgotPassword,
    resetPassword,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}