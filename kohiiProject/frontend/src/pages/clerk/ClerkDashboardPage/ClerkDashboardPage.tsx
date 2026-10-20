import { useEffect, useState } from 'react';
import StatCard from '../../../components/ui/StatCard/StatCard';
import { getInventoryItems, getMovements } from '../../../api/inventory.api';
import { dateOf } from '../../../utils/salesAggregation';
import type { InventoryItem } from '../../../types';
import styles from './ClerkDashboardPage.module.css';

function ClerkDashboardPage() {
  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [stockInToday, setStockInToday] = useState<number | null>(null);

  useEffect(() => {
    let ignore = false;
    getInventoryItems().then((list) => !ignore && setItems(list));
    getMovements({ type: 'STOCK_IN', limit: 200 })
      .then((movements) => {
        if (ignore) return;
        const today = dateOf(new Date().toISOString());
        setStockInToday(movements.filter((m) => dateOf(m.createdAt) === today).length);
      })
      .catch(() => !ignore && setStockInToday(0));
    return () => {
      ignore = true;
    };
  }, []);

  const lowStockCount = items?.filter((i) => i.stockStatus === 'LOW').length ?? 0;
  const outOfStockCount = items?.filter((i) => i.stockStatus === 'OUT').length ?? 0;

  return (
    <section>
      <div className={styles.header}>
        <h1 className={styles.title}>Inventory Dashboard</h1>
      </div>

      <div className={styles.stats}>
        <StatCard variant="lowStock" title="Low Stock" value={lowStockCount} caption="Ingredients below threshold" />
        <StatCard variant="outOfStock" title="Out of Stock" value={outOfStockCount} caption="Needs restock now" />
        <StatCard variant="stockIn" title="Stock In Today" value={stockInToday ?? 0} caption="Deliveries recorded" />
        <StatCard variant="products" title="Ingredients Tracked" value={items?.length ?? 0} caption="Across both stores" />
      </div>

      <div className={styles.panels}>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Low stock items</h2>
          <p className={styles.panelText}>Restock these first.</p>
          <div className={styles.panelEmpty}>List coming in Phase 4</div>
        </div>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Recent stock movements</h2>
          <p className={styles.panelText}>Latest stock in, waste and adjustments.</p>
          <div className={styles.panelEmpty}>List coming in Phase 4</div>
        </div>
      </div>
    </section>
  );
}

export default ClerkDashboardPage;
