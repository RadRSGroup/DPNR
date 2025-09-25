# Cohort API Usage Examples

Practical examples of how to use the cohort management endpoints in the DPNR Course Registration Platform.

## Frontend Integration Examples

### 1. Landing Page - Show Current Enrollment Options

```javascript
// Get current cohort for enrollment
const getCurrentCohort = async () => {
  try {
    const response = await fetch('/v1/cohorts/current');
    const result = await response.json();
    
    if (result.success && result.data) {
      const cohort = result.data;
      
      // Display enrollment information
      displayEnrollmentInfo({
        name: cohort.name,
        startDate: new Date(cohort.startDate).toLocaleDateString('he-IL'),
        location: cohort.location,
        schedule: cohort.schedule,
        availableSpots: cohort.availableSpots,
        isEnrollmentOpen: cohort.isEnrollmentOpen
      });
    } else {
      showNoActiveCohortsMessage();
    }
  } catch (error) {
    console.error('Failed to fetch current cohort:', error);
    showErrorMessage();
  }
};

// Usage
getCurrentCohort();
```

### 2. Course Preview - Show Upcoming Cohorts

```javascript
// Get upcoming cohorts for preview
const getUpcomingCohorts = async () => {
  try {
    const response = await fetch('/v1/cohorts/upcoming');
    const result = await response.json();
    
    if (result.success) {
      const cohorts = result.data.cohorts;
      
      // Display course preview
      cohorts.forEach(cohort => {
        addCohortPreview({
          id: cohort.id,
          name: cohort.name,
          startDate: new Date(cohort.startDate).toLocaleDateString('he-IL'),
          duration: calculateDuration(cohort.startDate, cohort.endDate),
          location: cohort.location,
          schedule: cohort.schedule
        });
      });
    }
  } catch (error) {
    console.error('Failed to fetch upcoming cohorts:', error);
  }
};
```

### 3. Enrollment Form - Check Capacity Before Submission

```javascript
// Check if cohort can accept enrollments
const checkEnrollmentAvailability = async (cohortId) => {
  try {
    const response = await fetch(`/v1/cohorts/${cohortId}`);
    const result = await response.json();
    
    if (result.success) {
      const cohort = result.data;
      
      if (cohort.isEnrollmentOpen && cohort.availableSpots > 0) {
        enableEnrollmentForm();
        updateAvailabilityMessage(`${cohort.availableSpots} spots remaining`);
      } else {
        disableEnrollmentForm();
        if (cohort.availableSpots === 0) {
          showWaitlistOption();
        } else {
          showEnrollmentClosedMessage();
        }
      }
    }
  } catch (error) {
    console.error('Failed to check enrollment availability:', error);
  }
};
```

## Admin Dashboard Integration

### 4. Dashboard Statistics

```javascript
// Get overall statistics for dashboard
const getDashboardStats = async () => {
  try {
    const response = await fetch('/v1/cohorts/statistics', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    const result = await response.json();
    
    if (result.success) {
      const stats = result.data;
      
      updateDashboardMetrics({
        totalCohorts: stats.totalCohorts,
        activeCohorts: stats.activeCohorts,
        upcomingCohorts: stats.upcomingCohorts,
        completedCohorts: stats.completedCohorts,
        totalEnrollments: stats.totalEnrollments
      });
    }
  } catch (error) {
    console.error('Failed to fetch dashboard statistics:', error);
  }
};
```

### 5. Create New Cohort

```javascript
// Create a new cohort
const createCohort = async (cohortData) => {
  try {
    const response = await fetch('/v1/cohorts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: cohortData.name,
        startDate: cohortData.startDate.toISOString(),
        endDate: cohortData.endDate.toISOString(),
        maxCapacity: cohortData.maxCapacity || 20,
        location: cohortData.location || 'Mazkeret Batya',
        schedule: cohortData.schedule || 'Weekly evenings, 1.5-2 hours'
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showSuccessMessage('Cohort created successfully!');
      refreshCohortList();
      return result.data;
    } else {
      showErrorMessage(result.error.message);
    }
  } catch (error) {
    console.error('Failed to create cohort:', error);
    showErrorMessage('Failed to create cohort. Please try again.');
  }
};
```

### 6. Manage Cohort Status

```javascript
// Update cohort status
const updateCohortStatus = async (cohortId, newStatus) => {
  try {
    const response = await fetch(`/v1/cohorts/${cohortId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showSuccessMessage(`Status updated to ${newStatus}`);
      updateCohortInUI(result.data);
    } else {
      showErrorMessage(result.error.message);
    }
  } catch (error) {
    console.error('Failed to update cohort status:', error);
    showErrorMessage('Failed to update status. Please try again.');
  }
};

// Usage examples for status transitions
const openEnrollment = (cohortId) => updateCohortStatus(cohortId, 'OPEN_ENROLLMENT');
const markAsFull = (cohortId) => updateCohortStatus(cohortId, 'FULL');
const startCohort = (cohortId) => updateCohortStatus(cohortId, 'IN_PROGRESS');
const completeCohort = (cohortId) => updateCohortStatus(cohortId, 'COMPLETED');
```

### 7. View Cohort Enrollments

```javascript
// Get detailed enrollment information for a cohort
const getCohortEnrollments = async (cohortId) => {
  try {
    const response = await fetch(`/v1/cohorts/${cohortId}/enrollments`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      const { cohort, enrollments, statistics } = result.data;
      
      // Display cohort summary
      displayCohortSummary({
        name: cohort.name,
        status: cohort.status,
        capacity: cohort.maxCapacity,
        enrolled: cohort.currentEnrollment,
        totalRevenue: statistics.totalRevenue,
        outstandingPayments: statistics.outstandingPayments
      });
      
      // Display enrollment list
      const enrollmentList = enrollments.map(enrollment => ({
        studentName: `${enrollment.user.firstName} ${enrollment.user.lastName}`,
        email: enrollment.user.email,
        phone: enrollment.user.phone,
        status: enrollment.status,
        paymentPlan: enrollment.paymentPlan,
        paidAmount: enrollment.paidAmount,
        remainingAmount: enrollment.remainingAmount,
        enrollmentDate: new Date(enrollment.enrollmentDate).toLocaleDateString('he-IL')
      }));
      
      displayEnrollmentTable(enrollmentList);
    }
  } catch (error) {
    console.error('Failed to fetch cohort enrollments:', error);
  }
};
```

### 8. Administrative Alerts

```javascript
// Get cohorts that need administrative attention
const checkCohortsNeedingAttention = async () => {
  try {
    const response = await fetch('/v1/cohorts/management/attention', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      const { startingSoon, underEnrolled, needsStatusUpdate } = result.data;
      
      // Show alerts for cohorts starting soon
      if (startingSoon.length > 0) {
        showAlert({
          type: 'warning',
          title: `${startingSoon.length} cohort(s) starting soon`,
          message: 'Review enrollment and preparation status',
          actions: startingSoon.map(cohort => ({
            label: `Review ${cohort.name}`,
            action: () => viewCohortDetails(cohort.id)
          }))
        });
      }
      
      // Show alerts for under-enrolled cohorts
      if (underEnrolled.length > 0) {
        showAlert({
          type: 'info',
          title: `${underEnrolled.length} cohort(s) need marketing boost`,
          message: 'These cohorts are below 50% capacity',
          actions: underEnrolled.map(cohort => ({
            label: `Market ${cohort.name}`,
            action: () => openMarketingTools(cohort.id)
          }))
        });
      }
      
      // Show alerts for status updates needed
      if (needsStatusUpdate.length > 0) {
        showAlert({
          type: 'action',
          title: `${needsStatusUpdate.length} cohort(s) need status update`,
          message: 'These cohorts should have their status updated',
          actions: needsStatusUpdate.map(cohort => ({
            label: `Update ${cohort.name}`,
            action: () => updateCohortStatus(cohort.id, cohort.suggestedStatus)
          }))
        });
      }
    }
  } catch (error) {
    console.error('Failed to fetch cohorts needing attention:', error);
  }
};

// Check for alerts every 5 minutes
setInterval(checkCohortsNeedingAttention, 5 * 60 * 1000);
```

## Automated Tasks

### 9. Daily Status Updates

```javascript
// Automated daily status updates (run via cron job)
const runDailyStatusUpdate = async () => {
  try {
    console.log('Running daily cohort status update...');
    
    const response = await fetch('/v1/cohorts/update-statuses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${systemToken}`
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Cohort statuses updated successfully');
      
      // Send notification to admins about any status changes
      await notifyAdminsOfStatusUpdates();
    } else {
      console.error('❌ Failed to update cohort statuses:', result.error);
      await notifyAdminsOfError(result.error);
    }
  } catch (error) {
    console.error('❌ Daily status update failed:', error);
    await notifyAdminsOfError(error);
  }
};

// Usage in cron job or scheduler
// 0 1 * * * - Run daily at 1 AM
cron.schedule('0 1 * * *', runDailyStatusUpdate);
```

### 10. Real-time Enrollment Updates

```javascript
// Update cohort enrollment count when student enrolls
const handleSuccessfulEnrollment = async (enrollmentData) => {
  try {
    // This would typically be called from your enrollment processing logic
    await updateCohortEnrollmentCount(enrollmentData.cohortId, true);
    
    // Check if cohort is now full
    const cohort = await getCohortDetails(enrollmentData.cohortId);
    if (cohort.currentEnrollment >= cohort.maxCapacity) {
      await updateCohortStatus(enrollmentData.cohortId, 'FULL');
      await notifyAdminsOfFullCohort(cohort);
    }
  } catch (error) {
    console.error('Failed to update enrollment count:', error);
  }
};

// Update cohort enrollment count when student unenrolls/cancels
const handleEnrollmentCancellation = async (enrollmentData) => {
  try {
    await updateCohortEnrollmentCount(enrollmentData.cohortId, false);
    
    // If cohort was full, reopen enrollment
    const cohort = await getCohortDetails(enrollmentData.cohortId);
    if (cohort.status === 'FULL' && cohort.currentEnrollment < cohort.maxCapacity) {
      await updateCohortStatus(enrollmentData.cohortId, 'OPEN_ENROLLMENT');
      await notifyAdminsOfReopenedEnrollment(cohort);
    }
  } catch (error) {
    console.error('Failed to update enrollment count:', error);
  }
};
```

## Error Handling Patterns

### 11. Robust Error Handling

```javascript
// Generic API caller with error handling
const callCohortAPI = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`/v1/cohorts${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.requireAuth && { 'Authorization': `Bearer ${getAuthToken()}` })
      },
      ...options
    });
    
    const result = await response.json();
    
    if (!result.success) {
      // Handle specific error cases
      switch (result.error.code) {
        case 'UNAUTHORIZED':
          redirectToLogin();
          break;
        case 'FORBIDDEN':
          showAccessDeniedMessage();
          break;
        case 'RESOURCE_NOT_FOUND':
          showNotFoundMessage();
          break;
        case 'VALIDATION_ERROR':
          showValidationErrors(result.error.details);
          break;
        case 'OPERATION_NOT_ALLOWED':
          showBusinessRuleViolation(result.error.message);
          break;
        default:
          showGenericErrorMessage(result.error.message);
      }
      return null;
    }
    
    return result.data;
  } catch (error) {
    console.error('API call failed:', error);
    showNetworkErrorMessage();
    return null;
  }
};

// Usage examples
const getCohort = (id) => callCohortAPI(`/${id}`);
const createCohort = (data) => callCohortAPI('', { 
  method: 'POST', 
  body: JSON.stringify(data),
  requireAuth: true 
});
const getStatistics = () => callCohortAPI('/statistics', { requireAuth: true });
```

## Testing Examples

### 12. Frontend Unit Tests

```javascript
// Jest test examples
describe('Cohort API Integration', () => {
  test('should fetch current cohort successfully', async () => {
    // Mock the API response
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            id: 'test-cohort-id',
            name: 'Test Cohort 2025',
            status: 'OPEN_ENROLLMENT',
            availableSpots: 15,
            isEnrollmentOpen: true
          }
        })
      })
    );
    
    const cohort = await getCurrentCohort();
    expect(cohort).toBeTruthy();
    expect(cohort.isEnrollmentOpen).toBe(true);
    expect(fetch).toHaveBeenCalledWith('/v1/cohorts/current');
  });
  
  test('should handle no active cohorts', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: null
        })
      })
    );
    
    const cohort = await getCurrentCohort();
    expect(cohort).toBeNull();
  });
});
```

These examples demonstrate how to integrate the cohort management endpoints into various parts of your application, from public enrollment pages to administrative dashboards and automated background tasks.

Last updated: 2025-01-20