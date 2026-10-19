import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../../../components/ui/StatCard/StatCard';
import QuickActions, { type QuickActionItem } from '../../../components/ui/QuickActions/QuickActions';
import { useAuth } from '../../../hooks/useAuth';
import { getStoreSales, getMockSales } from '../../../utils/mockDashboard';
import { formatPeso, formatDateTime } from '../../../utils/format';
import styles from './CashierDashboardPage.module.css';

import posIcon from '../../../assets/icons/sidebar/pos.svg';
import ordersIcon from '../../../assets/icons/sidebar/orders.svg';
import dailySalesIcon from '../../../assets/icons/sidebar/daily-sales.svg';

const quickActions: QuickActionItem[] = [
  {
    to: '/cashier/pos',
    title: 'Point of Sale',
    description: 'Take and complete customer orders.',
    chipText: 'Open POS',
    icon: posIcon,
  },
  {
    to: '/cashier/orders',
    title: 'Orders',
    description: 'Orders made during your shift.',
    chipText: 'Open Orders',
    icon: ordersIcon,
  },
  {
    to: '/cashier/daily-sales',
    title: 'Daily Sales',
    description: 'Your sales summary, filterable by day.',
    chipText: 'Open Daily Sales',
    icon: dailySalesIcon,
  },
];

// TODO(Phase 6): palitan ng totoong data mula sa orders at dashboard API; mock muna sa utils/mockDashboard
function CashierDashboardPage() {
  const { user } = useAuth();
  const storeCode = user?.store?.code ?? 'PDM';
  const storeName = user?.store?.name ?? storeCode;
  const cashierName = user?.profile ? `${user.profile.firstName} ${user.profile.lastName}` : 'Cashier';

  const storeSales = useMemo(() => getStoreSales(storeCode), [storeCode]);
  const myOrders = useMemo(
    () => getMockSales([cashierName], 1).filter((s) => s.storeCode === storeCode && s.cashier === cashierName),
    [storeCode, cashierName],
  );
  const itemsSold = useMemo(() => myOrders.reduce((sum, o) => sum + o.itemsCount, 0), [myOrders]);

  return (
    <section>
      <div className={styles.header}>
        <h1 className={styles.title}>My Shift</h1>
        <span className={styles.sampleNote}>Sample data</span>
      </div>

      <div className={styles.stats}>
        <StatCard variant="sales" title="My Sales Today" value={formatPeso(storeSales.sales)} caption="This store" />
        <StatCard variant="orders" title="My Orders Today" value={myOrders.length} caption="Completed orders" />
        <StatCard variant="products" title="Items Sold" value={itemsSold} caption="Drinks and snacks" />
      </div>

      <div className={styles.panels}>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Sales by shift</h2>
          <p className={styles.panelText}>Today's sales and orders at {storeName}.</p>
          <ul className={styles.shiftList}>
            {storeSales.shifts.map((shift) => (
              <li key={shift.shift} className={styles.shiftRow}>
                <span className={styles.shiftRowName}>
                  {shift.shift === 'AM' ? 'Morning shift' : 'Afternoon shift'}
                  <span className={styles.shiftRowCode}>{shift.shift}</span>
                </span>
                <span className={styles.shiftRowStat}>{formatPeso(shift.sales)}</span>
                <span className={styles.shiftRowStat}>{shift.orders} orders</span>
              </li>
            ))}
          </ul>
        </div>

        <QuickActions title="Quick Actions" subtitle="Easy access to your everyday essentials." items={quickActions} />
      </div>

      <div className={styles.auditPanel}>
        <div className={styles.auditPanelHeader}>
          <div>
            <h2 className={styles.panelTitle}>Recent orders</h2>
            <p className={styles.panelText}>Your latest orders this shift.</p>
          </div>
          <Link to="/cashier/orders" className={styles.viewAllLink}>
            View all
          </Link>
        </div>

        {myOrders.length === 0 ? (
          <div className={styles.panelEmpty}>No orders yet today</div>
        ) : (
          <ul className={styles.orderList}>
            {myOrders.slice(0, 8).map((order) => (
              <li key={order.id} className={styles.orderRow}>
                <span className={styles.orderTime}>{formatDateTime(order.dateTime)}</span>
                <span className={styles.orderMeta}>
                  {order.itemsCount} items · {order.paymentMethod}
                </span>
                <span className={styles.orderTotal}>{formatPeso(order.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default CashierDashboardPage;
