import { Route } from 'react-router-dom';
import ClerkLayout from '../components/layout/ClerkLayout/ClerkLayout';
import RoleRoute from './RoleRoute';

import ClerkDashboardPage from '../pages/clerk/ClerkDashboardPage/ClerkDashboardPage';
import StoreInventoryPage from '../pages/clerk/StoreInventoryPage/StoreInventoryPage';
import StockInPage from '../pages/clerk/StockInPage/StockInPage';
import StockAdjustmentPage from '../pages/clerk/StockAdjustmentPage/StockAdjustmentPage';
import LowStockPage from '../pages/clerk/LowStockPage/LowStockPage';
import StockMovementsPage from '../pages/clerk/StockMovementsPage/StockMovementsPage';
import ProfilePage from '../pages/shared/ProfilePage/ProfilePage';

const ClerkRoutes = (
  <Route element={<RoleRoute allow={['CLERK']} />}>
    <Route path="/clerk" element={<ClerkLayout />}>
      <Route index element={<ClerkDashboardPage />} />
      <Route path="inventory" element={<StoreInventoryPage />} />
      <Route path="stock-in" element={<StockInPage />} />
      <Route path="stock-adjustment" element={<StockAdjustmentPage />} />
      <Route path="low-stock" element={<LowStockPage />} />
      <Route path="movements" element={<StockMovementsPage />} />
      <Route path="profile" element={<ProfilePage />} />
    </Route>
  </Route>
);

export default ClerkRoutes;
