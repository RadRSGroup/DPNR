import { ConsultationRequest, RequestStatus } from '@prisma/client';
import {
  ConsultationModel,
  CreateConsultationData,
  UpdateConsultationData,
} from '@/models/consultation.model';
import { UserModel } from '@/models/user.model';

export class ConsultationService {
  /**
   * Create new consultation request
   */
  static async createConsultationRequest(data: CreateConsultationData): Promise<{
    consultation: ConsultationRequest;
    message: string;
  }> {
    // Check for rate limiting
    const hasRecentRequest = await ConsultationModel.hasRecentRequest(data.email, 24);
    if (hasRecentRequest) {
      throw new Error('You have already submitted a consultation request in the last 24 hours');
    }

    // Check if user exists and link if found
    let userId: string | undefined;
    const existingUser = await UserModel.findByEmail(data.email);
    if (existingUser) {
      userId = existingUser.id;
    }

    const consultationData = { ...data, userId };
    const consultation = await ConsultationModel.create(consultationData);

    // Send confirmation email
    await this.sendConsultationConfirmation(consultation);

    // Notify admin team
    await this.notifyAdminTeam(consultation);

    return {
      consultation,
      message: 'Consultation request submitted successfully. We will contact you within 24 hours.',
    };
  }

  /**
   * Get consultation request by ID
   */
  static async getConsultationRequest(consultationId: string): Promise<ConsultationRequest> {
    const consultation = await ConsultationModel.findById(consultationId);
    if (!consultation) {
      throw new Error('Consultation request not found');
    }
    return consultation;
  }

  /**
   * Get consultation requests with filtering
   */
  static async getConsultationRequests(filters?: {
    status?: RequestStatus;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<ConsultationRequest[]> {
    // Clean up undefined values in filters to satisfy exactOptionalPropertyTypes
    const cleanFilters: {
      status?: RequestStatus;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {};

    if (filters?.status) cleanFilters.status = filters.status;
    if (filters?.startDate) cleanFilters.startDate = filters.startDate;
    if (filters?.endDate) cleanFilters.endDate = filters.endDate;
    if (filters?.limit) cleanFilters.limit = filters.limit;
    if (filters?.offset) cleanFilters.offset = filters.offset;

    return ConsultationModel.findAll(cleanFilters);
  }

  /**
   * Update consultation request status
   */
  static async updateConsultationStatus(
    consultationId: string,
    status: RequestStatus,
    notes?: string
  ): Promise<ConsultationRequest> {
    const consultation = await ConsultationModel.findById(consultationId);
    if (!consultation) {
      throw new Error('Consultation request not found');
    }

    const updatedConsultation = await ConsultationModel.updateStatus(consultationId, status);

    // Send status update notification
    await this.sendStatusUpdateNotification(updatedConsultation, status, notes);

    // Log the status change
    console.log(`Consultation ${consultationId} status updated to ${status}`);

    return updatedConsultation;
  }

  /**
   * Process consultation request (mark as contacted)
   */
  static async processConsultationRequest(
    consultationId: string,
    contactMethod: string,
    notes?: string
  ): Promise<ConsultationRequest> {
    const consultation = await ConsultationModel.findById(consultationId);
    if (!consultation) {
      throw new Error('Consultation request not found');
    }

    if (consultation.status !== RequestStatus.NEW) {
      throw new Error('Consultation request has already been processed');
    }

    const updatedConsultation = await ConsultationModel.updateStatus(
      consultationId,
      RequestStatus.CONTACTED
    );

    // Send follow-up email to client
    await this.sendFollowUpEmail(updatedConsultation, contactMethod, notes);

    return updatedConsultation;
  }

  /**
   * Schedule consultation
   */
  static async scheduleConsultation(
    consultationId: string,
    scheduledDate: Date,
    scheduledTime: string,
    meetingLink?: string
  ): Promise<ConsultationRequest> {
    const consultation = await ConsultationModel.findById(consultationId);
    if (!consultation) {
      throw new Error('Consultation request not found');
    }

    if (consultation.status !== RequestStatus.CONTACTED) {
      throw new Error('Consultation must be contacted before scheduling');
    }

    // Validate scheduled date is in the future
    if (scheduledDate <= new Date()) {
      throw new Error('Scheduled date must be in the future');
    }

    const updatedConsultation = await ConsultationModel.updateStatus(
      consultationId,
      RequestStatus.SCHEDULED
    );

    // Send calendar invitation
    await this.sendCalendarInvitation(updatedConsultation, scheduledDate, scheduledTime, meetingLink);

    return updatedConsultation;
  }

  /**
   * Complete consultation
   */
  static async completeConsultation(
    consultationId: string,
    outcome: 'enrolled' | 'not_interested' | 'follow_up_needed',
    notes?: string
  ): Promise<ConsultationRequest> {
    const consultation = await ConsultationModel.findById(consultationId);
    if (!consultation) {
      throw new Error('Consultation request not found');
    }

    if (consultation.status !== RequestStatus.SCHEDULED) {
      throw new Error('Consultation must be scheduled before completion');
    }

    const updatedConsultation = await ConsultationModel.updateStatus(
      consultationId,
      RequestStatus.COMPLETED
    );

    // Handle different outcomes
    await this.handleConsultationOutcome(updatedConsultation, outcome, notes);

    return updatedConsultation;
  }

  /**
   * Cancel consultation request
   */
  static async cancelConsultationRequest(
    consultationId: string,
    reason?: string
  ): Promise<ConsultationRequest> {
    const consultation = await ConsultationModel.findById(consultationId);
    if (!consultation) {
      throw new Error('Consultation request not found');
    }

    if (consultation.status === RequestStatus.COMPLETED) {
      throw new Error('Cannot cancel completed consultation');
    }

    const updatedConsultation = await ConsultationModel.updateStatus(
      consultationId,
      RequestStatus.CANCELLED
    );

    // Send cancellation notification
    await this.sendCancellationNotification(updatedConsultation, reason);

    return updatedConsultation;
  }

  /**
   * Get consultation statistics
   */
  static async getConsultationStatistics(filters?: {
    startDate?: Date;
    endDate?: Date;
  }) {
    const stats = await ConsultationModel.getStatistics(filters);

    // Add additional business metrics
    const responseTimeGrade = this.gradeResponseTime(stats.averageResponseTimeHours);
    const conversionGrade = this.gradeConversionRate(stats.conversionRate);

    return {
      ...stats,
      responseTimeGrade,
      conversionGrade,
      recommendations: this.generateRecommendations(stats),
    };
  }

  /**
   * Get requests requiring attention
   */
  static async getRequestsRequiringAttention() {
    return ConsultationModel.getRequestsRequiringAttention();
  }

  /**
   * Get daily consultation trends
   */
  static async getDailyTrends(days: number = 30) {
    return ConsultationModel.getDailyTrends(days);
  }

  /**
   * Link consultation to user account
   */
  static async linkConsultationToUser(
    consultationId: string,
    userId: string
  ): Promise<ConsultationRequest> {
    const consultation = await ConsultationModel.findById(consultationId);
    if (!consultation) {
      throw new Error('Consultation request not found');
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return ConsultationModel.linkToUser(consultationId, userId);
  }

  /**
   * Get user's consultation history
   */
  static async getUserConsultationHistory(userId: string): Promise<ConsultationRequest[]> {
    return ConsultationModel.findByUserId(userId);
  }

  /**
   * Send consultation confirmation email
   */
  private static async sendConsultationConfirmation(consultation: ConsultationRequest): Promise<void> {
    // TODO: Implement email service
    const language = consultation.preferredLanguage === 'HE' ? 'Hebrew' : 'English';
    console.log(`Sending consultation confirmation in ${language} to ${consultation.email}`);

    // Email content would include:
    // - Confirmation of request receipt
    // - Expected response time (24 hours)
    // - Contact information
    // - What to expect in the consultation
  }

  /**
   * Notify admin team of new consultation request
   */
  private static async notifyAdminTeam(consultation: ConsultationRequest): Promise<void> {
    // TODO: Implement notification service (email, Slack, etc.)
    console.log(`New consultation request from ${consultation.firstName} ${consultation.lastName}`);

    // Notification would include:
    // - Contact details
    // - Preferred time slot
    // - Message/notes
    // - Link to admin dashboard
  }

  /**
   * Send status update notification
   */
  private static async sendStatusUpdateNotification(
    consultation: ConsultationRequest,
    status: RequestStatus,
    notes?: string
  ): Promise<void> {
    // TODO: Implement email service
    console.log(`Sending status update (${status}) to ${consultation.email}`);
  }

  /**
   * Send follow-up email after initial contact
   */
  private static async sendFollowUpEmail(
    consultation: ConsultationRequest,
    contactMethod: string,
    notes?: string
  ): Promise<void> {
    // TODO: Implement email service
    console.log(`Sending follow-up email to ${consultation.email} (contacted via ${contactMethod})`);
  }

  /**
   * Send calendar invitation
   */
  private static async sendCalendarInvitation(
    consultation: ConsultationRequest,
    scheduledDate: Date,
    scheduledTime: string,
    meetingLink?: string
  ): Promise<void> {
    // TODO: Implement calendar service
    console.log(`Sending calendar invitation to ${consultation.email} for ${scheduledDate.toDateString()} at ${scheduledTime}`);

    // Calendar invitation would include:
    // - Meeting date and time
    // - Meeting link (Zoom, Teams, etc.)
    // - Agenda/preparation notes
    // - Contact information
  }

  /**
   * Handle consultation outcome
   */
  private static async handleConsultationOutcome(
    consultation: ConsultationRequest,
    outcome: 'enrolled' | 'not_interested' | 'follow_up_needed',
    notes?: string
  ): Promise<void> {
    switch (outcome) {
      case 'enrolled':
        // Send enrollment information
        console.log(`Consultation ${consultation.id} resulted in enrollment`);
        break;
      case 'not_interested':
        // Send thank you and future opportunity email
        console.log(`Consultation ${consultation.id} - prospect not interested`);
        break;
      case 'follow_up_needed':
        // Schedule follow-up reminder
        console.log(`Consultation ${consultation.id} requires follow-up`);
        break;
    }
  }

  /**
   * Send cancellation notification
   */
  private static async sendCancellationNotification(
    consultation: ConsultationRequest,
    reason?: string
  ): Promise<void> {
    // TODO: Implement email service
    console.log(`Sending cancellation notification to ${consultation.email}`);
  }

  /**
   * Grade response time performance
   */
  private static gradeResponseTime(averageHours: number): string {
    if (averageHours <= 2) return 'Excellent';
    if (averageHours <= 6) return 'Good';
    if (averageHours <= 24) return 'Fair';
    return 'Needs Improvement';
  }

  /**
   * Grade conversion rate performance
   */
  private static gradeConversionRate(rate: number): string {
    if (rate >= 80) return 'Excellent';
    if (rate >= 60) return 'Good';
    if (rate >= 40) return 'Fair';
    return 'Needs Improvement';
  }

  /**
   * Generate performance recommendations
   */
  private static generateRecommendations(stats: any): string[] {
    const recommendations: string[] = [];

    if (stats.averageResponseTimeHours > 24) {
      recommendations.push('Consider implementing automated responses for faster initial contact');
    }

    if (stats.conversionRate < 50) {
      recommendations.push('Review consultation process to improve conversion rate');
    }

    if (stats.statusBreakdown.new > stats.statusBreakdown.contacted) {
      recommendations.push('Focus on processing new consultation requests');
    }

    return recommendations;
  }

  /**
   * Process daily consultation maintenance
   */
  static async processDailyMaintenance(): Promise<void> {
    console.log('Processing daily consultation maintenance...');

    // Get requests requiring attention
    const attention = await this.getRequestsRequiringAttention();

    // Log overdue requests
    if (attention.overdue.length > 0) {
      console.log(`WARNING: ${attention.overdue.length} consultation requests are overdue for response`);
    }

    if (attention.followUpNeeded.length > 0) {
      console.log(`INFO: ${attention.followUpNeeded.length} consultation requests need follow-up`);
    }

    // Archive old requests (older than 1 year)
    const archivedCount = await ConsultationModel.archiveOldRequests(12);
    if (archivedCount > 0) {
      console.log(`Archived ${archivedCount} old consultation requests`);
    }

    console.log('Daily consultation maintenance completed');
  }
}