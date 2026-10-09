import { Route } from 'react-router-dom';
import CashierLayout from '../components/layout/CashierLayout';
import RoleRoute from './RoleRoute';

import CashierDashboardPage from '../pages/cashier/CashierDashboardPage';
import PosPage from '../pages/cashier/PosPage';
import OrdersPage from '../pages/cashier/OrdersPage';
import DailySalesPage from '../pages/cashier/DailySalesPage';
import ProfilePage from '../pages/shared/ProfilePage';

const CashierRoutes = (
  <Route element={<RoleRoute allow={['CASHIER']} />}>
    <Route path="/cashier" element={<CashierLayout />}>
      <Route index element={<CashierDashboardPage />} />
      <Route path="pos" element={<PosPage />} />
      <Route path="orders" element={<OrdersPage />} />
      <Route path="daily-sales" element={<DailySalesPage />} />
      <Route path="profile" element={<ProfilePage />} />
    </Route>
  </Route>
);

export default CashierRoutes;
