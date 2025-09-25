# DPNR Enrollment API Endpoints

## Overview

Comprehensive enrollment API endpoints for the DPNR course registration system. All endpoints follow the established scalable patterns with proper authentication, validation, and error handling.

## Base URL
```
http://localhost:3001/v1/enrollments
```

## Authentication
All endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <jwt-token>
```

## Endpoints

### 1. Create Enrollment
Creates a new enrollment for the authenticated user.

**Endpoint:** `POST /v1/enrollments`
**Auth Required:** Yes
**Access:** Student, Admin

**Request Body:**
```json
{
  "cohortId": "uuid",
  "paymentPlan": "FULL" | "FIVE_INSTALLMENTS" | "TWELVE_INSTALLMENTS",
  "questionnaire": {
    "motivation": "string (min 10 chars)",
    "previousExperience": boolean,
    "expectations": "string (min 5 chars)",
    "referralSource": "string (optional)",
    "specialNeeds": "string (optional)",
    "agreedToTerms": true,
    "agreedToPrivacy": true,
    "marketingConsent": boolean,
    "submittedAt": "date"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Enrollment created successfully",
  "data": {
    "id": "uuid",
    "status": "PENDING_PAYMENT",
    "paymentPlan": "FULL",
    "totalAmount": "6400.00",
    "paidAmount": "0.00",
    "enrollmentDate": "2025-09-23T09:00:00Z",
    "user": { ... },
    "cohort": { ... },
    "questionnaire": { ... }
  },
  "timestamp": "2025-09-23T09:00:00Z"
}
```

**Error Responses:**
- `400` - Validation errors (invalid data, missing fields)
- `404` - Cohort not found
- `409` - Already enrolled in cohort or cohort at capacity

### 2. Get User's Enrollments
Retrieves all enrollments for the authenticated user.

**Endpoint:** `GET /v1/enrollments/my`
**Auth Required:** Yes
**Access:** Student, Admin

**Response (200):**
```json
{
  "success": true,
  "message": "User enrollments retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "status": "ACTIVE",
      "paymentPlan": "FULL",
      "totalAmount": "6400.00",
      "paidAmount": "6400.00",
      "enrollmentDate": "2025-09-23T09:00:00Z",
      "cohort": {
        "id": "uuid",
        "name": "Cohort 2025-Q1",
        "startDate": "2025-10-01",
        "endDate": "2025-12-31",
        "location": "Mazkeret Batya",
        "schedule": "Weekly evenings"
      },
      "questionnaire": { ... },
      "remainingAmount": 0,
      "isFullyPaid": true,
      "nextInstallmentAmount": null
    }
  ],
  "timestamp": "2025-09-23T09:00:00Z"
}
```

### 3. Get Specific Enrollment
Retrieves details for a specific enrollment.

**Endpoint:** `GET /v1/enrollments/:id`
**Auth Required:** Yes
**Access:** Owner or Admin

**Response (200):**
```json
{
  "success": true,
  "message": "Enrollment details retrieved successfully",
  "data": {
    "id": "uuid",
    "status": "ACTIVE",
    "paymentPlan": "FIVE_INSTALLMENTS",
    "totalAmount": "6800.00",
    "paidAmount": "2720.00",
    "enrollmentDate": "2025-09-23T09:00:00Z",
    "createdAt": "2025-09-23T09:00:00Z",
    "updatedAt": "2025-09-23T09:30:00Z",
    "user": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+972501234567"
    },
    "cohort": { ... },
    "questionnaire": { ... },
    "paymentTransactions": [
      {
        "id": "uuid",
        "amount": "1360.00",
        "status": "SUCCESS",
        "installmentNumber": 1,
        "processedAt": "2025-09-23T09:00:00Z",
        "paymentMethod": "credit_card"
      }
    ],
    "remainingAmount": 4080,
    "isFullyPaid": false,
    "nextInstallmentAmount": 1360
  },
  "timestamp": "2025-09-23T09:00:00Z"
}
```

**Error Responses:**
- `403` - Access denied (not owner or admin)
- `404` - Enrollment not found

### 4. Update Enrollment
Updates enrollment details (questionnaire or status).

**Endpoint:** `PATCH /v1/enrollments/:id`
**Auth Required:** Yes
**Access:** Owner or Admin

**Request Body:**
```json
{
  "questionnaire": {
    "motivation": "Updated motivation text",
    "previousExperience": true,
    "expectations": "Updated expectations",
    "referralSource": "Updated source",
    "specialNeeds": "Updated needs",
    "agreedToTerms": true,
    "agreedToPrivacy": true,
    "marketingConsent": false,
    "submittedAt": "2025-09-23T09:30:00Z"
  },
  "status": "CANCELLED" // Only for cancellation by students
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Enrollment updated successfully",
  "data": { ... }, // Full enrollment object
  "timestamp": "2025-09-23T09:00:00Z"
}
```

**Error Responses:**
- `403` - Access denied or invalid status change
- `404` - Enrollment not found
- `409` - Invalid operation (e.g., cancelling completed enrollment)

### 5. Cancel/Delete Enrollment
Cancels or deletes an enrollment.

**Endpoint:** `DELETE /v1/enrollments/:id`
**Auth Required:** Yes
**Access:** Owner or Admin

**Response (200):**
```json
{
  "success": true,
  "message": "Enrollment cancelled successfully", // or "deleted" for admin
  "data": {
    "id": "uuid",
    "status": "CANCELLED",
    // ... other enrollment fields
  },
  "timestamp": "2025-09-23T09:00:00Z"
}
```

**Admin Hard Delete Response:**
```json
{
  "success": true,
  "message": "Enrollment deleted successfully",
  "data": {
    "deleted": true
  },
  "timestamp": "2025-09-23T09:00:00Z"
}
```

**Error Responses:**
- `403` - Access denied
- `404` - Enrollment not found
- `409` - Cannot delete (e.g., completed enrollment for non-admin)

### 6. Process Payment
Processes a payment for an enrollment.

**Endpoint:** `POST /v1/enrollments/:id/payment`
**Auth Required:** Yes
**Access:** Owner

**Request Body:**
```json
{
  "amount": 1360,
  "paymentMethod": "credit_card",
  "tranzillaReference": "TRX-12345-67890"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "enrollment": { ... }, // Updated enrollment object
    "paymentProcessed": true,
    "remainingAmount": 4080,
    "isFullyPaid": false
  },
  "timestamp": "2025-09-23T09:00:00Z"
}
```

**Error Responses:**
- `403` - Access denied
- `404` - Enrollment not found
- `409` - Cannot process payment (already paid, cancelled, etc.)

## Admin-Only Endpoints

### 7. Get All Enrollments (Admin)
Retrieves all enrollments with filtering.

**Endpoint:** `GET /v1/enrollments`
**Auth Required:** Yes
**Access:** Admin only

**Query Parameters:**
- `status` - Filter by enrollment status
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)

**Response (200):**
```json
{
  "success": true,
  "message": "Enrollments retrieved successfully",
  "data": {
    "enrollments": [
      {
        "id": "uuid",
        "status": "ACTIVE",
        "paymentPlan": "FULL",
        "totalAmount": "6400.00",
        "paidAmount": "6400.00",
        "enrollmentDate": "2025-09-23T09:00:00Z",
        "user": {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com",
          "phone": "+972501234567"
        },
        "cohort": {
          "id": "uuid",
          "name": "Cohort 2025-Q1",
          "startDate": "2025-10-01",
          "endDate": "2025-12-31"
        },
        "remainingAmount": 0,
        "isFullyPaid": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 25
    }
  },
  "timestamp": "2025-09-23T09:00:00Z"
}
```

### 8. Get Enrollment Statistics (Admin)
Retrieves enrollment statistics.

**Endpoint:** `GET /v1/enrollments/statistics`
**Auth Required:** Yes
**Access:** Admin only

**Query Parameters:**
- `cohortId` - Filter by specific cohort (optional)

**Response (200):**
```json
{
  "success": true,
  "message": "Enrollment statistics retrieved successfully",
  "data": {
    "totalEnrollments": 45,
    "activeEnrollments": 32,
    "pendingPayments": 8,
    "completedEnrollments": 3,
    "cancelledEnrollments": 2
  },
  "timestamp": "2025-09-23T09:00:00Z"
}
```

### 9. Get Enrollments Requiring Action (Admin)
Retrieves enrollments that need attention.

**Endpoint:** `GET /v1/enrollments/pending`
**Auth Required:** Yes
**Access:** Admin only

**Response (200):**
```json
{
  "success": true,
  "message": "Enrollments requiring action retrieved successfully",
  "data": {
    "pendingPayments": [
      {
        "id": "uuid",
        "user": { ... },
        "cohort": { ... },
        "createdAt": "2025-09-22T09:00:00Z"
      }
    ],
    "staleEnrollments": [
      {
        "id": "uuid",
        "user": { ... },
        "cohort": { ... },
        "updatedAt": "2025-09-15T09:00:00Z"
      }
    ]
  },
  "timestamp": "2025-09-23T09:00:00Z"
}
```

## Payment Plans

### FULL Payment
- **Total Amount:** ₪6,400
- **Installments:** 1
- **Per Payment:** ₪6,400

### FIVE_INSTALLMENTS
- **Total Amount:** ₪6,800 (₪400 fee)
- **Installments:** 5
- **Per Payment:** ₪1,360

### TWELVE_INSTALLMENTS
- **Total Amount:** ₪6,960 (₪560 fee)
- **Installments:** 12
- **Per Payment:** ₪580

## Error Handling

All endpoints follow standardized error response format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      // Additional error details (for validation errors)
    }
  },
  "timestamp": "2025-09-23T09:00:00Z"
}
```

### Common Error Codes
- `MISSING_TOKEN` - No authorization token provided
- `INVALID_TOKEN` - Token is invalid or expired
- `FORBIDDEN` - Insufficient permissions
- `RESOURCE_NOT_FOUND` - Enrollment/cohort not found
- `VALIDATION_ERROR` - Request validation failed
- `DUPLICATE_RESOURCE` - Already enrolled in cohort
- `RESOURCE_CONFLICT` - Business logic conflict (cohort full, etc.)
- `OPERATION_NOT_ALLOWED` - Invalid operation for current state

## Business Rules

### Enrollment Creation
1. User can only enroll once per cohort
2. Cohort must have available capacity
3. Cohort must be in OPEN_ENROLLMENT status
4. All questionnaire fields must be completed
5. Terms and privacy policy must be agreed to

### Payment Processing
1. Payments can only be made on PENDING_PAYMENT or ACTIVE enrollments
2. Cannot exceed total amount owed
3. Full payment automatically changes status to ACTIVE
4. Payment transactions are recorded for audit trail

### Status Transitions
- `PENDING_PAYMENT` → `ACTIVE` (on full payment)
- `PENDING_PAYMENT` → `CANCELLED` (by user or admin)
- `ACTIVE` → `COMPLETED` (by admin on course completion)
- `ACTIVE` → `CANCELLED` (by admin only)
- `ACTIVE` → `REFUNDED` (by admin only)

### Access Control
- Students can only access their own enrollments
- Students can only cancel PENDING_PAYMENT enrollments
- Admins can access all enrollments and perform all operations
- Only enrollment owners can process payments

## Integration Points

### Authentication
- Integrates with AWS Cognito authentication system
- User information extracted from JWT tokens
- Role-based access control (STUDENT/ADMIN)

### Database
- Full Prisma ORM integration
- Atomic transactions for enrollment creation
- Automatic cohort capacity management
- Comprehensive audit trails

### Payment Processing
- Ready for Tranzila payment gateway integration
- Support for installment plans
- Transaction recording and status tracking

## Testing

Run the enrollment model tests:
```bash
npx ts-node src/test-enrollment-model.ts
```

This validates:
- ✅ Database integration
- ✅ Payment calculations
- ✅ Status management
- ✅ Statistics generation
- ✅ Business rule enforcement

## Next Steps

1. **Frontend Integration**: Connect React components to these endpoints
2. **Payment Gateway**: Implement Tranzila payment processing
3. **Email Notifications**: Add enrollment confirmation emails
4. **Advanced Reporting**: Build dashboard analytics
5. **Audit Logging**: Enhanced tracking for compliance