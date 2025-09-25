import UserDashboard from '@/components/UserDashboard';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function DashboardPage() {
  return (
    <ProtectedRoute requiredRole="student" locale="he">
      <UserDashboard locale="he" />
    </ProtectedRoute>
  );
}