import { Route } from 'react-router-dom';
import AdminLayout from '../components/layout/AdminLayout';
import RoleRoute from './RoleRoute';

import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import ProductsPage from '../pages/admin/ProductsPage';
import CategoriesPage from '../pages/admin/CategoriesPage';
import IngredientsPage from '../pages/admin/IngredientsPage';
import RecipesPage from '../pages/admin/RecipesPage';
import InventoryOverviewPage from '../pages/admin/InventoryOverviewPage';
import SalesReportsPage from '../pages/admin/SalesReportsPage';
import InventoryReportsPage from '../pages/admin/InventoryReportsPage';
import ProductPerformancePage from '../pages/admin/ProductPerformancePage';
import StoresPage from '../pages/admin/StoresPage';
import UsersPage from '../pages/admin/UsersPage';
import ProfilePage from '../pages/shared/ProfilePage';

const AdminRoutes = (
  <Route element={<RoleRoute allow={['ADMIN']} />}>
    <Route path="/admin" element={<AdminLayout />}>
      <Route index element={<AdminDashboardPage />} />
      <Route path="products" element={<ProductsPage />} />
      <Route path="categories" element={<CategoriesPage />} />
      <Route path="ingredients" element={<IngredientsPage />} />
      <Route path="recipes" element={<RecipesPage />} />
      <Route path="inventory" element={<InventoryOverviewPage />} />
      <Route path="reports/sales" element={<SalesReportsPage />} />
      <Route path="reports/inventory" element={<InventoryReportsPage />} />
      <Route path="reports/products" element={<ProductPerformancePage />} />
      <Route path="stores" element={<StoresPage />} />
      <Route path="users" element={<UsersPage />} />
      <Route path="profile" element={<ProfilePage />} />
    </Route>
  </Route>
);

export default AdminRoutes;
