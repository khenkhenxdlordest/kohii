import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { Role } from '../types';

// Hindi mabubuksan ng isang role ang page ng ibang role
function RoleRoute({ allow }: { allow: Role[] }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}

export default RoleRoute;
