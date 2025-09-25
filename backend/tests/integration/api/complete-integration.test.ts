/**
 * Complete API Integration Tests
 * DPNR Course Registration Platform
 *
 * Tests all API endpoints with full integration coverage:
 * - Authentication flow
 * - User management
 * - Cohort operations
 * - Enrollment process
 * - Payment integration
 * - Security and validation
 */

import request from 'supertest';
import { app } from '../../../src/index';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

describe('Complete API Integration Tests', () => {
  let testUser: any;
  let authToken: string;
  let adminToken: string;
  let testCohort: any;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.paymentTransaction.deleteMany({
      where: { enrollment: { user: { email: { contains: 'test' } } } }
    });
    await prisma.enrollment.deleteMany({
      where: { user: { email: { contains: 'test' } } }
    });
    await prisma.consultationRequest.deleteMany({
      where: { email: { contains: 'test' } }
    });
    await prisma.privacyConsent.deleteMany({
      where: { user: { email: { contains: 'test' } } }
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'test' } }
    });
    await prisma.cohort.deleteMany({
      where: { name: { contains: 'Test' } }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.paymentTransaction.deleteMany({
      where: { enrollment: { user: { email: { contains: 'test' } } } }
    });
    await prisma.enrollment.deleteMany({
      where: { user: { email: { contains: 'test' } } }
    });
    await prisma.consultationRequest.deleteMany({
      where: { email: { contains: 'test' } }
    });
    await prisma.privacyConsent.deleteMany({
      where: { user: { email: { contains: 'test' } } }
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'test' } }
    });
    await prisma.cohort.deleteMany({
      where: { name: { contains: 'Test' } }
    });

    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        cognitoId: `test-cognito-${Date.now()}`,
        email: `test.user.${Date.now()}@example.com`,
        firstName: 'Test',
        lastName: 'User',
        phone: '+972501234567',
        preferredLanguage: 'HE',
        role: 'STUDENT'
      }
    });

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        cognitoId: `admin-cognito-${Date.now()}`,
        email: `admin.${Date.now()}@example.com`,
        firstName: 'Admin',
        lastName: 'User',
        phone: '+972501234568',
        preferredLanguage: 'EN',
        role: 'ADMIN'
      }
    });

    // Generate JWT tokens
    authToken = jwt.sign(
      { sub: testUser.cognitoId, email: testUser.email, role: 'STUDENT' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { sub: adminUser.cognitoId, email: adminUser.email, role: 'ADMIN' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test cohort
    testCohort = await prisma.cohort.create({
      data: {
        name: `Test Cohort ${Date.now()}`,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-05-01'),
        maxCapacity: 20,
        currentEnrollment: 0,
        status: 'OPEN_ENROLLMENT',
        location: 'Test Location',
        schedule: 'Weekly test sessions'
      }
    });
  });

  describe('Health and System Status', () => {
    it('GET /health - should return system health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    it('GET /v1/health - should return API health status', async () => {
      const response = await request(app)
        .get('/v1/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status', 'healthy');
    });

    it('GET /v1/test - should return API test response', async () => {
      const response = await request(app)
        .get('/v1/test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('message');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests without authentication token', async () => {
      await request(app)
        .get('/v1/enrollments')
        .expect(401);

      await request(app)
        .post('/v1/enrollments')
        .send({})
        .expect(401);
    });

    it('should reject requests with invalid authentication token', async () => {
      await request(app)
        .get('/v1/enrollments')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should accept requests with valid authentication token', async () => {
      const response = await request(app)
        .get('/v1/enrollments/user/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should enforce role-based access control', async () => {
      // Student trying to access admin endpoint should fail
      await request(app)
        .get('/v1/admin/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      // Admin should have access
      // Note: This would require implementing admin endpoints
      // await request(app)
      //   .get('/v1/admin/users')
      //   .set('Authorization', `Bearer ${adminToken}`)
      //   .expect(200);
    });
  });

  describe('Cohort Management', () => {
    it('GET /v1/cohorts/current - should return current cohort information', async () => {
      const response = await request(app)
        .get('/v1/cohorts/current')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('startDate');
      expect(response.body.data).toHaveProperty('maxCapacity');
      expect(response.body.data).toHaveProperty('currentEnrollment');
    });

    it('GET /v1/cohorts/:id - should return specific cohort details', async () => {
      const response = await request(app)
        .get(`/v1/cohorts/${testCohort.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testCohort.id);
      expect(response.body.data.name).toBe(testCohort.name);
      expect(response.body.data.status).toBe('OPEN_ENROLLMENT');
    });

    it('GET /v1/cohorts/:id - should return 404 for non-existent cohort', async () => {
      const response = await request(app)
        .get('/v1/cohorts/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('User Enrollment Process', () => {
    it('POST /v1/enrollments - should create new enrollment successfully', async () => {
      const enrollmentData = {
        cohortId: testCohort.id,
        paymentPlan: 'FULL',
        questionnaire: {
          motivation: 'Personal growth and development',
          experience: 'Beginner level experience',
          goals: 'Improve communication and leadership skills',
          expectations: 'Learn practical tools for personal development'
        }
      };

      const response = await request(app)
        .post('/v1/enrollments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(enrollmentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.userId).toBe(testUser.id);
      expect(response.body.data.cohortId).toBe(testCohort.id);
      expect(response.body.data.paymentPlan).toBe('FULL');
      expect(response.body.data.status).toBe('PENDING_PAYMENT');
    });

    it('POST /v1/enrollments - should prevent duplicate enrollment', async () => {
      const enrollmentData = {
        cohortId: testCohort.id,
        paymentPlan: 'FULL',
        questionnaire: {
          motivation: 'Test motivation',
          experience: 'Test experience',
          goals: 'Test goals'
        }
      };

      // Create first enrollment
      await request(app)
        .post('/v1/enrollments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(enrollmentData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/v1/enrollments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(enrollmentData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already enrolled');
    });

    it('POST /v1/enrollments - should validate required fields', async () => {
      const invalidData = {
        cohortId: testCohort.id,
        // Missing paymentPlan and questionnaire
      };

      const response = await request(app)
        .post('/v1/enrollments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('validation');
    });

    it('POST /v1/enrollments - should validate payment plan options', async () => {
      const invalidData = {
        cohortId: testCohort.id,
        paymentPlan: 'INVALID_PLAN',
        questionnaire: {
          motivation: 'Test',
          experience: 'Test',
          goals: 'Test'
        }
      };

      const response = await request(app)
        .post('/v1/enrollments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('validation');
    });

    it('GET /v1/enrollments/user/me - should return user enrollments', async () => {
      // Create enrollment first
      await prisma.enrollment.create({
        data: {
          userId: testUser.id,
          cohortId: testCohort.id,
          paymentPlan: 'FULL',
          totalAmount: 6400,
          status: 'ACTIVE',
          questionnaire: {
            motivation: 'Test motivation',
            experience: 'Test experience',
            goals: 'Test goals'
          }
        }
      });

      const response = await request(app)
        .get('/v1/enrollments/user/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].userId).toBe(testUser.id);
      expect(response.body.data[0]).toHaveProperty('cohort');
    });

    it('GET /v1/enrollments/:id - should return specific enrollment', async () => {
      const enrollment = await prisma.enrollment.create({
        data: {
          userId: testUser.id,
          cohortId: testCohort.id,
          paymentPlan: 'FIVE_INSTALLMENTS',
          totalAmount: 6800,
          status: 'PENDING_PAYMENT',
          questionnaire: {
            motivation: 'Test motivation',
            experience: 'Test experience',
            goals: 'Test goals'
          }
        }
      });

      const response = await request(app)
        .get(`/v1/enrollments/${enrollment.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(enrollment.id);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('cohort');
    });
  });

  describe('Payment Plan Validation', () => {
    it('should correctly calculate amounts for all payment plans', async () => {
      const paymentPlans = [
        { plan: 'FULL', expectedAmount: 6400 },
        { plan: 'FIVE_INSTALLMENTS', expectedAmount: 6800 }, // 5 × ₪1,360
        { plan: 'TWELVE_INSTALLMENTS', expectedAmount: 6960 } // 12 × ₪580
      ];

      for (const { plan, expectedAmount } of paymentPlans) {
        const enrollmentData = {
          cohortId: testCohort.id,
          paymentPlan: plan,
          questionnaire: {
            motivation: `Test motivation for ${plan}`,
            experience: 'Test experience',
            goals: 'Test goals'
          }
        };

        // Create new user for each test to avoid duplicate enrollment
        const newUser = await prisma.user.create({
          data: {
            cognitoId: `test-user-${plan}-${Date.now()}`,
            email: `test.${plan.toLowerCase()}.${Date.now()}@example.com`,
            firstName: 'Test',
            lastName: 'User',
            phone: '+972501234567'
          }
        });

        const userToken = jwt.sign(
          { sub: newUser.cognitoId, email: newUser.email, role: 'STUDENT' },
          process.env.JWT_SECRET || 'test-secret',
          { expiresIn: '1h' }
        );

        const response = await request(app)
          .post('/v1/enrollments')
          .set('Authorization', `Bearer ${userToken}`)
          .send(enrollmentData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.paymentPlan).toBe(plan);
        expect(Number(response.body.data.totalAmount)).toBe(expectedAmount);
      }
    });
  });

  describe('Capacity Management', () => {
    it('should enforce cohort capacity limits', async () => {
      // Create a cohort with capacity of 1
      const limitedCohort = await prisma.cohort.create({
        data: {
          name: `Limited Cohort ${Date.now()}`,
          startDate: new Date('2024-04-01'),
          endDate: new Date('2024-06-01'),
          maxCapacity: 1,
          currentEnrollment: 0,
          status: 'OPEN_ENROLLMENT'
        }
      });

      const enrollmentData = {
        cohortId: limitedCohort.id,
        paymentPlan: 'FULL',
        questionnaire: {
          motivation: 'Test motivation',
          experience: 'Test experience',
          goals: 'Test goals'
        }
      };

      // First enrollment should succeed
      await request(app)
        .post('/v1/enrollments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(enrollmentData)
        .expect(201);

      // Update cohort enrollment count
      await prisma.cohort.update({
        where: { id: limitedCohort.id },
        data: { currentEnrollment: 1, status: 'FULL' }
      });

      // Second enrollment should fail
      const secondUser = await prisma.user.create({
        data: {
          cognitoId: `second-user-${Date.now()}`,
          email: `second.user.${Date.now()}@example.com`,
          firstName: 'Second',
          lastName: 'User',
          phone: '+972501234569'
        }
      });

      const secondToken = jwt.sign(
        { sub: secondUser.cognitoId, email: secondUser.email, role: 'STUDENT' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/v1/enrollments')
        .set('Authorization', `Bearer ${secondToken}`)
        .send(enrollmentData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('full capacity');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on API endpoints', async () => {
      const promises = [];

      // Make multiple rapid requests to trigger rate limiting
      for (let i = 0; i < 25; i++) {
        promises.push(
          request(app)
            .get('/v1/test')
            .catch(err => ({ status: err.status }))
        );
      }

      const responses = await Promise.all(promises);

      // At least some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(
        (response: any) => response.status === 429
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Input Validation and Security', () => {
    it('should sanitize and validate input data', async () => {
      const maliciousData = {
        cohortId: testCohort.id,
        paymentPlan: 'FULL',
        questionnaire: {
          motivation: '<script>alert("xss")</script>',
          experience: 'DROP TABLE users;',
          goals: '${process.env.DATABASE_URL}'
        }
      };

      const response = await request(app)
        .post('/v1/enrollments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(maliciousData)
        .expect(201);

      expect(response.body.success).toBe(true);

      // Verify that the data was sanitized (exact implementation depends on sanitization strategy)
      const enrollment = await prisma.enrollment.findUnique({
        where: { id: response.body.data.id }
      });

      const questionnaire = enrollment?.questionnaire as any;
      expect(questionnaire.motivation).not.toContain('<script>');
      expect(questionnaire.experience).not.toContain('DROP TABLE');
      expect(questionnaire.goals).not.toContain('${process.env');
    });

    it('should reject requests with invalid JSON', async () => {
      await request(app)
        .post('/v1/enrollments')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
    });

    it('should reject requests exceeding size limits', async () => {
      const largeData = {
        cohortId: testCohort.id,
        paymentPlan: 'FULL',
        questionnaire: {
          motivation: 'A'.repeat(10000), // Very large string
          experience: 'B'.repeat(10000),
          goals: 'C'.repeat(10000)
        }
      };

      await request(app)
        .post('/v1/enrollments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(largeData)
        .expect(413); // Payload Too Large
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This would require mocking Prisma to simulate connection errors
      // For now, we test that the API returns proper error structures

      const response = await request(app)
        .get('/v1/cohorts/invalid-uuid-format')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return consistent error format for all endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/v1/cohorts/non-existent' },
        { method: 'get', path: '/v1/enrollments/non-existent' },
        { method: 'post', path: '/v1/enrollments', data: {} }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          [endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${authToken}`)
          .send(endpoint.data || {});

        if (response.status >= 400) {
          expect(response.body).toHaveProperty('success', false);
          expect(response.body).toHaveProperty('error');
          expect(response.body).toHaveProperty('timestamp');
        }
      }
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent enrollment requests correctly', async () => {
      const enrollmentData = {
        cohortId: testCohort.id,
        paymentPlan: 'FULL',
        questionnaire: {
          motivation: 'Test motivation',
          experience: 'Test experience',
          goals: 'Test goals'
        }
      };

      // Create multiple users for concurrent enrollment
      const users = [];
      const tokens = [];

      for (let i = 0; i < 5; i++) {
        const user = await prisma.user.create({
          data: {
            cognitoId: `concurrent-user-${i}-${Date.now()}`,
            email: `concurrent.${i}.${Date.now()}@example.com`,
            firstName: `User${i}`,
            lastName: 'Concurrent',
            phone: `+97250123456${i}`
          }
        });

        const token = jwt.sign(
          { sub: user.cognitoId, email: user.email, role: 'STUDENT' },
          process.env.JWT_SECRET || 'test-secret',
          { expiresIn: '1h' }
        );

        users.push(user);
        tokens.push(token);
      }

      // Make concurrent enrollment requests
      const promises = tokens.map(token =>
        request(app)
          .post('/v1/enrollments')
          .set('Authorization', `Bearer ${token}`)
          .send(enrollmentData)
      );

      const responses = await Promise.all(promises);

      // All enrollments should succeed (assuming cohort has sufficient capacity)
      responses.forEach(response => {
        expect([201, 409]).toContain(response.status);
        if (response.status === 201) {
          expect(response.body.success).toBe(true);
        }
      });
    });
  });

  describe('API Documentation Compliance', () => {
    it('should match OpenAPI specification for enrollment endpoints', async () => {
      const enrollmentData = {
        cohortId: testCohort.id,
        paymentPlan: 'FULL',
        questionnaire: {
          motivation: 'Personal development goals',
          experience: 'Some previous experience with personal development',
          goals: 'Improve communication and leadership skills'
        }
      };

      const response = await request(app)
        .post('/v1/enrollments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(enrollmentData)
        .expect(201);

      // Verify response structure matches API specification
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');

      const enrollment = response.body.data;
      expect(enrollment).toHaveProperty('id');
      expect(enrollment).toHaveProperty('userId');
      expect(enrollment).toHaveProperty('cohortId');
      expect(enrollment).toHaveProperty('paymentPlan');
      expect(enrollment).toHaveProperty('totalAmount');
      expect(enrollment).toHaveProperty('status');
      expect(enrollment).toHaveProperty('enrollmentDate');
    });

    it('should return proper HTTP status codes', async () => {
      // Test various scenarios and their expected status codes
      const testCases = [
        {
          description: 'Valid enrollment creation',
          method: 'post',
          path: '/v1/enrollments',
          auth: authToken,
          data: {
            cohortId: testCohort.id,
            paymentPlan: 'FULL',
            questionnaire: {
              motivation: 'Test',
              experience: 'Test',
              goals: 'Test'
            }
          },
          expectedStatus: 201
        },
        {
          description: 'Get non-existent enrollment',
          method: 'get',
          path: '/v1/enrollments/non-existent-id',
          auth: authToken,
          expectedStatus: 404
        },
        {
          description: 'Unauthorized access',
          method: 'get',
          path: '/v1/enrollments/user/me',
          expectedStatus: 401
        }
      ];

      for (const testCase of testCases) {
        const req = request(app)[testCase.method](testCase.path);

        if (testCase.auth) {
          req.set('Authorization', `Bearer ${testCase.auth}`);
        }

        if (testCase.data) {
          req.send(testCase.data);
        }

        await req.expect(testCase.expectedStatus);
      }
    });
  });
});