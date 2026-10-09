import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../../../components/ui/StatCard/StatCard';
import Icon from '../../../components/ui/Icon/Icon';
import QuickActions, { type QuickActionItem } from '../../../components/ui/QuickActions/QuickActions';
import AuditLogTable from '../../../components/ui/AuditLogTable/AuditLogTable';
import styles from './AdminDashboardPage.module.css';

import { getProducts } from '../../../api/products.api';
import { getInventoryItems } from '../../../api/inventory.api';
import { getAuditLog } from '../../../api/auditLog.api';
import { getDashboardSummary, getStoreSales, getTopProducts, STORE_CODES, type TopProduct } from '../../../utils/mockDashboard';
import type { AuditLogEntry, InventoryItem } from '../../../types';

import salesIcon from '../../../assets/icons/cards/sales.svg';
import ordersIcon from '../../../assets/icons/cards/orders.svg';
import productsIcon from '../../../assets/icons/sidebar/products.svg';
import inventoryIcon from '../../../assets/icons/sidebar/inventory.svg';
import storeIcon from '../../../assets/icons/sidebar/store.svg';
import usersIcon from '../../../assets/icons/sidebar/users.svg';
import salesReportsIcon from '../../../assets/icons/sidebar/sales-reports.svg';
import performanceIcon from '../../../assets/icons/sidebar/performance.svg';

// TODO(Phase 6): palitan ng totoong data mula sa GET /api/dashboard; mock muna sa utils/mockDashboard
const STORE_NAMES: Record<string, string> = { ALY: 'Alley', PDM: 'Podium' };
const summary = getDashboardSummary();
const storeSales = STORE_CODES.map((code) => ({ code, name: STORE_NAMES[code] ?? code, ...getStoreSales(code) }));

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

function AdminDashboardPage() {
  const [topProducts, setTopProducts] = useState<TopProduct[] | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[] | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[] | null>(null);

  useEffect(() => {
    let ignore = false;
    getProducts()
      .then((products) => {
        if (!ignore) setTopProducts(getTopProducts(products));
      })
      .catch(() => {
        if (!ignore) setTopProducts([]);
      });
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

  return (
    <section>
      <div className={styles.header}>
        <h1 className={styles.title}>Owner Dashboard</h1>
        <span className={styles.sampleNote}>Sample data</span>
      </div>

      <div className={styles.stats}>
        <StatCard
          variant="sales"
          title="Sales Today"
          value={`₱${summary.salesToday.toLocaleString()}`}
          caption="Both stores, vs. yesterday"
          change={summary.salesChange}
        />
        <StatCard
          variant="orders"
          title="Orders Today"
          value={summary.ordersToday}
          caption="Both stores, vs. yesterday"
          change={summary.ordersChange}
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
          <ul className={styles.storeList}>
            {storeSales.map((store) => (
              <li key={store.code}>
                <Link to="/admin/stores" className={styles.storeRow}>
                  <span className={styles.storeRowName}>
                    {store.name}
                    <span className={styles.storeRowCode}>{store.code}</span>
                  </span>
                  <span className={styles.storeRowStat}>
                    <Icon src={salesIcon} size={14} />₱{store.sales.toLocaleString()}
                  </span>
                  <span className={styles.storeRowStat}>
                    <Icon src={ordersIcon} size={14} />
                    {store.orders} orders
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Top products</h2>
          <p className={styles.panelText}>Best sellers today.</p>
          {topProducts === null ? (
            <div className={styles.panelEmpty}>Loading...</div>
          ) : topProducts.length === 0 ? (
            <div className={styles.panelEmpty}>No products yet</div>
          ) : (
            <ol className={styles.productList}>
              {topProducts.map((product, index) => (
                <li key={product.id}>
                  <Link to="/admin/reports/products" className={styles.productRow}>
                    <span className={styles.productRank}>{index + 1}</span>
                    <span className={styles.productInfo}>
                      <span className={styles.productName}>{product.name}</span>
                      <span className={styles.productCategory}>{product.category}</span>
                    </span>
                    <span className={styles.productStat}>
                      <span className={styles.productQty}>{product.qtySold} sold</span>
                      <span className={styles.productRevenue}>₱{product.revenue.toLocaleString()}</span>
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
