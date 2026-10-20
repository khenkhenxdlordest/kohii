import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../../../components/ui/StatCard/StatCard';
import QuickActions, { type QuickActionItem } from '../../../components/ui/QuickActions/QuickActions';
import { useAuth } from '../../../hooks/useAuth';
import { getOrders } from '../../../api/orders.api';
import { storeSalesSummary } from '../../../utils/salesAggregation';
import { formatPeso, formatDateTime } from '../../../utils/format';
import type { OrderListItem } from '../../../types';
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

const toIso = (date: Date) => date.toISOString().slice(0, 10);

function CashierDashboardPage() {
  const { user } = useAuth();
  const storeName = user?.store?.name ?? '';
  const [myOrders, setMyOrders] = useState<OrderListItem[] | null>(null);

  useEffect(() => {
    if (!user?.storeId) return;
    let ignore = false;
    const today = toIso(new Date());
    getOrders({ storeId: user.storeId, cashierId: user.id, from: today, to: today })
      .then((orders) => !ignore && setMyOrders(orders))
      .catch(() => !ignore && setMyOrders([]));
    return () => {
      ignore = true;
    };
  }, [user?.storeId, user?.id]);

  const orders = myOrders ?? [];
  const storeSales = storeSalesSummary(orders);
  const itemsSold = orders.reduce((sum, o) => sum + o.itemsCount, 0);

  return (
    <section>
      <div className={styles.header}>
        <h1 className={styles.title}>My Shift</h1>
      </div>

      <div className={styles.stats}>
        <StatCard variant="sales" title="My Sales Today" value={formatPeso(storeSales.sales)} caption="This store" />
        <StatCard variant="orders" title="My Orders Today" value={storeSales.orders} caption="Completed orders" />
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

        {orders.length === 0 ? (
          <div className={styles.panelEmpty}>No orders yet today</div>
        ) : (
          <ul className={styles.orderList}>
            {orders.slice(0, 8).map((order) => (
              <li key={order.id} className={styles.orderRow}>
                <span className={styles.orderTime}>{formatDateTime(order.createdAt)}</span>
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
