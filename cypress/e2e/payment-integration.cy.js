/**
 * Payment Integration End-to-End Tests
 * DPNR Course Registration Platform
 *
 * Tests all payment scenarios including:
 * - All 3 payment plans with correct calculations
 * - Tranzila payment gateway integration
 * - Payment success and failure flows
 * - Webhook handling simulation
 * - Enrollment status updates after payment
 */

describe('Payment Integration Tests', () => {
  const testUser = {
    email: `payment.test.${Date.now()}@example.com`,
    firstName: 'Payment',
    lastName: 'Test',
    phone: '+972-50-123-4567'
  };

  const paymentPlans = [
    {
      id: 'FULL',
      name: 'Full Payment',
      amount: 6400,
      currency: '₪',
      description: 'One-time payment'
    },
    {
      id: 'FIVE_INSTALLMENTS',
      name: '5 Installments',
      amount: 1360,
      currency: '₪',
      installments: 5,
      total: 6800,
      description: 'Pay in 5 monthly installments'
    },
    {
      id: 'TWELVE_INSTALLMENTS',
      name: '12 Installments',
      amount: 580,
      currency: '₪',
      installments: 12,
      total: 6960,
      description: 'Pay in 12 monthly installments'
    }
  ];

  beforeEach(() => {
    // Mock authenticated user
    cy.window().then((win) => {
      win.localStorage.setItem('auth_token', 'mock-jwt-token');
      win.localStorage.setItem('user', JSON.stringify({
        id: 'payment-test-user',
        email: testUser.email,
        firstName: testUser.firstName,
        lastName: testUser.lastName
      }));
    });

    // Mock successful cohort data
    cy.intercept('GET', '**/api/v1/cohorts/current', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'test-cohort-id',
          name: 'DPNR Course - March 2024',
          startDate: '2024-03-01T00:00:00.000Z',
          endDate: '2024-05-01T00:00:00.000Z',
          maxCapacity: 20,
          currentEnrollment: 5,
          status: 'OPEN_ENROLLMENT',
          location: 'Mazkeret Batya',
          schedule: 'Weekly evenings, 1.5-2 hours'
        }
      }
    }).as('getCohort');
  });

  describe('Payment Plan Selection and Calculation', () => {
    paymentPlans.forEach(plan => {
      it(`should correctly calculate and display ${plan.name} payment details`, () => {
        cy.visit('/enroll');

        // Fill enrollment form
        cy.get('[data-testid="emergency-contact-input"]').type('Emergency Contact');
        cy.get('[data-testid="emergency-phone-input"]').type('+972-50-999-8888');
        cy.get('[data-testid="motivation-textarea"]').type('Motivation for personal growth');
        cy.get('[data-testid="experience-select"]').select('Beginner');
        cy.get('[data-testid="goals-textarea"]').type('Specific development goals');

        // Select payment plan
        cy.get(`[data-testid="payment-plan-${plan.id.toLowerCase().replace('_', '-')}"]`).click();

        // Verify payment plan details
        if (plan.installments) {
          cy.get('[data-testid="installment-amount"]')
            .should('contain', `${plan.currency}${plan.amount.toLocaleString()}`);
          cy.get('[data-testid="installment-count"]')
            .should('contain', plan.installments.toString());
          cy.get('[data-testid="total-amount"]')
            .should('contain', `${plan.currency}${plan.total.toLocaleString()}`);
        } else {
          cy.get('[data-testid="payment-amount"]')
            .should('contain', `${plan.currency}${plan.amount.toLocaleString()}`);
        }

        // Mock enrollment creation
        cy.intercept('POST', '**/api/v1/enrollments', {
          statusCode: 201,
          body: {
            success: true,
            data: {
              id: 'test-enrollment-id',
              paymentPlan: plan.id,
              totalAmount: plan.total || plan.amount,
              status: 'PENDING_PAYMENT'
            }
          }
        }).as('createEnrollment');

        // Submit enrollment
        cy.get('[data-testid="enrollment-submit-button"]').click();

        // Verify navigation to payment page
        cy.wait('@createEnrollment');
        cy.url().should('include', '/payment');

        // Verify payment page shows correct details
        cy.get('[data-testid="payment-plan-display"]').should('contain', plan.name);

        if (plan.installments) {
          cy.get('[data-testid="payment-details"]').should('contain', `${plan.installments} installments`);
          cy.get('[data-testid="first-payment-amount"]')
            .should('contain', `${plan.currency}${plan.amount.toLocaleString()}`);
        } else {
          cy.get('[data-testid="payment-amount"]')
            .should('contain', `${plan.currency}${plan.amount.toLocaleString()}`);
        }
      });
    });

    it('should validate payment plan selection is required', () => {
      cy.visit('/enroll');

      // Fill other required fields but skip payment plan
      cy.get('[data-testid="emergency-contact-input"]').type('Emergency Contact');
      cy.get('[data-testid="emergency-phone-input"]').type('+972-50-999-8888');
      cy.get('[data-testid="motivation-textarea"]').type('Motivation');
      cy.get('[data-testid="experience-select"]').select('Beginner');
      cy.get('[data-testid="goals-textarea"]').type('Goals');

      // Try to submit without selecting payment plan
      cy.get('[data-testid="enrollment-submit-button"]').click();

      // Verify validation error
      cy.get('[data-testid="payment-plan-error"]').should('be.visible');
      cy.get('[data-testid="payment-plan-error"]').should('contain', 'Please select a payment plan');
    });
  });

  describe('Payment Processing Flow', () => {
    beforeEach(() => {
      // Mock existing enrollment
      cy.window().then((win) => {
        win.localStorage.setItem('enrollment', JSON.stringify({
          id: 'test-enrollment-id',
          paymentPlan: 'FULL',
          totalAmount: 6400,
          status: 'PENDING_PAYMENT'
        }));
      });

      cy.visit('/payment');
    });

    it('should display payment form with correct details', () => {
      cy.get('[data-testid="payment-form"]').should('be.visible');
      cy.get('[data-testid="enrollment-summary"]').should('be.visible');
      cy.get('[data-testid="payment-amount"]').should('contain', '₪6,400');
      cy.get('[data-testid="user-details"]').should('contain', testUser.firstName);
    });

    it('should handle successful payment processing', () => {
      // Mock successful payment response
      cy.intercept('POST', '**/api/v1/payments/process', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            transactionId: 'txn_123456789',
            status: 'SUCCESS',
            amount: 6400,
            currency: 'ILS',
            paymentMethod: 'CREDIT_CARD',
            enrollmentId: 'test-enrollment-id',
            processedAt: new Date().toISOString()
          }
        }
      }).as('processPayment');

      // Mock enrollment update
      cy.intercept('PUT', '**/api/v1/enrollments/test-enrollment-id/status', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: 'test-enrollment-id',
            status: 'ACTIVE'
          }
        }
      }).as('updateEnrollment');

      // Click payment button
      cy.get('[data-testid="payment-submit-button"]').click();

      // Verify loading state
      cy.get('[data-testid="payment-loading"]').should('be.visible');
      cy.get('[data-testid="payment-submit-button"]').should('be.disabled');

      // Wait for payment processing
      cy.wait('@processPayment');
      cy.wait('@updateEnrollment');

      // Verify redirect to confirmation page
      cy.url().should('include', '/confirmation');
      cy.get('[data-testid="payment-success-message"]').should('be.visible');
      cy.get('[data-testid="transaction-id"]').should('contain', 'txn_123456789');
      cy.get('[data-testid="enrollment-status"]').should('contain', 'Active');
    });

    it('should handle payment failure gracefully', () => {
      // Mock payment failure
      cy.intercept('POST', '**/api/v1/payments/process', {
        statusCode: 400,
        body: {
          success: false,
          error: 'Payment failed - insufficient funds',
          errorCode: 'INSUFFICIENT_FUNDS',
          details: {
            tranzilaError: 'Card declined by issuer'
          }
        }
      }).as('processPayment');

      cy.get('[data-testid="payment-submit-button"]').click();

      cy.wait('@processPayment');

      // Verify error display
      cy.get('[data-testid="payment-error"]').should('be.visible');
      cy.get('[data-testid="payment-error"]').should('contain', 'Payment failed');
      cy.get('[data-testid="payment-error-details"]').should('contain', 'insufficient funds');

      // Verify user stays on payment page
      cy.url().should('include', '/payment');

      // Verify retry option is available
      cy.get('[data-testid="payment-retry-button"]').should('be.visible');
      cy.get('[data-testid="payment-retry-button"]').should('not.be.disabled');

      // Test retry functionality
      cy.get('[data-testid="payment-retry-button"]').click();

      // Verify form is reset for retry
      cy.get('[data-testid="payment-submit-button"]').should('be.visible');
      cy.get('[data-testid="payment-submit-button"]').should('not.be.disabled');
    });

    it('should handle network errors during payment', () => {
      // Mock network error
      cy.intercept('POST', '**/api/v1/payments/process', { forceNetworkError: true }).as('processPayment');

      cy.get('[data-testid="payment-submit-button"]').click();

      // Verify network error handling
      cy.get('[data-testid="network-error"]').should('be.visible');
      cy.contains('Network connection error').should('be.visible');

      // Verify retry mechanism
      cy.get('[data-testid="retry-payment-button"]').should('be.visible');

      // Test network retry
      cy.intercept('POST', '**/api/v1/payments/process', {
        statusCode: 200,
        body: {
          success: true,
          data: { transactionId: 'txn_retry_success', status: 'SUCCESS' }
        }
      }).as('processPaymentRetry');

      cy.get('[data-testid="retry-payment-button"]').click();

      cy.wait('@processPaymentRetry');
      cy.url().should('include', '/confirmation');
    });

    it('should handle payment timeout scenarios', () => {
      // Mock slow payment response (timeout simulation)
      cy.intercept('POST', '**/api/v1/payments/process', (req) => {
        req.reply((resolve) => {
          setTimeout(() => {
            resolve({
              statusCode: 408,
              body: {
                success: false,
                error: 'Payment processing timeout',
                errorCode: 'TIMEOUT'
              }
            });
          }, 30000); // 30 second delay
        });
      }).as('processPayment');

      cy.get('[data-testid="payment-submit-button"]').click();

      // Wait for timeout error (with increased Cypress timeout)
      cy.wait('@processPayment', { timeout: 35000 });

      // Verify timeout error handling
      cy.get('[data-testid="payment-timeout-error"]').should('be.visible');
      cy.contains('Payment processing timed out').should('be.visible');

      // Verify user can retry or go back
      cy.get('[data-testid="retry-payment-button"]').should('be.visible');
      cy.get('[data-testid="back-to-enrollment-button"]').should('be.visible');
    });
  });

  describe('Tranzila Integration Simulation', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('enrollment', JSON.stringify({
          id: 'test-enrollment-id',
          paymentPlan: 'FULL',
          totalAmount: 6400
        }));
      });

      cy.visit('/payment');
    });

    it('should load Tranzila payment iframe correctly', () => {
      // Verify iframe container exists
      cy.get('[data-testid="tranzila-iframe-container"]').should('be.visible');

      // Mock iframe load
      cy.window().then((win) => {
        const iframe = win.document.querySelector('[data-testid="tranzila-payment-iframe"]');
        if (iframe) {
          // Simulate iframe loaded event
          iframe.dispatchEvent(new Event('load'));
        }
      });

      // Verify iframe loaded successfully
      cy.get('[data-testid="iframe-loading"]').should('not.exist');
      cy.get('[data-testid="payment-iframe-ready"]').should('be.visible');
    });

    it('should handle Tranzila iframe communication', () => {
      // Mock postMessage from Tranzila iframe
      cy.window().then((win) => {
        // Simulate successful payment message from iframe
        win.postMessage({
          type: 'TRANZILA_PAYMENT_SUCCESS',
          data: {
            tranzilaResponse: 'OK',
            transactionId: 'txn_tranzila_123',
            amount: 6400,
            currency: 'ILS'
          }
        }, '*');
      });

      // Verify payment success handling
      cy.get('[data-testid="payment-processing"]').should('be.visible');

      // Mock backend confirmation
      cy.intercept('POST', '**/api/v1/payments/confirm', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            transactionId: 'txn_tranzila_123',
            status: 'CONFIRMED'
          }
        }
      }).as('confirmPayment');

      cy.wait('@confirmPayment');
      cy.url().should('include', '/confirmation');
    });

    it('should handle Tranzila payment cancellation', () => {
      cy.window().then((win) => {
        // Simulate payment cancellation message from iframe
        win.postMessage({
          type: 'TRANZILA_PAYMENT_CANCELLED',
          data: {
            reason: 'USER_CANCELLED'
          }
        }, '*');
      });

      // Verify cancellation handling
      cy.get('[data-testid="payment-cancelled-message"]').should('be.visible');
      cy.contains('Payment was cancelled').should('be.visible');

      // Verify user can try again
      cy.get('[data-testid="try-payment-again-button"]').should('be.visible');
      cy.get('[data-testid="back-to-enrollment-button"]').should('be.visible');
    });
  });

  describe('Payment Webhooks and Status Updates', () => {
    it('should handle payment webhook simulation', () => {
      // Mock enrollment with pending payment
      cy.intercept('GET', '**/api/v1/enrollments/test-enrollment-id', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: 'test-enrollment-id',
            status: 'PENDING_PAYMENT',
            paymentPlan: 'FULL',
            totalAmount: 6400
          }
        }
      }).as('getEnrollment');

      cy.visit('/dashboard');

      cy.wait('@getEnrollment');

      // Verify pending status
      cy.get('[data-testid="enrollment-status"]').should('contain', 'Pending Payment');

      // Simulate webhook processing (payment confirmed)
      cy.intercept('GET', '**/api/v1/enrollments/test-enrollment-id', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: 'test-enrollment-id',
            status: 'ACTIVE',
            paymentPlan: 'FULL',
            totalAmount: 6400,
            paidAmount: 6400
          }
        }
      }).as('getUpdatedEnrollment');

      // Trigger status refresh (simulate real-time update or page refresh)
      cy.get('[data-testid="refresh-status-button"]').click();

      cy.wait('@getUpdatedEnrollment');

      // Verify status updated to active
      cy.get('[data-testid="enrollment-status"]').should('contain', 'Active');
      cy.get('[data-testid="payment-status"]').should('contain', 'Completed');
    });

    it('should handle partial payment scenarios for installments', () => {
      // Mock enrollment with installment plan
      cy.intercept('GET', '**/api/v1/enrollments/installment-enrollment-id', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: 'installment-enrollment-id',
            status: 'ACTIVE',
            paymentPlan: 'FIVE_INSTALLMENTS',
            totalAmount: 6800,
            paidAmount: 1360, // First installment paid
            payments: [
              {
                id: 'payment-1',
                amount: 1360,
                status: 'SUCCESS',
                installmentNumber: 1,
                processedAt: '2024-03-01T00:00:00.000Z'
              }
            ]
          }
        }
      }).as('getInstallmentEnrollment');

      cy.window().then((win) => {
        win.localStorage.setItem('enrollment', JSON.stringify({
          id: 'installment-enrollment-id'
        }));
      });

      cy.visit('/dashboard');

      cy.wait('@getInstallmentEnrollment');

      // Verify installment payment status
      cy.get('[data-testid="enrollment-status"]').should('contain', 'Active');
      cy.get('[data-testid="payment-progress"]').should('be.visible');
      cy.get('[data-testid="paid-amount"]').should('contain', '₪1,360');
      cy.get('[data-testid="remaining-amount"]').should('contain', '₪5,440');

      // Verify next payment due date
      cy.get('[data-testid="next-payment-due"]').should('be.visible');
      cy.get('[data-testid="pay-next-installment-button"]').should('be.visible');
    });
  });

  describe('Payment Security and Validation', () => {
    it('should validate payment amount matches enrollment', () => {
      // Mock enrollment with specific amount
      cy.window().then((win) => {
        win.localStorage.setItem('enrollment', JSON.stringify({
          id: 'test-enrollment-id',
          paymentPlan: 'FULL',
          totalAmount: 6400
        }));
      });

      cy.visit('/payment');

      // Mock payment attempt with different amount
      cy.intercept('POST', '**/api/v1/payments/process', {
        statusCode: 400,
        body: {
          success: false,
          error: 'Payment amount mismatch',
          errorCode: 'AMOUNT_MISMATCH'
        }
      }).as('processPayment');

      cy.get('[data-testid="payment-submit-button"]').click();

      cy.wait('@processPayment');

      // Verify security error handling
      cy.get('[data-testid="payment-security-error"]').should('be.visible');
      cy.contains('Payment amount mismatch').should('be.visible');
    });

    it('should prevent duplicate payment submissions', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('enrollment', JSON.stringify({
          id: 'test-enrollment-id',
          paymentPlan: 'FULL',
          totalAmount: 6400
        }));
      });

      cy.visit('/payment');

      // Mock slow payment processing
      cy.intercept('POST', '**/api/v1/payments/process', (req) => {
        req.reply((resolve) => {
          setTimeout(() => {
            resolve({
              statusCode: 200,
              body: {
                success: true,
                data: { transactionId: 'txn_slow_success', status: 'SUCCESS' }
              }
            });
          }, 2000);
        });
      }).as('processPayment');

      // First click
      cy.get('[data-testid="payment-submit-button"]').click();

      // Verify button is disabled immediately
      cy.get('[data-testid="payment-submit-button"]').should('be.disabled');

      // Try to click again (should not trigger another request)
      cy.get('[data-testid="payment-submit-button"]').click();

      // Verify only one payment request was made
      cy.get('@processPayment.all').should('have.length', 1);
    });

    it('should handle expired enrollment sessions', () => {
      // Mock enrollment with expired session
      cy.intercept('POST', '**/api/v1/payments/process', {
        statusCode: 401,
        body: {
          success: false,
          error: 'Enrollment session expired',
          errorCode: 'SESSION_EXPIRED'
        }
      }).as('processPayment');

      cy.window().then((win) => {
        win.localStorage.setItem('enrollment', JSON.stringify({
          id: 'expired-enrollment-id',
          paymentPlan: 'FULL',
          totalAmount: 6400
        }));
      });

      cy.visit('/payment');

      cy.get('[data-testid="payment-submit-button"]').click();

      cy.wait('@processPayment');

      // Verify session expiration handling
      cy.get('[data-testid="session-expired-error"]').should('be.visible');
      cy.contains('Enrollment session expired').should('be.visible');

      // Verify user is redirected to re-authenticate
      cy.get('[data-testid="reauth-button"]').click();
      cy.url().should('include', '/login');
    });
  });
});