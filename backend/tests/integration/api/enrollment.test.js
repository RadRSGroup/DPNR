"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../../../src/index");
const setup_1 = require("../../setup");
describe('Enrollment API Integration Tests', () => {
    let authToken;
    let testUser;
    let testCohort;
    beforeEach(async () => {
        testUser = await (0, setup_1.createTestUser)();
        testCohort = await (0, setup_1.createTestCohort)();
        // Mock JWT token for authentication
        authToken = 'Bearer mock-jwt-token';
    });
    describe('POST /api/v1/enrollments', () => {
        it('should create new enrollment with valid data', async () => {
            const enrollmentData = {
                cohortId: testCohort.id,
                paymentPlan: 'full',
                personalInfo: {
                    phone: '+972501234567',
                    emergencyContact: 'John Doe',
                    emergencyPhone: '+972501234568'
                },
                questionnaire: {
                    motivation: 'Personal growth',
                    experience: 'Beginner',
                    goals: 'Better communication'
                }
            };
            const response = await (0, supertest_1.default)(index_1.app)
                .post('/api/v1/enrollments')
                .set('Authorization', authToken)
                .send(enrollmentData)
                .expect(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data.userId).toBe(testUser.id);
            expect(response.body.data.cohortId).toBe(testCohort.id);
            expect(response.body.data.paymentPlan).toBe('full');
            expect(response.body.data.status).toBe('pending');
        });
        it('should return 400 for invalid payment plan', async () => {
            const enrollmentData = {
                cohortId: testCohort.id,
                paymentPlan: 'invalid_plan',
                personalInfo: {
                    phone: '+972501234567',
                    emergencyContact: 'John Doe',
                    emergencyPhone: '+972501234568'
                },
                questionnaire: {
                    motivation: 'Growth',
                    experience: 'Beginner',
                    goals: 'Skills'
                }
            };
            const response = await (0, supertest_1.default)(index_1.app)
                .post('/api/v1/enrollments')
                .set('Authorization', authToken)
                .send(enrollmentData)
                .expect(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('validation');
        });
        it('should return 400 for missing required fields', async () => {
            const enrollmentData = {
                cohortId: testCohort.id,
                // Missing paymentPlan, personalInfo, questionnaire
            };
            const response = await (0, supertest_1.default)(index_1.app)
                .post('/api/v1/enrollments')
                .set('Authorization', authToken)
                .send(enrollmentData)
                .expect(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('validation');
        });
        it('should return 401 without authentication', async () => {
            const enrollmentData = {
                cohortId: testCohort.id,
                paymentPlan: 'full',
                personalInfo: {
                    phone: '+972501234567',
                    emergencyContact: 'John Doe',
                    emergencyPhone: '+972501234568'
                },
                questionnaire: {
                    motivation: 'Growth',
                    experience: 'Beginner',
                    goals: 'Skills'
                }
            };
            await (0, supertest_1.default)(index_1.app)
                .post('/api/v1/enrollments')
                .send(enrollmentData)
                .expect(401);
        });
        it('should return 409 for duplicate enrollment', async () => {
            const enrollmentData = {
                cohortId: testCohort.id,
                paymentPlan: 'full',
                personalInfo: {
                    phone: '+972501234567',
                    emergencyContact: 'John Doe',
                    emergencyPhone: '+972501234568'
                },
                questionnaire: {
                    motivation: 'Growth',
                    experience: 'Beginner',
                    goals: 'Skills'
                }
            };
            // Create first enrollment
            await (0, supertest_1.default)(index_1.app)
                .post('/api/v1/enrollments')
                .set('Authorization', authToken)
                .send(enrollmentData)
                .expect(201);
            // Try to create duplicate
            const response = await (0, supertest_1.default)(index_1.app)
                .post('/api/v1/enrollments')
                .set('Authorization', authToken)
                .send(enrollmentData)
                .expect(409);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('already enrolled');
        });
    });
    describe('GET /api/v1/enrollments/:id', () => {
        it('should return enrollment by ID', async () => {
            // Create enrollment first
            const enrollment = await setup_1.testDb.enrollment.create({
                data: {
                    userId: testUser.id,
                    cohortId: testCohort.id,
                    paymentPlan: 'full',
                    status: 'pending',
                    enrollmentDate: new Date(),
                    personalInfo: {
                        phone: '+972501234567',
                        emergencyContact: 'John Doe',
                        emergencyPhone: '+972501234568'
                    },
                    questionnaire: {
                        motivation: 'Growth',
                        experience: 'Beginner',
                        goals: 'Skills'
                    }
                }
            });
            const response = await (0, supertest_1.default)(index_1.app)
                .get(`/api/v1/enrollments/${enrollment.id}`)
                .set('Authorization', authToken)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(enrollment.id);
            expect(response.body.data.user).toBeDefined();
            expect(response.body.data.cohort).toBeDefined();
        });
        it('should return 404 for non-existent enrollment', async () => {
            const response = await (0, supertest_1.default)(index_1.app)
                .get('/api/v1/enrollments/non-existent-id')
                .set('Authorization', authToken)
                .expect(404);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('not found');
        });
        it('should return 401 without authentication', async () => {
            await (0, supertest_1.default)(index_1.app)
                .get('/api/v1/enrollments/some-id')
                .expect(401);
        });
    });
    describe('GET /api/v1/enrollments/user/me', () => {
        it('should return current user enrollments', async () => {
            // Create enrollment
            await setup_1.testDb.enrollment.create({
                data: {
                    userId: testUser.id,
                    cohortId: testCohort.id,
                    paymentPlan: 'full',
                    status: 'pending',
                    enrollmentDate: new Date(),
                    personalInfo: {
                        phone: '+972501234567',
                        emergencyContact: 'John Doe',
                        emergencyPhone: '+972501234568'
                    },
                    questionnaire: {
                        motivation: 'Growth',
                        experience: 'Beginner',
                        goals: 'Skills'
                    }
                }
            });
            const response = await (0, supertest_1.default)(index_1.app)
                .get('/api/v1/enrollments/user/me')
                .set('Authorization', authToken)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].userId).toBe(testUser.id);
            expect(response.body.data[0].cohort).toBeDefined();
        });
        it('should return empty array for user with no enrollments', async () => {
            const response = await (0, supertest_1.default)(index_1.app)
                .get('/api/v1/enrollments/user/me')
                .set('Authorization', authToken)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(0);
        });
    });
    describe('PUT /api/v1/enrollments/:id/status', () => {
        it('should update enrollment status (admin only)', async () => {
            // Create admin user
            const adminUser = await (0, setup_1.createTestUser)({
                email: 'admin@example.com',
                cognitoId: 'admin-cognito',
                role: 'admin'
            });
            const enrollment = await setup_1.testDb.enrollment.create({
                data: {
                    userId: testUser.id,
                    cohortId: testCohort.id,
                    paymentPlan: 'full',
                    status: 'pending',
                    enrollmentDate: new Date(),
                    personalInfo: {
                        phone: '+972501234567',
                        emergencyContact: 'John Doe',
                        emergencyPhone: '+972501234568'
                    },
                    questionnaire: {
                        motivation: 'Growth',
                        experience: 'Beginner',
                        goals: 'Skills'
                    }
                }
            });
            // Mock admin JWT token
            const adminToken = 'Bearer admin-jwt-token';
            const response = await (0, supertest_1.default)(index_1.app)
                .put(`/api/v1/enrollments/${enrollment.id}/status`)
                .set('Authorization', adminToken)
                .send({ status: 'active' })
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('active');
        });
        it('should return 403 for non-admin user', async () => {
            const enrollment = await setup_1.testDb.enrollment.create({
                data: {
                    userId: testUser.id,
                    cohortId: testCohort.id,
                    paymentPlan: 'full',
                    status: 'pending',
                    enrollmentDate: new Date(),
                    personalInfo: {
                        phone: '+972501234567',
                        emergencyContact: 'John Doe',
                        emergencyPhone: '+972501234568'
                    },
                    questionnaire: {
                        motivation: 'Growth',
                        experience: 'Beginner',
                        goals: 'Skills'
                    }
                }
            });
            const response = await (0, supertest_1.default)(index_1.app)
                .put(`/api/v1/enrollments/${enrollment.id}/status`)
                .set('Authorization', authToken) // Regular user token
                .send({ status: 'active' })
                .expect(403);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('permission');
        });
    });
    describe('PUT /api/v1/enrollments/:id/progress', () => {
        it('should update enrollment progress', async () => {
            const enrollment = await setup_1.testDb.enrollment.create({
                data: {
                    userId: testUser.id,
                    cohortId: testCohort.id,
                    paymentPlan: 'full',
                    status: 'active',
                    enrollmentDate: new Date(),
                    personalInfo: {
                        phone: '+972501234567',
                        emergencyContact: 'John Doe',
                        emergencyPhone: '+972501234568'
                    },
                    questionnaire: {
                        motivation: 'Growth',
                        experience: 'Beginner',
                        goals: 'Skills'
                    }
                }
            });
            const progressData = {
                completedModules: 3,
                totalModules: 10,
                lastActivity: new Date().toISOString(),
                completionPercentage: 30
            };
            const response = await (0, supertest_1.default)(index_1.app)
                .put(`/api/v1/enrollments/${enrollment.id}/progress`)
                .set('Authorization', authToken)
                .send(progressData)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.progress.completedModules).toBe(3);
            expect(response.body.data.progress.completionPercentage).toBe(30);
        });
        it('should return 403 for unauthorized user', async () => {
            // Create another user
            const otherUser = await (0, setup_1.createTestUser)({
                email: 'other@example.com',
                cognitoId: 'other-cognito'
            });
            const enrollment = await setup_1.testDb.enrollment.create({
                data: {
                    userId: otherUser.id,
                    cohortId: testCohort.id,
                    paymentPlan: 'full',
                    status: 'active',
                    enrollmentDate: new Date(),
                    personalInfo: {
                        phone: '+972501234567',
                        emergencyContact: 'John Doe',
                        emergencyPhone: '+972501234568'
                    },
                    questionnaire: {
                        motivation: 'Growth',
                        experience: 'Beginner',
                        goals: 'Skills'
                    }
                }
            });
            const progressData = {
                completedModules: 3,
                totalModules: 10,
                lastActivity: new Date().toISOString(),
                completionPercentage: 30
            };
            const response = await (0, supertest_1.default)(index_1.app)
                .put(`/api/v1/enrollments/${enrollment.id}/progress`)
                .set('Authorization', authToken) // Different user's token
                .send(progressData)
                .expect(403);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('permission');
        });
    });
});
//# sourceMappingURL=enrollment.test.js.map