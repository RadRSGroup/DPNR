import { ConsentType, ConsentModel } from '@/models/consent.model';
import { PrivacyPolicyModel } from '@/models/privacy-policy.model';
import { DataPortabilityRequestModel } from '@/models/data-portability.model';
import { UserModel } from '@/models/user.model';
import { EnrollmentModel } from '@/models/enrollment.model';
import { PaymentTransactionModel } from '@/models/payment-transaction.model';
import { ConsultationModel } from '@/models/consultation.model';

export interface RecordConsentParams {
  userId?: string;
  consentType: ConsentType;
  granted: boolean;
  version: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface UpdateConsentParams {
  granted: boolean;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface WithdrawConsentsParams {
  reason?: string;
  keepEssential?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface DataPortabilityParams {
  format: 'JSON' | 'CSV' | 'XML';
  includeHistory: boolean;
  dataTypes?: string[];
}

export interface CookiePreferencesParams {
  userId?: string;
  preferences: {
    essential: boolean;
    analytics: boolean;
    marketing: boolean;
    preferences: boolean;
  };
  ipAddress?: string;
  userAgent?: string;
}

export interface ConsentFilters {
  userId?: string;
  consentType?: ConsentType;
  granted?: boolean;
  version?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface StatisticsFilters {
  startDate?: Date;
  endDate?: Date;
  groupBy?: 'DAY' | 'WEEK' | 'MONTH';
}

export interface PolicyData {
  type: 'PRIVACY_POLICY' | 'TERMS_OF_SERVICE' | 'COOKIE_POLICY';
  version: string;
  content: string;
  effectiveDate: Date;
  summary?: string;
  createdBy: string;
}

export class PrivacyService {
  /**
   * Record user consent
   */
  static async recordConsent(params: RecordConsentParams) {
    if (!params.userId) {
      throw new Error('userId is required for consent recording');
    }
    if (!params.ipAddress) {
      throw new Error('ipAddress is required for consent recording');
    }
    if (!params.userAgent) {
      throw new Error('userAgent is required for consent recording');
    }

    const consent = await ConsentModel.create({
      userId: params.userId,
      consentType: params.consentType,
      granted: params.granted,
      version: params.version,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata || {},
    });

    // If this is a marketing consent withdrawal, update user preferences
    if (!params.granted && ['MARKETING_EMAILS', 'MARKETING_SMS'].includes(params.consentType)) {
      if (params.userId) {
        await UserModel.updateMarketingConsent(params.userId, false);
      }
    }

    return consent;
  }

  /**
   * Get user's current consent status
   */
  static async getUserCurrentConsents(userId: string) {
    return await ConsentModel.getUserCurrentConsents(userId);
  }

  /**
   * Get user's consent history
   */
  static async getUserConsentHistory(userId: string, filters: Omit<ConsentFilters, 'userId'>) {
    return await ConsentModel.findAll({
      ...filters,
      userId,
    });
  }

  /**
   * Get consent by ID
   */
  static async getConsentById(id: string) {
    return await ConsentModel.findById(id);
  }

  /**
   * Update existing consent
   */
  static async updateConsent(id: string, params: UpdateConsentParams) {
    const consent = await ConsentModel.findById(id);
    if (!consent) {
      throw new Error('Consent record not found');
    }

    // Create new consent record (for audit trail)
    const newConsent = await ConsentModel.create({
      userId: consent.userId!,
      consentType: consent.consentType,
      granted: params.granted,
      version: consent.version,
      ipAddress: params.ipAddress || '',
      userAgent: params.userAgent || '',
      metadata: {
        ...consent.metadata,
        previousConsentId: id,
        updateReason: params.reason,
      },
    });

    // Mark old consent as superseded
    await ConsentModel.updateStatus(id, 'SUPERSEDED');

    // Update user preferences if needed
    if (!params.granted && ['MARKETING_EMAILS', 'MARKETING_SMS'].includes(consent.consentType)) {
      if (consent.userId) {
        await UserModel.updateMarketingConsent(consent.userId, false);
      }
    }

    return newConsent;
  }

  /**
   * Withdraw all marketing consents
   */
  static async withdrawAllConsents(userId: string, params: WithdrawConsentsParams) {
    const currentConsents = await ConsentModel.getUserCurrentConsents(userId);

    const marketingTypes: ConsentType[] = ['MARKETING_EMAILS', 'MARKETING_SMS'];
    const essentialTypes: ConsentType[] = ['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'DATA_PROCESSING'];

    const withdrawnConsents = [];
    const keptConsents = [];

    for (const consent of currentConsents) {
      const isMarketing = marketingTypes.includes(consent.consentType);
      const isEssential = essentialTypes.includes(consent.consentType);

      if (isMarketing || (!params.keepEssential && !isEssential)) {
        if (consent.granted) {
          const newConsent = await this.recordConsent({
            userId,
            consentType: consent.consentType,
            granted: false,
            version: consent.version,
            ipAddress: params.ipAddress || '',
            userAgent: params.userAgent || '',
            metadata: {
              withdrawalReason: params.reason,
              batchWithdrawal: true,
            },
          });
          withdrawnConsents.push(newConsent);
        }
      } else {
        keptConsents.push(consent);
      }
    }

    // Update user marketing consent
    await UserModel.updateMarketingConsent(userId, false);

    return {
      withdrawnConsents,
      keptConsents,
    };
  }

  /**
   * Get current policy versions
   */
  static async getCurrentPolicyVersions() {
    return await PrivacyPolicyModel.getCurrentVersions();
  }

  /**
   * Get data processing activities for user
   */
  static async getDataProcessingActivities(userId: string) {
    const activities = [];

    // User profile data
    const user = await UserModel.findById(userId);
    if (user) {
      activities.push({
        purpose: 'User Account Management',
        dataTypes: ['Personal Information', 'Contact Details', 'Preferences'],
        legalBasis: 'Contract Performance',
        retention: '30 days after account deletion',
        dataSource: 'User Registration',
      });
    }

    // Enrollment data
    const enrollments = await EnrollmentModel.findByUserId(userId);
    if (enrollments.length > 0) {
      activities.push({
        purpose: 'Course Enrollment and Delivery',
        dataTypes: ['Enrollment Records', 'Progress Tracking', 'Questionnaire Responses'],
        legalBasis: 'Contract Performance',
        retention: '7 years for financial records, 3 years for educational records',
        dataSource: 'Enrollment Process',
      });
    }

    // Payment data
    const payments = await PaymentTransactionModel.findByUserId(userId);
    if (payments.length > 0) {
      activities.push({
        purpose: 'Payment Processing and Financial Records',
        dataTypes: ['Payment Information', 'Transaction History', 'Billing Details'],
        legalBasis: 'Contract Performance & Legal Obligation',
        retention: '7 years (tax and accounting requirements)',
        dataSource: 'Payment Processing',
      });
    }

    // Consultation data
    const consultations = await ConsultationModel.findByUserId(userId);
    if (consultations.length > 0) {
      activities.push({
        purpose: 'Pre-enrollment Consultation Services',
        dataTypes: ['Consultation Requests', 'Communication Records', 'Scheduling Information'],
        legalBasis: 'Legitimate Interest',
        retention: '2 years after last contact',
        dataSource: 'Consultation Requests',
      });
    }

    // Marketing activities (if consented)
    const marketingConsents = await ConsentModel.getUserConsentsByType(userId, ['MARKETING_EMAILS', 'MARKETING_SMS']);
    const hasMarketingConsent = marketingConsents.some(c => c.granted);

    if (hasMarketingConsent) {
      activities.push({
        purpose: 'Marketing Communications',
        dataTypes: ['Contact Information', 'Preferences', 'Interaction History'],
        legalBasis: 'Consent',
        retention: 'Until consent is withdrawn',
        dataSource: 'User Consent',
      });
    }

    return activities;
  }

  /**
   * Request data portability
   */
  static async requestDataPortability(userId: string, params: DataPortabilityParams) {
    const request = await DataPortabilityRequestModel.create({
      userId,
      format: params.format,
      includeHistory: params.includeHistory,
      dataTypes: (params.dataTypes || ['PROFILE', 'ENROLLMENTS', 'PAYMENTS', 'CONSULTATIONS', 'CONSENTS']) as any,
      status: 'PENDING',
      estimatedCompletionTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    // Start background processing (in a real implementation, this would be a queue job)
    this.processDataPortabilityRequest(request.id).catch(console.error);

    return request;
  }

  /**
   * Get data portability request
   */
  static async getDataPortabilityRequest(requestId: string, userId: string) {
    const request = await DataPortabilityRequestModel.findById(requestId);

    if (!request || request.userId !== userId) {
      return null;
    }

    return request;
  }

  /**
   * Update cookie preferences
   */
  static async updateCookiePreferences(params: CookiePreferencesParams) {
    const consentRecords = [];

    // Record consent for each cookie type
    const cookieTypes = [
      { type: 'COOKIES' as ConsentType, granted: params.preferences.essential },
      { type: 'ANALYTICS' as ConsentType, granted: params.preferences.analytics },
      { type: 'MARKETING_EMAILS' as ConsentType, granted: params.preferences.marketing },
    ];

    for (const cookie of cookieTypes) {
      const consent = await this.recordConsent({
        userId: params.userId || '',
        consentType: cookie.type,
        granted: cookie.granted,
        version: '1.0',
        ipAddress: params.ipAddress || '',
        userAgent: params.userAgent || '',
        metadata: {
          source: 'cookie_banner',
          preferences: params.preferences,
        },
      });
      consentRecords.push(consent);
    }

    return {
      preferences: params.preferences,
      consentId: consentRecords[0]?.id,
    };
  }

  /**
   * Get all consent records (admin)
   */
  static async getAllConsents(filters: ConsentFilters) {
    return await ConsentModel.findAll(filters);
  }

  /**
   * Get consent statistics (admin)
   */
  static async getConsentStatistics(filters: StatisticsFilters) {
    return await ConsentModel.getStatistics(filters);
  }

  /**
   * Generate compliance report (admin)
   */
  static async generateComplianceReport(filters: StatisticsFilters & { format: 'JSON' | 'CSV' }) {
    const report = await ConsentModel.generateComplianceReport(filters);

    if (filters.format === 'CSV') {
      return this.convertToCSV(report);
    }

    return report;
  }

  /**
   * Create new policy version (admin)
   */
  static async createPolicyVersion(policyData: PolicyData) {
    return await PrivacyPolicyModel.create(policyData);
  }

  /**
   * Process data portability request (background job)
   */
  private static async processDataPortabilityRequest(requestId: string) {
    try {
      const request = await DataPortabilityRequestModel.findById(requestId);
      if (!request) return;

      await DataPortabilityRequestModel.updateStatus(requestId, 'PROCESSING');

      // Gather user data
      const userData = await this.gatherUserData(request.userId, request.dataTypes);

      // Generate file based on format
      let fileContent: string;
      let mimeType: string;
      let fileName: string;

      switch (request.format) {
        case 'JSON':
          fileContent = JSON.stringify(userData, null, 2);
          mimeType = 'application/json';
          fileName = `user_data_${request.userId}.json`;
          break;
        case 'CSV':
          fileContent = this.convertToCSV(userData);
          mimeType = 'text/csv';
          fileName = `user_data_${request.userId}.csv`;
          break;
        case 'XML':
          fileContent = this.convertToXML(userData);
          mimeType = 'application/xml';
          fileName = `user_data_${request.userId}.xml`;
          break;
      }

      // In a real implementation, upload to S3 or similar storage
      const downloadUrl = await this.uploadFile(fileContent, fileName, mimeType);

      await DataPortabilityRequestModel.complete(requestId, downloadUrl);
    } catch (error) {
      console.error('Data portability processing error:', error);
      await DataPortabilityRequestModel.updateStatus(requestId, 'FAILED');
    }
  }

  /**
   * Gather all user data for portability
   */
  private static async gatherUserData(userId: string, dataTypes: string[]) {
    const userData: any = {
      userId,
      exportedAt: new Date().toISOString(),
      dataTypes,
    };

    if (dataTypes.includes('PROFILE')) {
      userData.profile = await UserModel.findById(userId);
    }

    if (dataTypes.includes('ENROLLMENTS')) {
      userData.enrollments = await EnrollmentModel.findByUserId(userId);
    }

    if (dataTypes.includes('PAYMENTS')) {
      userData.payments = await PaymentTransactionModel.findByUserId(userId);
    }

    if (dataTypes.includes('CONSULTATIONS')) {
      userData.consultations = await ConsultationModel.findByUserId(userId);
    }

    if (dataTypes.includes('CONSENTS')) {
      userData.consents = await ConsentModel.findAll({ userId });
    }

    if (dataTypes.includes('ACTIVITY_LOGS')) {
      // In a real implementation, gather activity logs
      userData.activityLogs = [];
    }

    return userData;
  }

  /**
   * Convert data to CSV format
   */
  private static convertToCSV(data: any): string {
    // Simple CSV conversion - in production, use a proper CSV library
    if (Array.isArray(data)) {
      if (data.length === 0) return '';

      const headers = Object.keys(data[0]);
      const csvRows = [headers.join(',')];

      for (const row of data) {
        const values = headers.map(header => {
          const value = row[header];
          return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
        });
        csvRows.push(values.join(','));
      }

      return csvRows.join('\n');
    }

    // For objects, flatten to key-value pairs
    const pairs = Object.entries(data).map(([key, value]) => `${key},"${value}"`);
    return 'Key,Value\n' + pairs.join('\n');
  }

  /**
   * Convert data to XML format
   */
  private static convertToXML(data: any): string {
    // Simple XML conversion - in production, use a proper XML library
    const toXML = (obj: any, rootName = 'data'): string => {
      if (typeof obj !== 'object') {
        return `<${rootName}>${obj}</${rootName}>`;
      }

      let xml = `<${rootName}>`;
      for (const [key, value] of Object.entries(obj)) {
        if (Array.isArray(value)) {
          xml += `<${key}>`;
          for (const item of value) {
            xml += toXML(item, 'item');
          }
          xml += `</${key}>`;
        } else if (typeof value === 'object' && value !== null) {
          xml += toXML(value, key);
        } else {
          xml += `<${key}>${value}</${key}>`;
        }
      }
      xml += `</${rootName}>`;
      return xml;
    };

    return '<?xml version="1.0" encoding="UTF-8"?>\n' + toXML(data, 'userDataExport');
  }

  /**
   * Upload file to storage (mock implementation)
   */
  private static async uploadFile(_content: string, fileName: string, _mimeType: string): Promise<string> {
    // In a real implementation, upload to S3, Google Cloud Storage, etc.
    // For now, return a mock URL
    return `https://storage.example.com/exports/${fileName}?expires=${Date.now() + 30 * 24 * 60 * 60 * 1000}`;
  }
}