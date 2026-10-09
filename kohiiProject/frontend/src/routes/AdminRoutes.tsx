import { Route } from 'react-router-dom';
import AdminLayout from '../components/layout/AdminLayout/AdminLayout';
import RoleRoute from './RoleRoute';

import AdminDashboardPage from '../pages/admin/AdminDashboardPage/AdminDashboardPage';
import ProductsPage from '../pages/admin/ProductsPage/ProductsPage';
import CategoriesPage from '../pages/admin/CategoriesPage/CategoriesPage';
import IngredientsPage from '../pages/admin/IngredientsPage/IngredientsPage';
import RecipesPage from '../pages/admin/RecipesPage/RecipesPage';
import InventoryOverviewPage from '../pages/admin/InventoryOverviewPage/InventoryOverviewPage';
import SalesReportsPage from '../pages/admin/SalesReportsPage/SalesReportsPage';
import InventoryReportsPage from '../pages/admin/InventoryReportsPage/InventoryReportsPage';
import ProductPerformancePage from '../pages/admin/ProductPerformancePage/ProductPerformancePage';
import StoresPage from '../pages/admin/StoresPage/StoresPage';
import UsersPage from '../pages/admin/UsersPage/UsersPage';
import ProfilePage from '../pages/shared/ProfilePage/ProfilePage';

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
