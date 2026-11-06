import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../../../components/ui/StatCard/StatCard';
import { getInventoryItems, getMovements } from '../../../api/inventory.api';
import { dateOf } from '../../../utils/salesAggregation';
import { formatDateTime } from '../../../utils/format';
import { formatQty, movementLabels } from '../../../utils/inventory';
import type { InventoryItem, StockMovement } from '../../../types';
import styles from './ClerkDashboardPage.module.css';

function ClerkDashboardPage() {
  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [movements, setMovements] = useState<StockMovement[] | null>(null);

  useEffect(() => {
    let ignore = false;
    getInventoryItems().then((list) => !ignore && setItems(list));
    getMovements({ limit: 50 })
      .then((list) => !ignore && setMovements(list))
      .catch(() => !ignore && setMovements([]));
    return () => {
      ignore = true;
    };
  }, []);

  const lowStockCount = items?.filter((i) => i.stockStatus === 'LOW').length ?? 0;
  const outOfStockCount = items?.filter((i) => i.stockStatus === 'OUT').length ?? 0;
  const lowStockItems = (items ?? []).filter((i) => i.stockStatus !== 'OK').slice(0, 5);

  const today = dateOf(new Date().toISOString());
  const stockInToday = movements?.filter((m) => m.type === 'STOCK_IN' && dateOf(m.createdAt) === today).length ?? 0;
  const recentMovements = (movements ?? []).slice(0, 5);

  return (
    <section>
      <div className={styles.header}>
        <h1 className={styles.title}>Inventory Dashboard</h1>
      </div>

      <div className={styles.stats}>
        <StatCard variant="lowStock" title="Low Stock" value={lowStockCount} caption="Ingredients below threshold" />
        <StatCard variant="outOfStock" title="Out of Stock" value={outOfStockCount} caption="Needs restock now" />
        <StatCard variant="stockIn" title="Stock In Today" value={stockInToday} caption="Deliveries recorded" />
        <StatCard variant="products" title="Ingredients Tracked" value={items?.length ?? 0} caption="Across both stores" />
      </div>

      <div className={styles.panels}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>Low stock items</h2>
              <p className={styles.panelText}>Restock these first.</p>
            </div>
            <Link to="/clerk/low-stock" className={styles.panelLink}>
              View all →
            </Link>
          </div>
          {items === null ? (
            <div className={styles.panelEmpty}>Loading...</div>
          ) : lowStockItems.length === 0 ? (
            <div className={styles.panelEmpty}>All stocked up — nothing is low right now.</div>
          ) : (
            <ul className={styles.panelList}>
              {lowStockItems.map((item) => (
                <li key={item.id} className={styles.panelRow}>
                  <span className={styles.panelRowName}>{item.name}</span>
                  <span className={`${styles.panelRowStatus} ${styles[item.stockStatus]}`}>
                    {formatQty(item.stockQty, item.unit)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>Recent stock movements</h2>
              <p className={styles.panelText}>Latest stock in, waste and adjustments.</p>
            </div>
            <Link to="/clerk/movements" className={styles.panelLink}>
              View all →
            </Link>
          </div>
          {movements === null ? (
            <div className={styles.panelEmpty}>Loading...</div>
          ) : recentMovements.length === 0 ? (
            <div className={styles.panelEmpty}>No stock movements yet.</div>
          ) : (
            <ul className={styles.panelList}>
              {recentMovements.map((m) => (
                <li key={m.id} className={styles.panelRow}>
                  <span className={styles.panelRowName}>
                    {m.item.name}
                    <span className={styles.panelRowMeta}>
                      {movementLabels[m.type]} · {formatDateTime(m.createdAt)}
                    </span>
                  </span>
                  <span className={m.qty >= 0 ? styles.qtyIn : styles.qtyOut}>
                    {m.qty >= 0 ? '+' : '−'}
                    {formatQty(Math.abs(m.qty), m.item.unit)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

export default ClerkDashboardPage;
