// Temporary stub models to fix compilation errors
// These provide minimal functionality to get the backend running

export class ConsentModel {
  static async create(data: any) {
    return { id: 'stub', ...data };
  }

  static async findById(id: string) {
    return { id, granted: true };
  }

  static async findByUser(userId: string) {
    return [];
  }

  static async update(id: string, data: any) {
    return { id, ...data };
  }
}

export class DataPortabilityModel {
  static async create(data: any) {
    return { id: 'stub', status: 'PENDING', ...data };
  }

  static async findById(id: string) {
    return { id, status: 'COMPLETED', downloadUrl: null };
  }

  static async update(id: string, data: any) {
    return { id, ...data };
  }
}

export class PrivacyPolicyModel {
  static async getCurrentVersion() {
    return { version: '1.0', content: 'Privacy policy content' };
  }

  static async create(data: any) {
    return { id: 'stub', ...data };
  }
}

// Export UserModel with findAll method
export class UserModelStub {
  static async findAll(filters: any = {}) {
    return {
      users: [],
      total: 0,
      page: 1,
      limit: filters.limit || 20
    };
  }

  static async create(data: any) {
    return { id: 'stub', ...data };
  }

  static async findById(id: string) {
    return { id, email: 'test@example.com' };
  }

  static async findByEmail(email: string) {
    return null; // User not found
  }
}