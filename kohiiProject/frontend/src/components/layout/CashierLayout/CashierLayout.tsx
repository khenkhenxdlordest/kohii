import { Outlet } from 'react-router-dom';
import Navbar from '../Navbar/Navbar';
import Sidebar, { type NavSection } from '../Sidebar/Sidebar';
import ShiftBar from './ShiftBar/ShiftBar';
import KitchenNotice from './KitchenNotice/KitchenNotice';
import { ShiftProvider } from '../../../context/ShiftProvider';
import styles from './CashierLayout.module.css';

import dashboardIcon from '../../../assets/icons/sidebar/dashboard.svg';
import posIcon from '../../../assets/icons/sidebar/pos.svg';
import ordersIcon from '../../../assets/icons/sidebar/orders.svg';
import dailySalesIcon from '../../../assets/icons/sidebar/daily-sales.svg';
import kitchenIcon from '../../../assets/icons/cards/kitchen.svg';

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
      { label: 'Kitchen Queue', to: '/cashier/kitchen', icon: kitchenIcon },
    ],
  },
];

function CashierLayout() {
  return (
    <div className={styles.shell}>
      <KitchenNotice />
      <Sidebar sections={cashierNav} profilePath="/cashier/profile" />
      <main className={styles.content}>
        <Navbar />
        <ShiftProvider>
          <ShiftBar />
          <Outlet />
        </ShiftProvider>
      </main>
    </div>
  );
}

export default CashierLayout;
