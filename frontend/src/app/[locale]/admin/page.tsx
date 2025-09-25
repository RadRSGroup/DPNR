import AdminDashboard from '@/components/AdminDashboard';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRole="admin" locale="he">
      <AdminDashboard locale="he" />
    </ProtectedRoute>
  );
}