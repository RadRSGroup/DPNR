import { Prisma } from '@prisma/client';

// Extended Prisma types with relations for type safety
export type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    enrollments: true;
    consultationRequests: true;
    privacyConsents: true;
  };
}>;

export type EnrollmentWithRelations = Prisma.EnrollmentGetPayload<{
  include: {
    user: true;
    cohort: true;
    paymentTransactions: true;
  };
}>;

export type CohortWithRelations = Prisma.CohortGetPayload<{
  include: {
    enrollments: {
      include: {
        user: true;
      };
    };
  };
}>;

export type PaymentTransactionWithRelations = Prisma.PaymentTransactionGetPayload<{
  include: {
    enrollment: {
      include: {
        user: true;
        cohort: true;
      };
    };
  };
}>;

// Partial types for updates that don't require all fields
export type UserCreateData = Omit<Prisma.UserCreateInput, 'enrollments' | 'consultationRequests' | 'privacyConsents'>;
export type UserUpdateData = Omit<Prisma.UserUpdateInput, 'enrollments' | 'consultationRequests' | 'privacyConsents'>;

export type EnrollmentCreateData = Omit<Prisma.EnrollmentCreateInput, 'user' | 'cohort' | 'paymentTransactions'> & {
  userId: string;
  cohortId: string;
};

export type EnrollmentUpdateData = Omit<Prisma.EnrollmentUpdateInput, 'user' | 'cohort' | 'paymentTransactions'>;

// Query result types for better type inference
export type EnrollmentListItem = Pick<EnrollmentWithRelations, 'id' | 'status' | 'paymentPlan' | 'totalAmount' | 'paidAmount' | 'enrollmentDate'> & {
  user: Pick<UserWithRelations, 'id' | 'firstName' | 'lastName' | 'email'>;
  cohort: Pick<CohortWithRelations, 'id' | 'name' | 'startDate' | 'endDate'>;
};

// Type guards for runtime type checking
export function isEnrollmentWithRelations(enrollment: any): enrollment is EnrollmentWithRelations {
  return enrollment && typeof enrollment === 'object' && 'user' in enrollment && 'cohort' in enrollment;
}

export function isUserWithRelations(user: any): user is UserWithRelations {
  return user && typeof user === 'object' && 'enrollments' in user;
}

// Utility types for API responses
export type ApiSuccessResponse<T = any> = {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
};

export type ApiErrorResponse = {
  success: false;
  error: string;
  message: string;
  details?: any;
  timestamp: string;
};

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;