import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import EnrollmentForm from '../EnrollmentForm';

// Mock Next.js navigation hook
jest.mock('next/navigation');
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('EnrollmentForm', () => {
  const mockPush = jest.fn();

  const mockCohorts = [
    {
      id: 'cohort-1',
      name: 'DPNR Course - Spring 2024',
      description: 'Spring cohort for DPNR personal development program',
      startDate: '2024-03-01T00:00:00.000Z',
      endDate: '2024-08-01T00:00:00.000Z',
      capacity: 20,
      enrolledCount: 15,
      price: 6400,
      status: 'open'
    },
    {
      id: 'cohort-2',
      name: 'DPNR Course - Summer 2024',
      description: 'Summer cohort for DPNR personal development program',
      startDate: '2024-06-01T00:00:00.000Z',
      endDate: '2024-11-01T00:00:00.000Z',
      capacity: 25,
      enrolledCount: 8,
      price: 6400,
      status: 'open'
    }
  ];

  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    } as any);

    // Mock successful cohorts fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockCohorts
      })
    } as Response);

    jest.clearAllMocks();
  });

  describe('Component rendering', () => {
    it('renders enrollment form in Hebrew', async () => {
      render(<EnrollmentForm locale="he" />);

      await waitFor(() => {
        expect(screen.getByText('הרשמה לקורס')).toBeInTheDocument();
      });

      expect(screen.getByText('התחל את המסע שלך')).toBeInTheDocument();
    });

    it('renders enrollment form in English', async () => {
      render(<EnrollmentForm locale="en" />);

      await waitFor(() => {
        expect(screen.getByText('Course Enrollment')).toBeInTheDocument();
      });

      expect(screen.getByText('Start your journey')).toBeInTheDocument();
    });

    it('applies correct direction class', () => {
      const { container } = render(<EnrollmentForm locale="he" />);
      expect(container.firstChild).toHaveClass('rtl');
    });
  });

  describe('Step navigation', () => {
    it('shows step 1 (cohort selection) initially', async () => {
      render(<EnrollmentForm locale="en" />);

      await waitFor(() => {
        expect(screen.getByText('Select Cohort')).toBeInTheDocument();
      });

      expect(screen.getByText('DPNR Course - Spring 2024')).toBeInTheDocument();
      expect(screen.getByText('DPNR Course - Summer 2024')).toBeInTheDocument();
    });

    it('navigates to step 2 when cohort selected', async () => {
      const user = userEvent.setup();
      render(<EnrollmentForm locale="en" />);

      // Wait for cohorts to load
      await waitFor(() => {
        expect(screen.getByText('DPNR Course - Spring 2024')).toBeInTheDocument();
      });

      // Select first cohort
      const firstCohort = screen.getByText('DPNR Course - Spring 2024');
      await user.click(firstCohort);

      // Click continue
      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      expect(screen.getByText('Personal Information')).toBeInTheDocument();
    });

    it('shows progress indicators', async () => {
      render(<EnrollmentForm locale="en" />);

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument(); // Step 1
      });

      const progressSteps = screen.getAllByTestId(/step-/);
      expect(progressSteps).toHaveLength(5); // 5 steps total
    });
  });

  describe('Cohort selection', () => {
    it('displays cohort information correctly', async () => {
      render(<EnrollmentForm locale="en" />);

      await waitFor(() => {
        expect(screen.getByText('DPNR Course - Spring 2024')).toBeInTheDocument();
      });

      expect(screen.getByText('15 / 20 enrolled')).toBeInTheDocument();
      expect(screen.getByText('₪6,400')).toBeInTheDocument();
      expect(screen.getByText(/March 1, 2024/)).toBeInTheDocument();
    });

    it('shows availability status', async () => {
      render(<EnrollmentForm locale="en" />);

      await waitFor(() => {
        expect(screen.getByText('5 spots available')).toBeInTheDocument(); // 20-15=5
        expect(screen.getByText('17 spots available')).toBeInTheDocument(); // 25-8=17
      });
    });

    it('handles cohort selection', async () => {
      const user = userEvent.setup();
      render(<EnrollmentForm locale="en" />);

      await waitFor(() => {
        expect(screen.getByText('DPNR Course - Spring 2024')).toBeInTheDocument();
      });

      const cohortCard = screen.getByTestId('cohort-cohort-1');
      await user.click(cohortCard);

      expect(cohortCard).toHaveClass('ring-2', 'ring-blue-500');
    });
  });

  describe('Personal information step', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<EnrollmentForm locale="en" />);

      // Navigate to step 2
      await waitFor(() => {
        expect(screen.getByText('DPNR Course - Spring 2024')).toBeInTheDocument();
      });

      const firstCohort = screen.getByTestId('cohort-cohort-1');
      await user.click(firstCohort);

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText('Personal Information')).toBeInTheDocument();
      });
    });

    it('renders personal information form', () => {
      expect(screen.getByPlaceholderText('Full name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Phone number')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Emergency contact name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Emergency contact phone')).toBeInTheDocument();
    });

    it('validates required fields', async () => {
      const user = userEvent.setup();
      const continueButton = screen.getByRole('button', { name: /continue/i });

      await user.click(continueButton);

      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Phone is required')).toBeInTheDocument();
    });

    it('validates email format', async () => {
      const user = userEvent.setup();
      const emailInput = screen.getByPlaceholderText('Email address');
      const continueButton = screen.getByRole('button', { name: /continue/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(continueButton);

      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    });

    it('validates phone number format', async () => {
      const user = userEvent.setup();
      const phoneInput = screen.getByPlaceholderText('Phone number');
      const continueButton = screen.getByRole('button', { name: /continue/i });

      await user.type(phoneInput, 'invalid-phone');
      await user.click(continueButton);

      expect(screen.getByText('Invalid phone number format')).toBeInTheDocument();
    });
  });

  describe('Payment plan selection', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<EnrollmentForm locale="en" />);

      // Navigate through steps to payment plan
      await waitFor(() => {
        expect(screen.getByText('DPNR Course - Spring 2024')).toBeInTheDocument();
      });

      // Step 1: Select cohort
      const firstCohort = screen.getByTestId('cohort-cohort-1');
      await user.click(firstCohort);
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 2: Fill personal info
      await waitFor(() => {
        expect(screen.getByText('Personal Information')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('Full name'), 'John Doe');
      await user.type(screen.getByPlaceholderText('Email address'), 'john@example.com');
      await user.type(screen.getByPlaceholderText('Phone number'), '+972501234567');
      await user.type(screen.getByPlaceholderText('Emergency contact name'), 'Jane Doe');
      await user.type(screen.getByPlaceholderText('Emergency contact phone'), '+972501234568');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 3: Fill questionnaire
      await waitFor(() => {
        expect(screen.getByText('Questionnaire')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText(/what motivates you/i), 'Personal growth');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Should now be on payment plan step
      await waitFor(() => {
        expect(screen.getByText('Payment Plan')).toBeInTheDocument();
      });
    });

    it('displays payment plan options', () => {
      expect(screen.getByText('Full Payment')).toBeInTheDocument();
      expect(screen.getByText('₪6,400')).toBeInTheDocument();
      expect(screen.getByText('5 Installments')).toBeInTheDocument();
      expect(screen.getByText('₪1,500 + 4×₪1,225')).toBeInTheDocument();
      expect(screen.getByText('12 Installments')).toBeInTheDocument();
      expect(screen.getByText('₪800 + 11×₪509')).toBeInTheDocument();
    });

    it('allows payment plan selection', async () => {
      const user = userEvent.setup();
      const installmentPlan = screen.getByTestId('payment-plan-5_installments');

      await user.click(installmentPlan);

      expect(installmentPlan).toHaveClass('ring-2', 'ring-blue-500');
    });

    it('shows installment details', async () => {
      const user = userEvent.setup();
      const installmentPlan = screen.getByTestId('payment-plan-5_installments');

      await user.click(installmentPlan);

      expect(screen.getByText('First payment: ₪1,500')).toBeInTheDocument();
      expect(screen.getByText('4 monthly payments of ₪1,225')).toBeInTheDocument();
    });
  });

  describe('Form submission', () => {
    it('submits enrollment successfully', async () => {
      const user = userEvent.setup();

      // Mock successful enrollment submission
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockCohorts })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { id: 'enrollment-123', paymentUrl: 'https://payment.url' }
          })
        } as Response);

      render(<EnrollmentForm locale="en" />);

      // Complete the entire form
      await waitFor(() => {
        expect(screen.getByText('DPNR Course - Spring 2024')).toBeInTheDocument();
      });

      // Step 1: Select cohort
      const firstCohort = screen.getByTestId('cohort-cohort-1');
      await user.click(firstCohort);
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 2: Personal info
      await waitFor(() => {
        expect(screen.getByText('Personal Information')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('Full name'), 'John Doe');
      await user.type(screen.getByPlaceholderText('Email address'), 'john@example.com');
      await user.type(screen.getByPlaceholderText('Phone number'), '+972501234567');
      await user.type(screen.getByPlaceholderText('Emergency contact name'), 'Jane Doe');
      await user.type(screen.getByPlaceholderText('Emergency contact phone'), '+972501234568');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 3: Questionnaire
      await waitFor(() => {
        expect(screen.getByText('Questionnaire')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText(/what motivates you/i), 'Personal growth');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 4: Payment plan
      await waitFor(() => {
        expect(screen.getByText('Payment Plan')).toBeInTheDocument();
      });

      const fullPaymentPlan = screen.getByTestId('payment-plan-full');
      await user.click(fullPaymentPlan);
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 5: Confirmation and submit
      await waitFor(() => {
        expect(screen.getByText('Confirmation')).toBeInTheDocument();
      });

      const gdprCheckbox = screen.getByRole('checkbox', { name: /i agree to the processing/i });
      await user.click(gdprCheckbox);

      const submitButton = screen.getByRole('button', { name: /complete enrollment/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/enrollments', expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('john@example.com')
        }));
      });
    });

    it('handles submission errors', async () => {
      const user = userEvent.setup();

      // Mock error response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockCohorts })
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            success: false,
            error: 'Enrollment failed'
          })
        } as Response);

      render(<EnrollmentForm locale="en" />);

      // Go through the form quickly for error testing
      await waitFor(() => {
        expect(screen.getByText('DPNR Course - Spring 2024')).toBeInTheDocument();
      });

      // Complete form steps...
      const firstCohort = screen.getByTestId('cohort-cohort-1');
      await user.click(firstCohort);
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText('Personal Information')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('Full name'), 'John Doe');
      await user.type(screen.getByPlaceholderText('Email address'), 'john@example.com');
      await user.type(screen.getByPlaceholderText('Phone number'), '+972501234567');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText('Questionnaire')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText(/what motivates you/i), 'Growth');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText('Payment Plan')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('payment-plan-full'));
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText('Confirmation')).toBeInTheDocument();
      });

      const gdprCheckbox = screen.getByRole('checkbox', { name: /i agree to the processing/i });
      await user.click(gdprCheckbox);

      const submitButton = screen.getByRole('button', { name: /complete enrollment/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Enrollment failed')).toBeInTheDocument();
      });
    });
  });

  describe('Pre-selection from URL', () => {
    it('pre-selects cohort from URL parameter', async () => {
      // Mock URL search params
      Object.defineProperty(window, 'location', {
        value: {
          search: '?cohort=cohort-2'
        },
        writable: true
      });

      render(<EnrollmentForm locale="en" />);

      await waitFor(() => {
        const preselectedCohort = screen.getByTestId('cohort-cohort-2');
        expect(preselectedCohort).toHaveClass('ring-2', 'ring-blue-500');
      });
    });
  });
});