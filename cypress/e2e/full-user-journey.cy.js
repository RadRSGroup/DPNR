/**
 * Full User Journey End-to-End Tests
 * DPNR Course Registration Platform
 *
 * Tests complete user flows from landing page through payment confirmation
 * Validates both Hebrew and English language support
 * Tests all 3 payment plan options
 * Includes error recovery scenarios
 */

describe('DPNR Registration Platform - Full User Journey', () => {
  const testUser = {
    firstName: 'Test',
    lastName: 'User',
    email: `test.user.${Date.now()}@example.com`,
    phone: '+972-50-123-4567',
    password: 'TestPassword123!',
    emergencyContact: 'Emergency Contact',
    emergencyPhone: '+972-50-123-4568'
  };

  beforeEach(() => {
    // Set viewport for responsive testing
    cy.viewport(1280, 720);

    // Clear any existing session data
    cy.clearCookies();
    cy.clearLocalStorage();

    // Visit home page
    cy.visit('/');
  });

  describe('Landing Page to Registration Journey', () => {
    it('should complete full registration flow in Hebrew', () => {
      // Step 1: Landing page interaction
      cy.get('[data-testid="language-toggle"]').click();
      cy.get('[data-testid="language-he"]').click();

      // Verify Hebrew content is loaded
      cy.get('html').should('have.attr', 'dir', 'rtl');
      cy.contains('המסע שלך מתחיל עכשיו').should('be.visible');

      // Click main CTA button
      cy.get('[data-testid="hero-cta-button"]').click();

      // Step 2: Registration form
      cy.url().should('include', '/register');

      cy.get('[data-testid="register-form"]').should('be.visible');
      cy.get('[data-testid="first-name-input"]').type(testUser.firstName);
      cy.get('[data-testid="last-name-input"]').type(testUser.lastName);
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="phone-input"]').type(testUser.phone);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="confirm-password-input"]').type(testUser.password);

      // Accept terms and privacy policy
      cy.get('[data-testid="terms-checkbox"]').check();
      cy.get('[data-testid="privacy-checkbox"]').check();

      // Submit registration
      cy.get('[data-testid="register-submit-button"]').click();

      // Step 3: Verify registration success
      cy.url().should('include', '/registration-success');
      cy.contains('רישום הושלם בהצלחה').should('be.visible');
    });

    it('should complete full registration flow in English', () => {
      // Step 1: Landing page in English
      cy.get('[data-testid="language-toggle"]').click();
      cy.get('[data-testid="language-en"]').click();

      // Verify English content
      cy.get('html').should('have.attr', 'dir', 'ltr');
      cy.contains('Your Journey Starts Now').should('be.visible');

      // Click main CTA button
      cy.get('[data-testid="hero-cta-button"]').click();

      // Step 2: Complete registration in English
      cy.url().should('include', '/en/register');

      cy.get('[data-testid="register-form"]').should('be.visible');
      cy.get('[data-testid="first-name-input"]').type(testUser.firstName);
      cy.get('[data-testid="last-name-input"]').type(testUser.lastName);
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="phone-input"]').type(testUser.phone);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="confirm-password-input"]').type(testUser.password);

      cy.get('[data-testid="terms-checkbox"]').check();
      cy.get('[data-testid="privacy-checkbox"]').check();

      cy.get('[data-testid="register-submit-button"]').click();

      // Verify success message in English
      cy.url().should('include', '/en/registration-success');
      cy.contains('Registration Completed Successfully').should('be.visible');
    });
  });

  describe('Login to Enrollment Journey', () => {
    beforeEach(() => {
      // Assume user is already registered
      cy.visit('/login');
    });

    it('should complete login and navigate to enrollment', () => {
      // Step 1: Login
      cy.get('[data-testid="login-form"]').should('be.visible');
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="login-submit-button"]').click();

      // Step 2: Navigate to enrollment
      cy.url().should('include', '/dashboard');
      cy.get('[data-testid="enroll-button"]').click();

      // Step 3: Verify enrollment page
      cy.url().should('include', '/enroll');
      cy.get('[data-testid="enrollment-form"]').should('be.visible');
    });

    it('should handle login errors gracefully', () => {
      // Test with invalid credentials
      cy.get('[data-testid="email-input"]').type('invalid@example.com');
      cy.get('[data-testid="password-input"]').type('WrongPassword123!');
      cy.get('[data-testid="login-submit-button"]').click();

      // Verify error message
      cy.get('[data-testid="login-error"]').should('be.visible');
      cy.contains('Invalid credentials').should('be.visible');

      // Verify user stays on login page
      cy.url().should('include', '/login');
    });
  });

  describe('Enrollment to Payment Journey', () => {
    beforeEach(() => {
      // Mock authenticated user session
      cy.window().then((win) => {
        win.localStorage.setItem('auth_token', 'mock-jwt-token');
        win.localStorage.setItem('user', JSON.stringify({
          id: 'test-user-id',
          email: testUser.email,
          firstName: testUser.firstName,
          lastName: testUser.lastName
        }));
      });

      cy.visit('/enroll');
    });

    it('should complete enrollment form with full payment plan', () => {
      // Step 1: Fill enrollment form
      cy.get('[data-testid="enrollment-form"]').should('be.visible');

      // Personal information
      cy.get('[data-testid="emergency-contact-input"]').type(testUser.emergencyContact);
      cy.get('[data-testid="emergency-phone-input"]').type(testUser.emergencyPhone);

      // Questionnaire
      cy.get('[data-testid="motivation-textarea"]').type('I want to improve my personal development skills and build better relationships.');
      cy.get('[data-testid="experience-select"]').select('Beginner');
      cy.get('[data-testid="goals-textarea"]').type('Better communication, self-awareness, and leadership skills.');

      // Payment plan selection
      cy.get('[data-testid="payment-plan-full"]').click();

      // Verify full payment amount
      cy.get('[data-testid="payment-amount"]').should('contain', '₪6,400');

      // Submit enrollment
      cy.get('[data-testid="enrollment-submit-button"]').click();

      // Step 2: Navigate to payment
      cy.url().should('include', '/payment');
      cy.get('[data-testid="payment-form"]').should('be.visible');

      // Verify enrollment details
      cy.get('[data-testid="enrollment-summary"]').should('contain', testUser.firstName);
      cy.get('[data-testid="payment-plan-display"]').should('contain', 'Full Payment');
      cy.get('[data-testid="total-amount"]').should('contain', '₪6,400');
    });

    it('should complete enrollment form with 5 installments plan', () => {
      cy.get('[data-testid="enrollment-form"]').should('be.visible');

      // Fill required fields
      cy.get('[data-testid="emergency-contact-input"]').type(testUser.emergencyContact);
      cy.get('[data-testid="emergency-phone-input"]').type(testUser.emergencyPhone);
      cy.get('[data-testid="motivation-textarea"]').type('Personal growth motivation');
      cy.get('[data-testid="experience-select"]').select('Intermediate');
      cy.get('[data-testid="goals-textarea"]').type('Specific development goals');

      // Select 5 installments
      cy.get('[data-testid="payment-plan-five-installments"]').click();

      // Verify installment details
      cy.get('[data-testid="installment-amount"]').should('contain', '₪1,360');
      cy.get('[data-testid="installment-count"]').should('contain', '5');

      cy.get('[data-testid="enrollment-submit-button"]').click();

      cy.url().should('include', '/payment');
      cy.get('[data-testid="payment-plan-display"]').should('contain', '5 Installments');
    });

    it('should complete enrollment form with 12 installments plan', () => {
      cy.get('[data-testid="enrollment-form"]').should('be.visible');

      // Fill required fields
      cy.get('[data-testid="emergency-contact-input"]').type(testUser.emergencyContact);
      cy.get('[data-testid="emergency-phone-input"]').type(testUser.emergencyPhone);
      cy.get('[data-testid="motivation-textarea"]').type('Long-term development goals');
      cy.get('[data-testid="experience-select"]').select('Advanced');
      cy.get('[data-testid="goals-textarea"]').type('Comprehensive skill development');

      // Select 12 installments
      cy.get('[data-testid="payment-plan-twelve-installments"]').click();

      // Verify installment details
      cy.get('[data-testid="installment-amount"]').should('contain', '₪580');
      cy.get('[data-testid="installment-count"]').should('contain', '12');

      cy.get('[data-testid="enrollment-submit-button"]').click();

      cy.url().should('include', '/payment');
      cy.get('[data-testid="payment-plan-display"]').should('contain', '12 Installments');
    });

    it('should validate required fields', () => {
      // Try to submit without filling required fields
      cy.get('[data-testid="enrollment-submit-button"]').click();

      // Verify validation errors
      cy.get('[data-testid="emergency-contact-error"]').should('be.visible');
      cy.get('[data-testid="emergency-phone-error"]').should('be.visible');
      cy.get('[data-testid="motivation-error"]').should('be.visible');
      cy.get('[data-testid="goals-error"]').should('be.visible');

      // Verify form doesn't submit
      cy.url().should('include', '/enroll');
    });
  });

  describe('Payment to Confirmation Journey', () => {
    beforeEach(() => {
      // Mock authenticated user with enrollment
      cy.window().then((win) => {
        win.localStorage.setItem('auth_token', 'mock-jwt-token');
        win.localStorage.setItem('user', JSON.stringify({
          id: 'test-user-id',
          email: testUser.email,
          firstName: testUser.firstName,
          lastName: testUser.lastName
        }));
        win.localStorage.setItem('enrollment', JSON.stringify({
          id: 'test-enrollment-id',
          paymentPlan: 'FULL',
          totalAmount: 6400
        }));
      });

      cy.visit('/payment');
    });

    it('should complete payment flow successfully', () => {
      // Step 1: Verify payment page
      cy.get('[data-testid="payment-form"]').should('be.visible');
      cy.get('[data-testid="enrollment-summary"]').should('be.visible');

      // Mock payment form interaction (Tranzila iframe would be tested separately)
      cy.get('[data-testid="payment-submit-button"]').click();

      // Step 2: Mock successful payment response
      cy.intercept('POST', '**/api/v1/payments/process', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            transactionId: 'test-transaction-id',
            status: 'SUCCESS',
            enrollmentId: 'test-enrollment-id'
          }
        }
      });

      // Step 3: Verify redirect to confirmation
      cy.url().should('include', '/confirmation');
      cy.get('[data-testid="confirmation-message"]').should('be.visible');
      cy.contains('Payment Successful').should('be.visible');

      // Verify enrollment status updated
      cy.get('[data-testid="enrollment-status"]').should('contain', 'Active');
    });

    it('should handle payment failure gracefully', () => {
      // Mock payment failure
      cy.intercept('POST', '**/api/v1/payments/process', {
        statusCode: 400,
        body: {
          success: false,
          error: 'Payment failed - insufficient funds'
        }
      });

      cy.get('[data-testid="payment-submit-button"]').click();

      // Verify error handling
      cy.get('[data-testid="payment-error"]').should('be.visible');
      cy.contains('Payment failed').should('be.visible');

      // Verify user stays on payment page
      cy.url().should('include', '/payment');

      // Verify retry option is available
      cy.get('[data-testid="payment-retry-button"]').should('be.visible');
    });

    it('should handle network errors during payment', () => {
      // Mock network error
      cy.intercept('POST', '**/api/v1/payments/process', { forceNetworkError: true });

      cy.get('[data-testid="payment-submit-button"]').click();

      // Verify network error handling
      cy.get('[data-testid="network-error"]').should('be.visible');
      cy.contains('Network error').should('be.visible');

      // Verify retry mechanism
      cy.get('[data-testid="retry-button"]').should('be.visible');
    });
  });

  describe('Responsive Design and Mobile Journey', () => {
    const mobileViewports = [
      { device: 'iPhone SE', width: 375, height: 667 },
      { device: 'iPhone 12', width: 390, height: 844 },
      { device: 'Samsung Galaxy', width: 360, height: 640 }
    ];

    mobileViewports.forEach(viewport => {
      it(`should work correctly on ${viewport.device}`, () => {
        cy.viewport(viewport.width, viewport.height);

        // Test landing page on mobile
        cy.visit('/');
        cy.get('[data-testid="mobile-menu-button"]').should('be.visible');
        cy.get('[data-testid="hero-cta-button"]').should('be.visible');

        // Test navigation menu
        cy.get('[data-testid="mobile-menu-button"]').click();
        cy.get('[data-testid="mobile-menu"]').should('be.visible');
        cy.get('[data-testid="mobile-menu-register"]').click();

        // Test registration form on mobile
        cy.url().should('include', '/register');
        cy.get('[data-testid="register-form"]').should('be.visible');

        // Verify form fields are properly sized
        cy.get('[data-testid="first-name-input"]').should('be.visible');
        cy.get('[data-testid="email-input"]').should('be.visible');

        // Test form submission on mobile
        cy.get('[data-testid="first-name-input"]').type(testUser.firstName);
        cy.get('[data-testid="last-name-input"]').type(testUser.lastName);
        cy.get('[data-testid="email-input"]').type(testUser.email);
        cy.get('[data-testid="phone-input"]').type(testUser.phone);
        cy.get('[data-testid="password-input"]').type(testUser.password);
        cy.get('[data-testid="confirm-password-input"]').type(testUser.password);

        cy.get('[data-testid="terms-checkbox"]').check();
        cy.get('[data-testid="privacy-checkbox"]').check();

        cy.get('[data-testid="register-submit-button"]').click();

        // Verify success page works on mobile
        cy.url().should('include', '/registration-success');
      });
    });
  });

  describe('Accessibility and Hebrew RTL Support', () => {
    it('should have proper ARIA labels and accessibility features', () => {
      cy.visit('/');

      // Check main navigation accessibility
      cy.get('nav').should('have.attr', 'role', 'navigation');
      cy.get('[data-testid="hero-cta-button"]').should('have.attr', 'aria-label');

      // Check form accessibility
      cy.visit('/register');
      cy.get('[data-testid="register-form"]').should('have.attr', 'role', 'form');
      cy.get('[data-testid="first-name-input"]').should('have.attr', 'aria-label');
      cy.get('[data-testid="email-input"]').should('have.attr', 'aria-required', 'true');

      // Check error message accessibility
      cy.get('[data-testid="register-submit-button"]').click();
      cy.get('[data-testid="validation-errors"]').should('have.attr', 'role', 'alert');
    });

    it('should properly support Hebrew RTL layout', () => {
      cy.visit('/');

      // Switch to Hebrew
      cy.get('[data-testid="language-toggle"]').click();
      cy.get('[data-testid="language-he"]').click();

      // Verify RTL attributes
      cy.get('html').should('have.attr', 'dir', 'rtl');
      cy.get('html').should('have.attr', 'lang', 'he');

      // Verify Hebrew content
      cy.contains('DPNR - פיתוח אישיותי').should('be.visible');
      cy.contains('המסע שלך מתחיל עכשיו').should('be.visible');

      // Verify RTL-specific styling
      cy.get('[data-testid="hero-section"]').should('have.css', 'direction', 'rtl');

      // Test form in Hebrew
      cy.get('[data-testid="hero-cta-button"]').click();

      cy.url().should('include', '/he/register');
      cy.get('[data-testid="register-form"]').should('have.css', 'direction', 'rtl');

      // Verify Hebrew form labels
      cy.contains('שם פרטי').should('be.visible');
      cy.contains('כתובת אימייל').should('be.visible');
      cy.contains('מספר טלפון').should('be.visible');
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should recover from network interruptions', () => {
      cy.visit('/register');

      // Fill form
      cy.get('[data-testid="first-name-input"]').type(testUser.firstName);
      cy.get('[data-testid="last-name-input"]').type(testUser.lastName);
      cy.get('[data-testid="email-input"]').type(testUser.email);

      // Mock network failure during form submission
      cy.intercept('POST', '**/api/v1/auth/register', { forceNetworkError: true });

      cy.get('[data-testid="register-submit-button"]').click();

      // Verify error message
      cy.get('[data-testid="network-error"]').should('be.visible');

      // Verify form data is preserved
      cy.get('[data-testid="first-name-input"]').should('have.value', testUser.firstName);
      cy.get('[data-testid="last-name-input"]').should('have.value', testUser.lastName);
      cy.get('[data-testid="email-input"]').should('have.value', testUser.email);

      // Mock successful retry
      cy.intercept('POST', '**/api/v1/auth/register', {
        statusCode: 201,
        body: { success: true, data: { id: 'test-user-id' } }
      });

      cy.get('[data-testid="retry-button"]').click();

      // Verify successful registration
      cy.url().should('include', '/registration-success');
    });

    it('should handle session expiration during enrollment', () => {
      // Mock authenticated session
      cy.window().then((win) => {
        win.localStorage.setItem('auth_token', 'expired-jwt-token');
      });

      cy.visit('/enroll');

      // Mock session expiration response
      cy.intercept('POST', '**/api/v1/enrollments', {
        statusCode: 401,
        body: { success: false, error: 'Token expired' }
      });

      // Fill enrollment form
      cy.get('[data-testid="emergency-contact-input"]').type(testUser.emergencyContact);
      cy.get('[data-testid="emergency-phone-input"]').type(testUser.emergencyPhone);
      cy.get('[data-testid="motivation-textarea"]').type('Test motivation');
      cy.get('[data-testid="experience-select"]').select('Beginner');
      cy.get('[data-testid="goals-textarea"]').type('Test goals');
      cy.get('[data-testid="payment-plan-full"]').click();

      cy.get('[data-testid="enrollment-submit-button"]').click();

      // Verify redirect to login with return URL
      cy.url().should('include', '/login');
      cy.get('[data-testid="session-expired-message"]').should('be.visible');

      // Verify return URL is preserved
      cy.url().should('include', 'returnUrl=%2Fenroll');
    });

    it('should handle cohort capacity limits', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('auth_token', 'mock-jwt-token');
      });

      cy.visit('/enroll');

      // Mock cohort full response
      cy.intercept('POST', '**/api/v1/enrollments', {
        statusCode: 409,
        body: {
          success: false,
          error: 'Cohort is at full capacity',
          nextCohortDate: '2024-03-01'
        }
      });

      // Fill and submit enrollment form
      cy.get('[data-testid="emergency-contact-input"]').type(testUser.emergencyContact);
      cy.get('[data-testid="emergency-phone-input"]').type(testUser.emergencyPhone);
      cy.get('[data-testid="motivation-textarea"]').type('Test motivation');
      cy.get('[data-testid="experience-select"]').select('Beginner');
      cy.get('[data-testid="goals-textarea"]').type('Test goals');
      cy.get('[data-testid="payment-plan-full"]').click();

      cy.get('[data-testid="enrollment-submit-button"]').click();

      // Verify capacity error message
      cy.get('[data-testid="capacity-error"]').should('be.visible');
      cy.contains('Cohort is at full capacity').should('be.visible');
      cy.contains('Next available cohort: March 1, 2024').should('be.visible');

      // Verify waitlist option
      cy.get('[data-testid="join-waitlist-button"]').should('be.visible');
    });
  });

  describe('Data Persistence and State Management', () => {
    it('should persist form data across page refreshes', () => {
      cy.visit('/register');

      // Fill partial form data
      cy.get('[data-testid="first-name-input"]').type(testUser.firstName);
      cy.get('[data-testid="last-name-input"]').type(testUser.lastName);
      cy.get('[data-testid="email-input"]').type(testUser.email);

      // Refresh page
      cy.reload();

      // Verify form data is restored
      cy.get('[data-testid="first-name-input"]').should('have.value', testUser.firstName);
      cy.get('[data-testid="last-name-input"]').should('have.value', testUser.lastName);
      cy.get('[data-testid="email-input"]').should('have.value', testUser.email);
    });

    it('should maintain authentication state across page navigation', () => {
      // Mock login
      cy.window().then((win) => {
        win.localStorage.setItem('auth_token', 'valid-jwt-token');
        win.localStorage.setItem('user', JSON.stringify({
          id: 'test-user-id',
          email: testUser.email,
          firstName: testUser.firstName
        }));
      });

      cy.visit('/dashboard');

      // Verify authenticated state
      cy.get('[data-testid="user-menu"]').should('be.visible');
      cy.get('[data-testid="user-name"]').should('contain', testUser.firstName);

      // Navigate to different pages
      cy.visit('/enroll');
      cy.get('[data-testid="enrollment-form"]').should('be.visible');

      cy.visit('/profile');
      cy.get('[data-testid="profile-form"]').should('be.visible');

      // Verify user data persists
      cy.get('[data-testid="profile-email"]').should('contain', testUser.email);
    });
  });
});