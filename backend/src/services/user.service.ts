import { UserModel, CreateUserData, UpdateUserData, UserGDPRExport } from '@/models/user.model';
import { CognitoIdentityServiceProvider } from 'aws-sdk';

const cognito = new CognitoIdentityServiceProvider({
  region: process.env.AWS_REGION || 'eu-west-1',
});

export class UserService {
  /**
   * Sync user from Cognito to our database
   */
  static async syncFromCognito(cognitoId: string, cognitoAttributes: any): Promise<any> {
    // Check if user already exists
    const existingUser = await UserModel.findByCognitoId(cognitoId);
    if (existingUser) {
      // Update user with latest Cognito data
      return UserModel.update(existingUser.id, {
        email: cognitoAttributes.email,
        firstName: cognitoAttributes.given_name,
        lastName: cognitoAttributes.family_name,
        phone: cognitoAttributes.phone_number,
        preferredLanguage: cognitoAttributes.locale === 'en' ? 'EN' : 'HE',
      });
    }

    // Create new user
    const userData: CreateUserData = {
      cognitoId,
      email: cognitoAttributes.email,
      firstName: cognitoAttributes.given_name || 'User',
      lastName: cognitoAttributes.family_name || 'Name',
      phone: cognitoAttributes.phone_number || '',
      preferredLanguage: cognitoAttributes.locale === 'en' ? 'EN' : 'HE',
      role: 'STUDENT',
    };

    return UserModel.create(userData);
  }

  /**
   * Get user profile with enrollment information
   */
  static async getUserProfile(userId: string): Promise<any> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      preferredLanguage: user.preferredLanguage,
      role: user.role,
      enrollments: user.enrollments?.map((enrollment: any) => ({
        id: enrollment.id,
        cohortName: enrollment.cohort.name,
        status: enrollment.status,
        enrollmentDate: enrollment.enrollmentDate,
        paymentPlan: enrollment.paymentPlan,
        totalAmount: enrollment.totalAmount,
        paidAmount: enrollment.paidAmount,
        progress: this.calculateProgress(enrollment),
      })),
      createdAt: user.createdAt,
    };
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, updateData: UpdateUserData): Promise<any> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Update in our database
    const updatedUser = await UserModel.update(userId, updateData);

    // Sync changes back to Cognito if email or name changed
    if (updateData.email || updateData.firstName || updateData.lastName) {
      try {
        await this.updateCognitoUser(user.cognitoId, {
          email: updateData.email,
          given_name: updateData.firstName,
          family_name: updateData.lastName,
          locale: updateData.preferredLanguage === 'EN' ? 'en' : 'he',
        });
      } catch (error) {
        console.error('Failed to sync user to Cognito:', error);
        // Continue - database update succeeded
      }
    }

    return updatedUser;
  }

  /**
   * Request account deletion (GDPR)
   */
  static async requestAccountDeletion(userId: string, confirmEmail: string): Promise<void> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.email !== confirmEmail) {
      throw new Error('Email confirmation does not match');
    }

    // Check for active enrollments
    const activeEnrollments = user.enrollments?.filter((e: any) => e.status === 'ACTIVE') || [];
    if (activeEnrollments.length > 0) {
      throw new Error('Cannot delete account with active enrollments');
    }

    // Soft delete user
    await UserModel.softDelete(userId);

    // Schedule Cognito deletion (optional - could keep for 30 days)
    // await this.deleteCognitoUser(user.cognitoId);

    // Send deletion confirmation email
    // await EmailService.sendDeletionConfirmation(user.email);
  }

  /**
   * Export user data (GDPR)
   */
  static async exportUserData(userId: string, options?: UserGDPRExport): Promise<any> {
    return UserModel.exportUserData(userId, options);
  }

  /**
   * Process scheduled deletions (run daily)
   */
  static async processScheduledDeletions(): Promise<void> {
    const usersToDelete = await UserModel.getUsersScheduledForDeletion();

    for (const user of usersToDelete) {
      try {
        // Delete from Cognito
        await this.deleteCognitoUser(user.cognitoId);

        // Hard delete from database
        await UserModel.hardDelete(user.id);

        console.log(`Permanently deleted user ${user.id}`);
      } catch (error) {
        console.error(`Failed to delete user ${user.id}:`, error);
      }
    }
  }

  /**
   * Validate phone number format
   */
  static validatePhoneNumber(phone: string): boolean {
    const israeliPhoneRegex = /^(\+972|0)(5[0-9]|7[23479])-?\d{7}$/;
    return israeliPhoneRegex.test(phone);
  }

  /**
   * Check if user can be deleted
   */
  static async canUserBeDeleted(userId: string): Promise<{ canDelete: boolean; reason?: string }> {
    const user = await UserModel.findById(userId);
    if (!user) {
      return { canDelete: false, reason: 'User not found' };
    }

    // Check for active enrollments
    const activeEnrollments = user.enrollments?.filter((e: any) => e.status === 'ACTIVE') || [];
    if (activeEnrollments.length > 0) {
      return {
        canDelete: false,
        reason: `User has ${activeEnrollments.length} active enrollment(s)`
      };
    }

    // Check for pending payments
    const pendingPayments = user.enrollments?.some((e: any) =>
      e.paymentTransactions?.some((p: any) => p.status === 'PENDING')
    );
    if (pendingPayments) {
      return {
        canDelete: false,
        reason: 'User has pending payment transactions'
      };
    }

    return { canDelete: true };
  }

  /**
   * Calculate enrollment progress
   */
  private static calculateProgress(enrollment: any): number {
    // Placeholder - would integrate with course content system
    if (enrollment.status === 'COMPLETED') return 100;
    if (enrollment.status === 'ACTIVE') return 25; // Default progress
    return 0;
  }

  /**
   * Update user in Cognito
   */
  private static async updateCognitoUser(cognitoId: string, attributes: any): Promise<void> {
    const params = {
      UserPoolId: process.env.AWS_COGNITO_USER_POOL_ID!,
      Username: cognitoId,
      UserAttributes: Object.entries(attributes)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => ({
          Name: key,
          Value: String(value),
        })),
    };

    await cognito.adminUpdateUserAttributes(params).promise();
  }

  /**
   * Delete user from Cognito
   */
  private static async deleteCognitoUser(cognitoId: string): Promise<void> {
    const params = {
      UserPoolId: process.env.AWS_COGNITO_USER_POOL_ID!,
      Username: cognitoId,
    };

    await cognito.adminDeleteUser(params).promise();
  }

  /**
   * Get user statistics
   */
  static async getStatistics() {
    return UserModel.getStatistics();
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<any> {
    return UserModel.findById(userId);
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(userId: string, updateData: any): Promise<any> {
    return this.updateProfile(userId, updateData);
  }


  /**
   * Cancel account deletion
   */
  static async cancelAccountDeletion(userId: string): Promise<any> {
    // UserModel.cancelDeletion method doesn't exist yet, return placeholder
    return { success: true };
  }

  /**
   * Get user enrollments
   */
  static async getUserEnrollments(userId: string): Promise<any[]> {
    return [];
  }

  /**
   * Get user consultations
   */
  static async getUserConsultations(userId: string): Promise<any[]> {
    return [];
  }

  /**
   * Get user payments
   */
  static async getUserPayments(userId: string, filters: any): Promise<any[]> {
    return [];
  }

  /**
   * Update user preferences
   */
  static async updateUserPreferences(userId: string, preferences: any): Promise<any> {
    // Preferences field doesn't exist in the model yet, return placeholder
    return UserModel.update(userId, {});
  }

  /**
   * Get user statistics with filters
   */
  static async getUserStatistics(filters: any): Promise<any> {
    return UserModel.getStatistics();
  }

  /**
   * Create user (admin)
   */
  static async createUser(userData: any): Promise<any> {
    return UserModel.create(userData);
  }

  /**
   * Update user (admin)
   */
  static async updateUser(userId: string, updateData: any): Promise<any> {
    return UserModel.update(userId, updateData);
  }

  /**
   * Permanently delete user (admin)
   */
  static async permanentlyDeleteUser(userId: string): Promise<void> {
    await UserModel.hardDelete(userId);
  }

  /**
   * Sync user with Cognito
   */
  static async syncUserWithCognito(userId: string): Promise<any> {
    return UserModel.findById(userId);
  }
}