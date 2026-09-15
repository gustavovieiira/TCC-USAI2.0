import { Navigate, Outlet } from 'react-router-dom';
import { getAccessToken } from '@/lib/authStorage';

export function ProtectedRoute() {
  const isAuthenticated = Boolean(getAccessToken());
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
