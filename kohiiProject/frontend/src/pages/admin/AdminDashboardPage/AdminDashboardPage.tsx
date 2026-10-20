import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../../../components/ui/StatCard/StatCard';
import Icon from '../../../components/ui/Icon/Icon';
import QuickActions, { type QuickActionItem } from '../../../components/ui/QuickActions/QuickActions';
import AuditLogTable from '../../../components/ui/AuditLogTable/AuditLogTable';
import styles from './AdminDashboardPage.module.css';

import { getProducts } from '../../../api/products.api';
import { getInventoryItems } from '../../../api/inventory.api';
import { getAuditLog } from '../../../api/auditLog.api';
import { getStores } from '../../../api/stores.api';
import { getOrders } from '../../../api/orders.api';
import { dateOf, pctChange, productSales, storeSalesSummary, sumTotals } from '../../../utils/salesAggregation';
import { formatPeso } from '../../../utils/format';
import type { AuditLogEntry, InventoryItem, OrderListItem, Product, Store } from '../../../types';

import salesIcon from '../../../assets/icons/cards/sales.svg';
import ordersIcon from '../../../assets/icons/cards/orders.svg';
import productsIcon from '../../../assets/icons/sidebar/products.svg';
import inventoryIcon from '../../../assets/icons/sidebar/inventory.svg';
import storeIcon from '../../../assets/icons/sidebar/store.svg';
import usersIcon from '../../../assets/icons/sidebar/users.svg';
import salesReportsIcon from '../../../assets/icons/sidebar/sales-reports.svg';
import performanceIcon from '../../../assets/icons/sidebar/performance.svg';

const quickActions: QuickActionItem[] = [
  {
    to: '/admin/products',
    title: 'Products',
    description: 'Manage the menu, categories and prices.',
    chipText: 'Open Products',
    icon: productsIcon,
  },
  {
    to: '/admin/inventory',
    title: 'Inventory',
    description: 'Track stock, stock-ins and waste for both stores.',
    chipText: 'Open Inventory',
    icon: inventoryIcon,
  },
  {
    to: '/admin/stores',
    title: 'Stores',
    description: 'Deploy staff and check sales per branch.',
    chipText: 'Open Stores',
    icon: storeIcon,
  },
  {
    to: '/admin/employees',
    title: 'Employees',
    description: 'Add, edit or deactivate staff accounts.',
    chipText: 'Open Employees',
    icon: usersIcon,
  },
  {
    to: '/admin/reports/sales',
    title: 'Sales Reports',
    description: 'Daily, weekly and monthly sales breakdown.',
    chipText: 'Open Reports',
    icon: salesReportsIcon,
  },
  {
    to: '/admin/reports/products',
    title: 'Product Performance',
    description: 'See best sellers and slow movers.',
    chipText: 'Open Performance',
    icon: performanceIcon,
  },
];

function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function AdminDashboardPage() {
  const [stores, setStores] = useState<Store[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderListItem[] | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[] | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[] | null>(null);

  useEffect(() => {
    let ignore = false;
    const today = toIso(new Date());
    const yesterday = toIso(new Date(Date.now() - 86_400_000));

    getStores().then((list) => !ignore && setStores(list));
    getProducts()
      .then((list) => !ignore && setProducts(list))
      .catch(() => !ignore && setProducts([]));
    getOrders({ from: yesterday, to: today, includeItems: true })
      .then((orders) => !ignore && setRecentOrders(orders))
      .catch(() => !ignore && setRecentOrders([]));
    getInventoryItems().then((items) => !ignore && setInventoryItems(items));
    getAuditLog(20)
      .then((entries) => !ignore && setAuditLog(entries))
      .catch(() => !ignore && setAuditLog([]));
    return () => {
      ignore = true;
    };
  }, []);

  const lowStockCount = inventoryItems?.filter((i) => i.stockStatus === 'LOW').length ?? 0;
  const outOfStockCount = inventoryItems?.filter((i) => i.stockStatus === 'OUT').length ?? 0;

  const [todayIso] = useState(() => toIso(new Date()));
  const [yesterdayIso] = useState(() => toIso(new Date(Date.now() - 86_400_000)));

  const todayOrders = useMemo(
    () => (recentOrders ?? []).filter((o) => dateOf(o.createdAt) === todayIso),
    [recentOrders, todayIso],
  );
  const yesterdayOrders = useMemo(
    () => (recentOrders ?? []).filter((o) => dateOf(o.createdAt) === yesterdayIso),
    [recentOrders, yesterdayIso],
  );

  const todayTotals = sumTotals(todayOrders);
  const yesterdayTotals = sumTotals(yesterdayOrders);
  const salesChange = pctChange(todayTotals.total, yesterdayTotals.total);
  const ordersChange = pctChange(todayTotals.count, yesterdayTotals.count);

  const storeSales = (stores ?? []).map((store) => ({
    ...store,
    ...storeSalesSummary(todayOrders.filter((o) => o.storeId === store.id)),
  }));

  const categoryById = new Map((products ?? []).map((p) => [p.id, p.category.name]));
  const topProducts = productSales(todayOrders)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return (
    <section>
      <div className={styles.header}>
        <h1 className={styles.title}>Owner Dashboard</h1>
      </div>

      <div className={styles.stats}>
        <StatCard
          variant="sales"
          title="Sales Today"
          value={formatPeso(todayTotals.total)}
          caption="Both stores, vs. yesterday"
          change={salesChange}
        />
        <StatCard
          variant="orders"
          title="Orders Today"
          value={todayTotals.count}
          caption="Both stores, vs. yesterday"
          change={ordersChange}
        />
        <StatCard
          variant="lowStock"
          title="Low Stock"
          value={lowStockCount}
          caption="Ingredients below threshold"
        />
        <StatCard
          variant="outOfStock"
          title="Out of Stock"
          value={outOfStockCount}
          caption="Needs restock now"
        />
      </div>

      <div className={styles.panels}>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Sales by store</h2>
          <p className={styles.panelText}>Today's sales and orders, per store.</p>
          {stores === null ? (
            <div className={styles.panelEmpty}>Loading...</div>
          ) : (
            <ul className={styles.storeList}>
              {storeSales.map((store) => (
                <li key={store.id}>
                  <Link to="/admin/stores" className={styles.storeRow}>
                    <span className={styles.storeRowName}>
                      {store.name}
                      <span className={styles.storeRowCode}>{store.code}</span>
                    </span>
                    <span className={styles.storeRowStat}>
                      <Icon src={salesIcon} size={14} />
                      {formatPeso(store.sales)}
                    </span>
                    <span className={styles.storeRowStat}>
                      <Icon src={ordersIcon} size={14} />
                      {store.orders} orders
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Top products</h2>
          <p className={styles.panelText}>Best sellers today.</p>
          {recentOrders === null ? (
            <div className={styles.panelEmpty}>Loading...</div>
          ) : topProducts.length === 0 ? (
            <div className={styles.panelEmpty}>No sales yet today</div>
          ) : (
            <ol className={styles.productList}>
              {topProducts.map((product, index) => (
                <li key={product.productId}>
                  <Link to="/admin/reports/products" className={styles.productRow}>
                    <span className={styles.productRank}>{index + 1}</span>
                    <span className={styles.productInfo}>
                      <span className={styles.productName}>{product.name}</span>
                      <span className={styles.productCategory}>{categoryById.get(product.productId) ?? ''}</span>
                    </span>
                    <span className={styles.productStat}>
                      <span className={styles.productQty}>{product.qty} sold</span>
                      <span className={styles.productRevenue}>{formatPeso(product.revenue)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>

        <QuickActions
          title="Quick Actions"
          subtitle="Easy access to your everyday essentials."
          items={quickActions}
        />
      </div>

      <div className={styles.auditPanel}>
        <div className={styles.auditPanelHeader}>
          <div>
            <h2 className={styles.panelTitle}>Recent activity</h2>
            <p className={styles.panelText}>Latest changes across products, categories, inventory and employees.</p>
          </div>
          <Link to="/admin/audit-log" className={styles.viewAllLink}>
            View all
          </Link>
        </div>
        <div className={styles.auditTableWrap}>
          <AuditLogTable
            rows={auditLog ?? []}
            pageSize={6}
            emptyMessage={auditLog === null ? 'Loading...' : 'No activity yet.'}
          />
        </div>
      </div>
    </section>
  );
}

export default AdminDashboardPage;
