import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Global test setup
export const testDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/dpnr_test'
    }
  }
});

// Mock AWS Cognito for tests
jest.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: jest.fn().mockReturnValue({
      verify: jest.fn().mockResolvedValue({
        sub: 'test-user-id',
        email: 'test@example.com',
        'custom:role': 'student',
        email_verified: true
      })
    })
  }
}));

// Mock Tranzila payment service
jest.mock('../src/services/payment.service', () => ({
  PaymentService: {
    processPayment: jest.fn().mockResolvedValue({
      success: true,
      transactionId: 'test-transaction-123',
      amount: 6400,
      currency: 'ILS'
    }),
    setupInstallments: jest.fn().mockResolvedValue({
      success: true,
      installmentPlan: 'test-plan-123'
    }),
    refundPayment: jest.fn().mockResolvedValue({
      success: true,
      refundId: 'test-refund-123'
    })
  }
}));

// Global test hooks
beforeAll(async () => {
  // Connect to test database
  await testDb.$connect();
});

beforeEach(async () => {
  // Clean up database before each test
  await testDb.payment.deleteMany();
  await testDb.enrollment.deleteMany();
  await testDb.consultation.deleteMany();
  await testDb.cohort.deleteMany();
  await testDb.user.deleteMany();
});

afterAll(async () => {
  // Disconnect from test database
  await testDb.$disconnect();
});

// Test utilities
export const createTestUser = async (overrides = {}) => {
  return testDb.user.create({
    data: {
      cognitoId: 'test-cognito-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'student',
      ...overrides
    }
  });
};

export const createTestCohort = async (overrides = {}) => {
  return testDb.cohort.create({
    data: {
      name: 'Test Cohort',
      description: 'Test cohort description',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-06-01'),
      capacity: 20,
      price: 6400,
      status: 'open',
      ...overrides
    }
  });
};

export const createTestEnrollment = async (userId: string, cohortId: string, overrides = {}) => {
  return testDb.enrollment.create({
    data: {
      userId,
      cohortId,
      paymentPlan: 'full',
      status: 'pending',
      enrollmentDate: new Date(),
      ...overrides
    }
  });
};

export const createTestPayment = async (enrollmentId: string, overrides = {}) => {
  return testDb.payment.create({
    data: {
      enrollmentId,
      amount: 6400,
      currency: 'ILS',
      status: 'pending',
      method: 'credit_card',
      transactionId: 'test-transaction',
      ...overrides
    }
  });
};