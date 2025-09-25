// Temporary stub services to fix compilation errors

export class EnrollmentServiceStub {
  static async createEnrollment(data: any) {
    return {
      enrollment: {
        id: 'stub-enrollment',
        status: 'PENDING_PAYMENT',
        paymentPlan: data.paymentPlan,
        totalAmount: 6400,
      },
      cohort: {
        id: 'stub-cohort',
        name: 'Test Cohort',
        startDate: new Date(),
      },
      paymentUrl: 'https://payment.example.com'
    };
  }

  static async getEnrollment(id: string) {
    return {
      id,
      userId: 'stub-user',
      status: 'PENDING_PAYMENT',
    };
  }

  static async updateEnrollmentStatus(id: string, status: string, userId: string) {
    return { id, status };
  }

  static async cancelEnrollment(id: string, reason?: string) {
    return { id, status: 'CANCELLED' };
  }

  static async getUserEnrollments(userId: string) {
    return [];
  }

  static async getEnrollmentStatistics(cohortId?: string) {
    return { total: 0, pending: 0, active: 0 };
  }

  static async canUserEnroll(userId: string, cohortId: string) {
    return { canEnroll: true, message: 'Eligible to enroll' };
  }
}

export class PaymentServiceStub {
  static async createPayment(data: any) {
    return {
      transaction: {
        id: 'stub-transaction',
        status: 'SUCCESS',
        amount: data.amount,
      }
    };
  }
}

export class UserServiceStub {
  static async getUserById(id: string) {
    return {
      id,
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    };
  }

  static async syncFromCognito(cognitoId: string, userData: any) {
    return { id: 'stub-user', cognitoId, ...userData };
  }

  static async createUser(data: any) {
    return { id: 'stub-user', ...data };
  }

  static async updateUserProfile(userId: string, data: any) {
    return { id: userId, ...data };
  }

  static async exportUserData(userId: string) {
    return { profile: {}, enrollments: [], payments: [] };
  }

  static async requestAccountDeletion(userId: string, reason?: string) {
    return { deletionScheduledFor: new Date() };
  }

  static async cancelAccountDeletion(userId: string) {
    return { status: 'ACTIVE' };
  }

  static async getUserEnrollments(userId: string) {
    return [];
  }

  static async getUserConsultations(userId: string) {
    return [];
  }

  static async getUserPayments(userId: string, filters: any) {
    return [];
  }

  static async updateUserPreferences(userId: string, preferences: any) {
    return { id: userId, preferences };
  }

  static async updateUser(id: string, data: any) {
    return { id, ...data };
  }

  static async permanentlyDeleteUser(id: string) {
    return;
  }

  static async getUserStatistics(filters: any) {
    return { total: 0, active: 0, inactive: 0 };
  }

  static async syncUserWithCognito(id: string) {
    return { id, synced: true };
  }
}

export class CohortServiceStub {
  static async getCurrentCohort() {
    return {
      id: 'current-cohort',
      name: 'Current Cohort',
      status: 'OPEN_ENROLLMENT',
      startDate: new Date(),
      endDate: new Date(),
      maxCapacity: 20,
      currentEnrollment: 5,
      location: 'Mazkeret Batya',
      schedule: 'Weekly evenings',
    };
  }

  static async getAllCohorts(status?: string) {
    return [];
  }

  static async getCohortDetails(id: string) {
    return {
      id,
      name: 'Test Cohort',
      status: 'OPEN_ENROLLMENT',
    };
  }

  static async getCohortStatistics(id?: string) {
    return { total: 0, active: 0, completed: 0 };
  }

  static async getEnrollmentTrends(id: string) {
    return [];
  }

  static async createCohort(data: any) {
    return { id: 'new-cohort', ...data };
  }

  static async updateCohort(id: string, data: any) {
    return { id, ...data };
  }

  static async updateCohortStatus(id: string, status: string) {
    return { id, status };
  }

  static async deleteCohort(id: string) {
    return;
  }

  static async checkEnrollmentAvailability(id: string) {
    return {
      canEnroll: true,
      spotsAvailable: 15,
      status: 'OPEN',
      message: 'Enrollment available',
    };
  }

  static async getCapacityInfo(id: string) {
    return {
      maximum: 20,
      current: 5,
      available: 15,
      waitlistEnabled: false,
    };
  }

  static translateMessage(message: string, lang: string) {
    return message; // Simple stub
  }
}

export class ConsultationServiceStub {
  static async createConsultationRequest(data: any) {
    return {
      consultation: {
        id: 'new-consultation',
        status: 'NEW',
      },
      message: 'Consultation request created',
    };
  }

  static async getConsultationRequests(filters: any) {
    return [];
  }

  static async getUserConsultationHistory(userId: string) {
    return [];
  }

  static async getConsultationRequest(id: string) {
    return {
      id,
      userId: 'stub-user',
      status: 'NEW',
    };
  }

  static async updateConsultationStatus(id: string, status: string, notes?: string) {
    return { id, status };
  }

  static async processConsultationRequest(id: string, contactMethod: string, notes?: string) {
    return { id, status: 'CONTACTED' };
  }

  static async scheduleConsultation(id: string, date: Date, time: string, meetingLink?: string) {
    return { id, status: 'SCHEDULED' };
  }

  static async completeConsultation(id: string, outcome: string, notes?: string) {
    return { id, status: 'COMPLETED' };
  }

  static async cancelConsultationRequest(id: string, reason?: string) {
    return { id, status: 'CANCELLED' };
  }

  static async linkConsultationToUser(id: string, userId: string) {
    return { id, userId };
  }

  static async getConsultationStatistics(filters: any) {
    return { total: 0, new: 0, completed: 0 };
  }

  static async getRequestsRequiringAttention() {
    return {
      newRequests: [],
      overdue: [],
      followUpNeeded: [],
    };
  }

  static async getDailyTrends(days: number) {
    return [];
  }
}

export class PrivacyServiceStub {
  static async recordConsent(data: any) {
    return {
      id: 'consent-id',
      consentType: data.consentType,
      granted: data.granted,
      version: data.version,
      createdAt: new Date(),
    };
  }

  static async getUserCurrentConsents(userId: string) {
    return [];
  }

  static async getUserConsentHistory(userId: string, filters: any) {
    return [];
  }

  static async getConsentById(id: string) {
    return { id, userId: 'stub-user' };
  }

  static async updateConsent(id: string, data: any) {
    return { id, ...data };
  }

  static async withdrawAllConsents(userId: string, options: any) {
    return {
      withdrawnConsents: [],
      keptConsents: [],
    };
  }

  static async getCurrentPolicyVersions() {
    return {
      privacyPolicy: { version: '1.0' },
      termsOfService: { version: '1.0' },
    };
  }

  static async getDataProcessingActivities(userId: string) {
    return [];
  }

  static async requestDataPortability(userId: string, options: any) {
    return {
      id: 'portability-request',
      status: 'PENDING',
      estimatedCompletionTime: new Date(),
      downloadUrl: null,
      expiresAt: new Date(),
    };
  }

  static async getDataPortabilityRequest(requestId: string, userId: string) {
    return {
      id: requestId,
      status: 'COMPLETED',
      progress: 100,
      downloadUrl: 'https://download.example.com',
      expiresAt: new Date(),
      createdAt: new Date(),
      completedAt: new Date(),
    };
  }

  static async updateCookiePreferences(data: any) {
    return {
      preferences: data.preferences,
      consentId: 'cookie-consent-id',
    };
  }

  static async getAllConsents(filters: any) {
    return [];
  }

  static async getConsentStatistics(filters: any) {
    return { total: 0, granted: 0, revoked: 0 };
  }

  static async generateComplianceReport(filters: any) {
    return { report: 'Compliance report data' };
  }

  static async createPolicyVersion(data: any) {
    return { id: 'policy-version', ...data };
  }
}