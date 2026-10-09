import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { dashboardRoutes } from '../utils/roles';
import ProtectedRoute from './ProtectedRoute';
import AdminRoutes from './AdminRoutes';
import ClerkRoutes from './ClerkRoutes';
import CashierRoutes from './CashierRoutes';

import LoginPage from '../pages/auth/LoginPage/LoginPage';
import NotFoundPage from '../pages/shared/NotFoundPage/NotFoundPage';
import UnauthorizedPage from '../pages/shared/UnauthorizedPage/UnauthorizedPage';

function AppRoutes() {
  const { user } = useAuth();
  // Dinadala ang user sa sariling dashboard ayon sa role
  const home = user ? dashboardRoutes[user.role] : '/login';

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={home} replace /> : <LoginPage />} />
      <Route path="/" element={<Navigate to={home} replace />} />

      <Route element={<ProtectedRoute />}>
        {AdminRoutes}
        {ClerkRoutes}
        {CashierRoutes}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;
