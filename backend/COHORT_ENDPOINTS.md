# Cohort Management API Endpoints

Comprehensive API documentation for DPNR Course Registration Platform cohort management system.

## Base URL
`/v1/cohorts`

## Authentication Requirements
- **Public endpoints**: No authentication required
- **Admin-only endpoints**: Requires authentication with `admin` role
- **Authentication header**: `Authorization: Bearer <jwt-token>`

---

## Public Endpoints

### GET /v1/cohorts
**List all cohorts (public view)**

**Query Parameters:**
- `status` (optional): Filter by cohort status (UPCOMING, OPEN_ENROLLMENT, FULL, IN_PROGRESS, COMPLETED)
- `upcoming` (optional): Set to 'true' to get only upcoming cohorts
- `page` (optional): Page number for pagination
- `limit` (optional): Items per page

**Response:**
```json
{
  "success": true,
  "message": "Cohorts retrieved successfully",
  "data": {
    "cohorts": [
      {
        "id": "uuid",
        "name": "DPNR Cohort 2025-Q1",
        "startDate": "2025-01-15T00:00:00.000Z",
        "endDate": "2025-03-15T00:00:00.000Z",
        "status": "OPEN_ENROLLMENT",
        "location": "Mazkeret Batya",
        "schedule": "Weekly evenings, 1.5-2 hours",
        "maxCapacity": 20,
        "currentEnrollment": 5,
        "availableSpots": 15,
        "isEnrollmentOpen": true
      }
    ],
    "total": 1
  },
  "timestamp": "2025-01-20T10:00:00.000Z"
}
```

### GET /v1/cohorts/current
**Get current active cohort**

Returns the current cohort available for enrollment.

**Response:**
```json
{
  "success": true,
  "message": "Current cohort retrieved successfully",
  "data": {
    "id": "uuid",
    "name": "DPNR Cohort 2025-Q1",
    "startDate": "2025-01-15T00:00:00.000Z",
    "endDate": "2025-03-15T00:00:00.000Z",
    "status": "OPEN_ENROLLMENT",
    "location": "Mazkeret Batya",
    "schedule": "Weekly evenings, 1.5-2 hours",
    "maxCapacity": 20,
    "currentEnrollment": 5,
    "availableSpots": 15,
    "isEnrollmentOpen": true
  },
  "timestamp": "2025-01-20T10:00:00.000Z"
}
```

### GET /v1/cohorts/upcoming
**Get upcoming cohorts**

Returns all cohorts with UPCOMING status.

**Response:**
```json
{
  "success": true,
  "message": "Upcoming cohorts retrieved successfully",
  "data": {
    "cohorts": [
      {
        "id": "uuid",
        "name": "DPNR Cohort 2025-Q2",
        "startDate": "2025-04-15T00:00:00.000Z",
        "endDate": "2025-06-15T00:00:00.000Z",
        "status": "UPCOMING",
        "location": "Mazkeret Batya",
        "schedule": "Weekly evenings, 1.5-2 hours",
        "maxCapacity": 20,
        "currentEnrollment": 0,
        "availableSpots": 20
      }
    ],
    "total": 1
  },
  "timestamp": "2025-01-20T10:00:00.000Z"
}
```

### GET /v1/cohorts/:id
**Get specific cohort details**

Public users get basic information. Admins get detailed information including enrollments.

**Parameters:**
- `id`: Cohort UUID

**Public Response:**
```json
{
  "success": true,
  "message": "Cohort information retrieved successfully",
  "data": {
    "id": "uuid",
    "name": "DPNR Cohort 2025-Q1",
    "startDate": "2025-01-15T00:00:00.000Z",
    "endDate": "2025-03-15T00:00:00.000Z",
    "status": "OPEN_ENROLLMENT",
    "location": "Mazkeret Batya",
    "schedule": "Weekly evenings, 1.5-2 hours",
    "maxCapacity": 20,
    "currentEnrollment": 5,
    "availableSpots": 15,
    "isEnrollmentOpen": true
  },
  "timestamp": "2025-01-20T10:00:00.000Z"
}
```

---

## Admin-Only Endpoints

### POST /v1/cohorts
**Create new cohort**

**Authentication**: Admin required

**Request Body:**
```json
{
  "name": "DPNR Cohort 2025-Q1",
  "startDate": "2025-01-15T00:00:00.000Z",
  "endDate": "2025-03-15T00:00:00.000Z",
  "maxCapacity": 20,
  "location": "Mazkeret Batya",
  "schedule": "Weekly evenings, 1.5-2 hours"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cohort created successfully",
  "data": {
    "id": "uuid",
    "name": "DPNR Cohort 2025-Q1",
    "startDate": "2025-01-15T00:00:00.000Z",
    "endDate": "2025-03-15T00:00:00.000Z",
    "status": "UPCOMING",
    "location": "Mazkeret Batya",
    "schedule": "Weekly evenings, 1.5-2 hours",
    "maxCapacity": 20,
    "currentEnrollment": 0,
    "createdAt": "2025-01-20T10:00:00.000Z",
    "updatedAt": "2025-01-20T10:00:00.000Z"
  },
  "timestamp": "2025-01-20T10:00:00.000Z"
}
```

### PATCH /v1/cohorts/:id
**Update cohort**

**Authentication**: Admin required

**Parameters:**
- `id`: Cohort UUID

**Request Body (all fields optional):**
```json
{
  "name": "Updated Cohort Name",
  "startDate": "2025-01-20T00:00:00.000Z",
  "endDate": "2025-03-20T00:00:00.000Z",
  "maxCapacity": 25,
  "location": "Tel Aviv",
  "schedule": "Weekly mornings, 2 hours"
}
```

**Business Rules:**
- Cannot reduce capacity below current enrollment count
- End date must be after start date
- Capacity must be between 1 and 50

### PATCH /v1/cohorts/:id/status
**Update cohort status**

**Authentication**: Admin required

**Parameters:**
- `id`: Cohort UUID

**Request Body:**
```json
{
  "status": "OPEN_ENROLLMENT"
}
```

**Valid Status Transitions:**
- `UPCOMING` → `OPEN_ENROLLMENT`
- `OPEN_ENROLLMENT` → `FULL` or `IN_PROGRESS`
- `FULL` → `OPEN_ENROLLMENT` or `IN_PROGRESS`
- `IN_PROGRESS` → `COMPLETED`
- `COMPLETED` → (no transitions allowed)

### GET /v1/cohorts/statistics
**Get cohort statistics**

**Authentication**: Admin required

**Query Parameters:**
- `cohortId` (optional): Get statistics for specific cohort

**Response (specific cohort):**
```json
{
  "success": true,
  "message": "Cohort statistics retrieved successfully",
  "data": {
    "cohortInfo": {
      "id": "uuid",
      "name": "DPNR Cohort 2025-Q1",
      "status": "OPEN_ENROLLMENT",
      "startDate": "2025-01-15T00:00:00.000Z",
      "endDate": "2025-03-15T00:00:00.000Z",
      "capacity": 20,
      "enrolled": 5,
      "availableSpots": 15
    },
    "enrollmentStats": {
      "PENDING_PAYMENT": 2,
      "ACTIVE": 3
    },
    "totalRevenue": 15000.00,
    "averageRevenuePerStudent": 3000.00
  },
  "timestamp": "2025-01-20T10:00:00.000Z"
}
```

**Response (overall statistics):**
```json
{
  "success": true,
  "message": "Overall statistics retrieved successfully",
  "data": {
    "totalCohorts": 5,
    "upcomingCohorts": 2,
    "activeCohorts": 1,
    "completedCohorts": 2,
    "totalEnrollments": 85
  },
  "timestamp": "2025-01-20T10:00:00.000Z"
}
```

### GET /v1/cohorts/:id/enrollments
**Get cohort enrollments**

**Authentication**: Admin required

**Parameters:**
- `id`: Cohort UUID

**Response:**
```json
{
  "success": true,
  "message": "Cohort enrollments retrieved successfully",
  "data": {
    "cohort": {
      "id": "uuid",
      "name": "DPNR Cohort 2025-Q1",
      "status": "OPEN_ENROLLMENT",
      "maxCapacity": 20,
      "currentEnrollment": 5
    },
    "enrollments": [
      {
        "id": "uuid",
        "status": "ACTIVE",
        "paymentPlan": "FIVE_INSTALLMENTS",
        "totalAmount": 6400.00,
        "paidAmount": 1360.00,
        "remainingAmount": 5040.00,
        "enrollmentDate": "2025-01-10T10:00:00.000Z",
        "user": {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john.doe@example.com",
          "phone": "+972-50-1234567",
          "preferredLanguage": "HE"
        },
        "paymentTransactions": [
          {
            "id": "uuid",
            "amount": 1360.00,
            "status": "SUCCESS",
            "installmentNumber": 1,
            "processedAt": "2025-01-10T10:30:00.000Z",
            "paymentMethod": "credit_card"
          }
        ],
        "questionnaire": {
          "motivation": "Personal growth",
          "experience": "Beginner",
          "expectations": "Learn new skills"
        }
      }
    ],
    "statistics": {
      "totalEnrollments": 5,
      "enrollmentsByStatus": {
        "ACTIVE": 3,
        "PENDING_PAYMENT": 2
      },
      "totalRevenue": 8000.00,
      "outstandingPayments": 15000.00
    }
  },
  "timestamp": "2025-01-20T10:00:00.000Z"
}
```

### DELETE /v1/cohorts/:id
**Delete cohort**

**Authentication**: Admin required

**Parameters:**
- `id`: Cohort UUID

**Business Rules:**
- Cannot delete cohort with existing enrollments
- Permanently removes cohort from database

**Response:**
```json
{
  "success": true,
  "message": "Cohort deleted successfully",
  "data": {
    "deleted": true
  },
  "timestamp": "2025-01-20T10:00:00.000Z"
}
```

### POST /v1/cohorts/update-statuses
**Update cohort statuses based on dates**

**Authentication**: Admin required

**Description**: Updates cohort statuses automatically based on business rules:
- UPCOMING → OPEN_ENROLLMENT (30 days before start)
- OPEN_ENROLLMENT/FULL → IN_PROGRESS (on start date)
- IN_PROGRESS → COMPLETED (on end date)

**Response:**
```json
{
  "success": true,
  "message": "Cohort statuses updated successfully",
  "data": {
    "updated": true
  },
  "timestamp": "2025-01-20T10:00:00.000Z"
}
```

### GET /v1/cohorts/management/attention
**Get cohorts needing attention**

**Authentication**: Admin required

**Description**: Returns cohorts that require administrative attention.

**Response:**
```json
{
  "success": true,
  "message": "Cohorts needing attention retrieved successfully",
  "data": {
    "startingSoon": [
      {
        "id": "uuid",
        "name": "DPNR Cohort 2025-Q1",
        "startDate": "2025-01-22T00:00:00.000Z",
        "status": "OPEN_ENROLLMENT",
        "currentEnrollment": 5,
        "maxCapacity": 20
      }
    ],
    "underEnrolled": [
      {
        "id": "uuid",
        "name": "DPNR Cohort 2025-Q1",
        "currentEnrollment": 3,
        "maxCapacity": 20,
        "enrollmentPercentage": 15
      }
    ],
    "needsStatusUpdate": [
      {
        "id": "uuid",
        "name": "DPNR Cohort 2025-Q1",
        "status": "UPCOMING",
        "startDate": "2025-01-25T00:00:00.000Z",
        "suggestedStatus": "OPEN_ENROLLMENT"
      }
    ]
  },
  "timestamp": "2025-01-20T10:00:00.000Z"
}
```

---

## Error Responses

### Common Error Codes
- `UNAUTHORIZED` (401): Authentication required
- `FORBIDDEN` (403): Admin access required
- `VALIDATION_ERROR` (400): Invalid input data
- `RESOURCE_NOT_FOUND` (404): Cohort not found
- `DUPLICATE_RESOURCE` (409): Cohort name already exists
- `OPERATION_NOT_ALLOWED` (409): Business rule violation
- `INTERNAL_SERVER_ERROR` (500): Server error

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "End date must be after start date",
    "details": [
      {
        "field": "endDate",
        "message": "End date must be after start date",
        "code": "custom"
      }
    ]
  },
  "timestamp": "2025-01-20T10:00:00.000Z"
}
```

---

## Business Logic Rules

### Status Management
1. **Automatic Status Updates**: Run daily via `/update-statuses` endpoint
2. **Capacity Management**: Status changes from OPEN_ENROLLMENT ↔ FULL based on enrollment count
3. **Date-based Transitions**: Status updates based on start/end dates

### Enrollment Capacity
1. **Maximum capacity**: 50 students per cohort (default: 20)
2. **Enrollment tracking**: Real-time updates via `updateEnrollmentCount()` method
3. **Waitlist support**: When status is FULL, enrollment requests can be queued

### Access Control
1. **Public access**: Basic cohort information for enrollment decisions
2. **Admin access**: Full CRUD operations and sensitive data
3. **Role validation**: Middleware enforces admin-only endpoints

### Data Validation
1. **Date validation**: End date must be after start date
2. **Capacity validation**: Must be between 1-50, cannot reduce below current enrollment
3. **Status transitions**: Enforced business logic for valid state changes
4. **UUID validation**: All IDs must be valid UUID format

---

## Integration Notes

### Frontend Integration
- Use `/current` endpoint for landing page enrollment section
- Use `/upcoming` endpoint for course preview sections
- Public endpoints require no authentication

### Admin Dashboard Integration
- Use `/statistics` for dashboard metrics
- Use `/management/attention` for admin alerts
- Use `/enrollments` endpoints for detailed enrollment management

### Automated Tasks
- Schedule `/update-statuses` to run daily
- Monitor `/management/attention` for administrative alerts
- Use capacity management methods when processing enrollments

Last updated: 2025-01-20