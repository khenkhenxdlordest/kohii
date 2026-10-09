import { Outlet } from 'react-router-dom';
import Sidebar, { type NavSection } from './Sidebar';
import styles from './layout.module.css';

import dashboardIcon from '../../assets/icons/sidebar/dashboard.svg';
import inventoryIcon from '../../assets/icons/sidebar/inventory.svg';
import stockInIcon from '../../assets/icons/sidebar/stock-in.svg';
import stockAdjustmentIcon from '../../assets/icons/sidebar/stock-adjustment.svg';
import lowStockIcon from '../../assets/icons/sidebar/low-stock.svg';
import stockMovementsIcon from '../../assets/icons/sidebar/stock-movements.svg';

const clerkNav: NavSection[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', to: '/clerk', icon: dashboardIcon, end: true }],
  },
  {
    title: 'Inventory',
    items: [
      { label: 'Store Inventory', to: '/clerk/inventory', icon: inventoryIcon },
      { label: 'Stock In', to: '/clerk/stock-in', icon: stockInIcon },
      { label: 'Stock Adjustment', to: '/clerk/stock-adjustment', icon: stockAdjustmentIcon },
      { label: 'Low Stock', to: '/clerk/low-stock', icon: lowStockIcon },
      { label: 'Stock Movements', to: '/clerk/movements', icon: stockMovementsIcon },
    ],
  },
];

function ClerkLayout() {
  return (
    <div className={styles.shell}>
      <Sidebar sections={clerkNav} profilePath="/clerk/profile" />
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}

export default ClerkLayout;
