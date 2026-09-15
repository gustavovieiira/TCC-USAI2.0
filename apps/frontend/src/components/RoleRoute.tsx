import { Navigate, Outlet } from 'react-router-dom';
import { getStoredUser, Papel } from '@/lib/authStorage';

interface RoleRouteProps {
  allow: Papel[];
}

/**
 * Guarda de UX, não de segurança — o backend já aplica requireRole em cada rota. Isso só evita o
 * morador comum cair numa tela de admin/síndico e levar um 403 confuso.
 */
export function RoleRoute({ allow }: RoleRouteProps) {
  const user = getStoredUser();

  if (!user || !allow.includes(user.papel)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
