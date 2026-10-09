import { Outlet } from 'react-router-dom';
import Navbar from '../Navbar/Navbar';
import Sidebar, { type NavSection } from '../Sidebar/Sidebar';
import styles from './AdminLayout.module.css';

import dashboardIcon from '../../../assets/icons/sidebar/dashboard.svg';
import productsIcon from '../../../assets/icons/sidebar/products.svg';
import recipesIcon from '../../../assets/icons/sidebar/recipes.svg';
import inventoryIcon from '../../../assets/icons/sidebar/inventory.svg';
import salesReportsIcon from '../../../assets/icons/sidebar/sales-reports.svg';
import inventoryReportsIcon from '../../../assets/icons/sidebar/inventory-reports.svg';
import performanceIcon from '../../../assets/icons/sidebar/performance.svg';
import storeIcon from '../../../assets/icons/sidebar/store.svg';
import usersIcon from '../../../assets/icons/sidebar/users.svg';
import auditLogIcon from '../../../assets/icons/actions/history.svg';

const adminNav: NavSection[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', to: '/admin', icon: dashboardIcon, end: true }],
  },
  {
    title: 'Menu',
    items: [
      { label: 'Products', to: '/admin/products', icon: productsIcon },
      { label: 'Recipes', to: '/admin/recipes', icon: recipesIcon },
    ],
  },
  {
    title: 'Monitoring',
    items: [
      { label: 'Inventory Overview', to: '/admin/inventory', icon: inventoryIcon },
      { label: 'Sales Reports', to: '/admin/reports/sales', icon: salesReportsIcon },
      { label: 'Inventory Reports', to: '/admin/reports/inventory', icon: inventoryReportsIcon },
      { label: 'Product Performance', to: '/admin/reports/products', icon: performanceIcon },
      { label: 'Audit Log', to: '/admin/audit-log', icon: auditLogIcon },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Stores', to: '/admin/stores', icon: storeIcon },
      { label: 'Employees', to: '/admin/employees', icon: usersIcon },
    ],
  },
];

function AdminLayout() {
  return (
    <div className={styles.shell}>
      <Sidebar sections={adminNav} profilePath="/admin/profile" />
      <main className={styles.content}>
        <Navbar />
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
