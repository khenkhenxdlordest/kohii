import { Outlet } from 'react-router-dom';
import Sidebar, { type NavSection } from './Sidebar';
import styles from './layout.module.css';

import dashboardIcon from '../../assets/icons/sidebar/dashboard.svg';
import posIcon from '../../assets/icons/sidebar/pos.svg';
import ordersIcon from '../../assets/icons/sidebar/orders.svg';
import dailySalesIcon from '../../assets/icons/sidebar/daily-sales.svg';

const cashierNav: NavSection[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', to: '/cashier', icon: dashboardIcon, end: true }],
  },
  {
    title: 'Sales',
    items: [
      { label: 'Point of Sale', to: '/cashier/pos', icon: posIcon },
      { label: 'Orders', to: '/cashier/orders', icon: ordersIcon },
      { label: 'Daily Sales', to: '/cashier/daily-sales', icon: dailySalesIcon },
    ],
  },
];

function CashierLayout() {
  return (
    <div className={styles.shell}>
      <Sidebar sections={cashierNav} profilePath="/cashier/profile" />
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}

export default CashierLayout;
