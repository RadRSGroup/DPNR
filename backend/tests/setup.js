"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestPayment = exports.createTestEnrollment = exports.createTestCohort = exports.createTestUser = exports.testDb = void 0;
const client_1 = require("@prisma/client");
const dotenv_1 = __importDefault(require("dotenv"));
// Load test environment variables
dotenv_1.default.config({ path: '.env.test' });
// Global test setup
exports.testDb = new client_1.PrismaClient({
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
    await exports.testDb.$connect();
});
beforeEach(async () => {
    // Clean up database before each test
    await exports.testDb.payment.deleteMany();
    await exports.testDb.enrollment.deleteMany();
    await exports.testDb.consultation.deleteMany();
    await exports.testDb.cohort.deleteMany();
    await exports.testDb.user.deleteMany();
});
afterAll(async () => {
    // Disconnect from test database
    await exports.testDb.$disconnect();
});
// Test utilities
const createTestUser = async (overrides = {}) => {
    return exports.testDb.user.create({
        data: {
            cognitoId: 'test-cognito-id',
            email: 'test@example.com',
            name: 'Test User',
            role: 'student',
            ...overrides
        }
    });
};
exports.createTestUser = createTestUser;
const createTestCohort = async (overrides = {}) => {
    return exports.testDb.cohort.create({
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
exports.createTestCohort = createTestCohort;
const createTestEnrollment = async (userId, cohortId, overrides = {}) => {
    return exports.testDb.enrollment.create({
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
exports.createTestEnrollment = createTestEnrollment;
const createTestPayment = async (enrollmentId, overrides = {}) => {
    return exports.testDb.payment.create({
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
exports.createTestPayment = createTestPayment;
//# sourceMappingURL=setup.js.map