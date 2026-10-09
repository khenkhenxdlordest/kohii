import StatCard from '../../../components/ui/StatCard/StatCard';
import styles from './ClerkDashboardPage.module.css';

// TODO(Phase 4/6): palitan ng totoong data mula sa inventory at dashboard API
function ClerkDashboardPage() {
  return (
    <section>
      <div className={styles.header}>
        <h1 className={styles.title}>Inventory Dashboard</h1>
        <span className={styles.sampleNote}>Sample data</span>
      </div>

      <div className={styles.stats}>
        <StatCard variant="lowStock" title="Low Stock" value={5} caption="Ingredients below threshold" />
        <StatCard variant="outOfStock" title="Out of Stock" value={1} caption="Needs restock now" />
        <StatCard variant="stockIn" title="Stock In Today" value={3} caption="Deliveries recorded" />
        <StatCard variant="products" title="Ingredients Tracked" value={12} caption="Across both stores" />
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
