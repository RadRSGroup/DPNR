import { UserService } from '../../../src/services/user.service';
import { testDb, createTestUser } from '../../setup';

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
  });

  describe('createUser', () => {
    it('should create a new user with student role by default', async () => {
      const userData = {
        cognitoId: 'test-cognito-123',
        email: 'newuser@example.com',
        name: 'New User'
      };

      const user = await userService.createUser(userData);

      expect(user).toHaveProperty('id');
      expect(user.cognitoId).toBe(userData.cognitoId);
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.role).toBe('student');
      expect(user.isActive).toBe(true);
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should create user with specified role', async () => {
      const userData = {
        cognitoId: 'instructor-cognito-123',
        email: 'instructor@example.com',
        name: 'Test Instructor',
        role: 'instructor' as const
      };

      const user = await userService.createUser(userData);

      expect(user.role).toBe('instructor');
    });

    it('should throw error for duplicate cognitoId', async () => {
      const userData = {
        cognitoId: 'duplicate-cognito',
        email: 'first@example.com',
        name: 'First User'
      };

      await userService.createUser(userData);

      await expect(userService.createUser({
        ...userData,
        email: 'second@example.com',
        name: 'Second User'
      })).rejects.toThrow();
    });

    it('should throw error for duplicate email', async () => {
      const email = 'duplicate@example.com';

      await userService.createUser({
        cognitoId: 'first-cognito',
        email,
        name: 'First User'
      });

      await expect(userService.createUser({
        cognitoId: 'second-cognito',
        email,
        name: 'Second User'
      })).rejects.toThrow();
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      const testUser = await createTestUser();
      const user = await userService.getUserById(testUser.id);

      expect(user).toBeTruthy();
      expect(user?.id).toBe(testUser.id);
      expect(user?.email).toBe(testUser.email);
    });

    it('should return null for non-existent user', async () => {
      const user = await userService.getUserById('non-existent-id');
      expect(user).toBeNull();
    });
  });

  describe('getUserByCognitoId', () => {
    it('should return user by Cognito ID', async () => {
      const testUser = await createTestUser({ cognitoId: 'test-cognito-456' });
      const user = await userService.getUserByCognitoId('test-cognito-456');

      expect(user).toBeTruthy();
      expect(user?.cognitoId).toBe('test-cognito-456');
      expect(user?.id).toBe(testUser.id);
    });

    it('should return null for non-existent Cognito ID', async () => {
      const user = await userService.getUserByCognitoId('non-existent-cognito');
      expect(user).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user by email', async () => {
      const email = 'test.email@example.com';
      const testUser = await createTestUser({ email });
      const user = await userService.getUserByEmail(email);

      expect(user).toBeTruthy();
      expect(user?.email).toBe(email);
      expect(user?.id).toBe(testUser.id);
    });

    it('should return null for non-existent email', async () => {
      const user = await userService.getUserByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user name', async () => {
      const testUser = await createTestUser();
      const newName = 'Updated Name';

      const updatedUser = await userService.updateUser(testUser.id, { name: newName });

      expect(updatedUser.name).toBe(newName);
      expect(updatedUser.id).toBe(testUser.id);
      expect(updatedUser.email).toBe(testUser.email);
    });

    it('should update user profile', async () => {
      const testUser = await createTestUser();
      const profileData = {
        bio: 'Updated bio',
        phone: '+972501234567',
        website: 'https://example.com'
      };

      const updatedUser = await userService.updateUser(testUser.id, { profile: profileData });

      expect(updatedUser.profile).toEqual(profileData);
    });

    it('should update user preferences', async () => {
      const testUser = await createTestUser();
      const preferences = {
        language: 'en',
        timezone: 'UTC',
        notifications: {
          email: true,
          sms: false,
          push: true
        }
      };

      const updatedUser = await userService.updateUser(testUser.id, { preferences });

      expect(updatedUser.preferences).toEqual(preferences);
    });

    it('should throw error for non-existent user', async () => {
      await expect(userService.updateUser('non-existent-id', { name: 'New Name' }))
        .rejects.toThrow();
    });
  });

  describe('updateUserRole', () => {
    it('should update user role', async () => {
      const testUser = await createTestUser({ role: 'student' });

      const updatedUser = await userService.updateUserRole(testUser.id, 'instructor');

      expect(updatedUser.role).toBe('instructor');
    });

    it('should throw error for invalid role', async () => {
      const testUser = await createTestUser();

      await expect(userService.updateUserRole(testUser.id, 'invalid-role' as any))
        .rejects.toThrow();
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user', async () => {
      const testUser = await createTestUser({ isActive: true });

      const deactivatedUser = await userService.deactivateUser(testUser.id);

      expect(deactivatedUser.isActive).toBe(false);
      expect(deactivatedUser.deletedAt).toBeInstanceOf(Date);
    });

    it('should throw error for already deactivated user', async () => {
      const testUser = await createTestUser({ isActive: false, deletedAt: new Date() });

      await expect(userService.deactivateUser(testUser.id))
        .rejects.toThrow('User is already deactivated');
    });
  });

  describe('reactivateUser', () => {
    it('should reactivate deactivated user', async () => {
      const testUser = await createTestUser({ isActive: false, deletedAt: new Date() });

      const reactivatedUser = await userService.reactivateUser(testUser.id);

      expect(reactivatedUser.isActive).toBe(true);
      expect(reactivatedUser.deletedAt).toBeNull();
    });

    it('should throw error for already active user', async () => {
      const testUser = await createTestUser({ isActive: true });

      await expect(userService.reactivateUser(testUser.id))
        .rejects.toThrow('User is already active');
    });
  });

  describe('getAllUsers', () => {
    it('should return paginated users', async () => {
      // Create multiple test users
      await createTestUser({ email: 'user1@example.com', cognitoId: 'cognito-1' });
      await createTestUser({ email: 'user2@example.com', cognitoId: 'cognito-2' });
      await createTestUser({ email: 'user3@example.com', cognitoId: 'cognito-3' });

      const result = await userService.getAllUsers({ page: 1, limit: 2 });

      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(2);
    });

    it('should filter users by role', async () => {
      await createTestUser({ email: 'student@example.com', cognitoId: 'student-1', role: 'student' });
      await createTestUser({ email: 'instructor@example.com', cognitoId: 'instructor-1', role: 'instructor' });
      await createTestUser({ email: 'admin@example.com', cognitoId: 'admin-1', role: 'admin' });

      const result = await userService.getAllUsers({ role: 'instructor' });

      expect(result.users).toHaveLength(1);
      expect(result.users[0].role).toBe('instructor');
    });

    it('should filter users by search term', async () => {
      await createTestUser({ email: 'john.doe@example.com', cognitoId: 'john-1', name: 'John Doe' });
      await createTestUser({ email: 'jane.smith@example.com', cognitoId: 'jane-1', name: 'Jane Smith' });

      const result = await userService.getAllUsers({ search: 'john' });

      expect(result.users).toHaveLength(1);
      expect(result.users[0].name).toBe('John Doe');
    });

    it('should exclude inactive users by default', async () => {
      await createTestUser({ email: 'active@example.com', cognitoId: 'active-1', isActive: true });
      await createTestUser({ email: 'inactive@example.com', cognitoId: 'inactive-1', isActive: false });

      const result = await userService.getAllUsers();

      expect(result.users).toHaveLength(1);
      expect(result.users[0].isActive).toBe(true);
    });

    it('should include inactive users when specified', async () => {
      await createTestUser({ email: 'active@example.com', cognitoId: 'active-1', isActive: true });
      await createTestUser({ email: 'inactive@example.com', cognitoId: 'inactive-1', isActive: false });

      const result = await userService.getAllUsers({ includeInactive: true });

      expect(result.users).toHaveLength(2);
    });
  });
});