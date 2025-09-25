import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import LoginForm from '../LoginForm';
import { useAuth } from '../AuthProvider';

// Mock the AuthProvider hook
jest.mock('../AuthProvider');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock Next.js navigation hook
jest.mock('next/navigation');
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('LoginForm', () => {
  const mockLogin = jest.fn();
  const mockPush = jest.fn();

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: mockLogin,
      logout: jest.fn(),
      register: jest.fn(),
      confirmEmail: jest.fn(),
      resendConfirmation: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      refreshToken: jest.fn(),
    });

    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    } as any);

    jest.clearAllMocks();
  });

  describe('Hebrew locale', () => {
    it('renders login form in Hebrew', () => {
      render(<LoginForm locale="he" />);

      expect(screen.getByText('התחברות')).toBeInTheDocument();
      expect(screen.getByText('התחבר לחשבון שלך')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('כתובת אימייל')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('סיסמה')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /התחבר/i })).toBeInTheDocument();
    });

    it('applies RTL direction for Hebrew', () => {
      const { container } = render(<LoginForm locale="he" />);
      const mainDiv = container.firstChild;
      expect(mainDiv).toHaveClass('rtl');
    });
  });

  describe('English locale', () => {
    it('renders login form in English', () => {
      render(<LoginForm locale="en" />);

      expect(screen.getByText('Sign In')).toBeInTheDocument();
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('applies LTR direction for English', () => {
      const { container } = render(<LoginForm locale="en" />);
      const mainDiv = container.firstChild;
      expect(mainDiv).toHaveClass('ltr');
    });
  });

  describe('Form validation', () => {
    it('shows error for empty email', async () => {
      const user = userEvent.setup();
      render(<LoginForm locale="en" />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      expect(screen.getByText('This field is required')).toBeInTheDocument();
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('shows error for invalid email format', async () => {
      const user = userEvent.setup();
      render(<LoginForm locale="en" />);

      const emailInput = screen.getByPlaceholderText('Email address');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('shows error for empty password', async () => {
      const user = userEvent.setup();
      render(<LoginForm locale="en" />);

      const emailInput = screen.getByPlaceholderText('Email address');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      expect(screen.getByText('This field is required')).toBeInTheDocument();
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  describe('Password visibility toggle', () => {
    it('toggles password visibility', async () => {
      const user = userEvent.setup();
      render(<LoginForm locale="en" />);

      const passwordInput = screen.getByPlaceholderText('Password');
      const toggleButton = screen.getByRole('button', { name: /show password/i });

      expect(passwordInput).toHaveAttribute('type', 'password');

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Form submission', () => {
    it('submits form with valid credentials', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue(undefined);

      render(<LoginForm locale="en" redirectTo="/dashboard" />);

      const emailInput = screen.getByPlaceholderText('Email address');
      const passwordInput = screen.getByPlaceholderText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      mockLogin.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<LoginForm locale="en" />);

      const emailInput = screen.getByPlaceholderText('Email address');
      const passwordInput = screen.getByPlaceholderText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      expect(screen.getByText('Signing in...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('handles login errors', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Invalid credentials';
      mockLogin.mockRejectedValue(new Error(errorMessage));

      render(<LoginForm locale="en" />);

      const emailInput = screen.getByPlaceholderText('Email address');
      const passwordInput = screen.getByPlaceholderText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Login failed. Please check your credentials.')).toBeInTheDocument();
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('handles specific Cognito errors', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error('UserNotConfirmedException'));

      render(<LoginForm locale="en" />);

      const emailInput = screen.getByPlaceholderText('Email address');
      const passwordInput = screen.getByPlaceholderText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Account not verified. Please check your email.')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation links', () => {
    it('renders forgot password link', () => {
      render(<LoginForm locale="en" />);
      const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i });
      expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
    });

    it('renders register link', () => {
      render(<LoginForm locale="en" />);
      const registerLink = screen.getByRole('link', { name: /register here/i });
      expect(registerLink).toHaveAttribute('href', '/register');
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      render(<LoginForm locale="en" />);

      expect(screen.getByLabelText('Email address')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('has proper ARIA attributes', () => {
      render(<LoginForm locale="en" />);

      const emailInput = screen.getByPlaceholderText('Email address');
      const passwordInput = screen.getByPlaceholderText('Password');

      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
    });

    it('shows error messages with proper ARIA attributes', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));

      render(<LoginForm locale="en" />);

      const emailInput = screen.getByPlaceholderText('Email address');
      const passwordInput = screen.getByPlaceholderText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        const errorElement = screen.getByText('Login failed. Please check your credentials.');
        expect(errorElement).toBeInTheDocument();
        expect(errorElement.closest('[role="alert"]')).toBeInTheDocument();
      });
    });
  });
});