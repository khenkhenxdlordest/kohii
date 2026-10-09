import StatCard from '../../../components/ui/StatCard/StatCard';
import styles from './AdminDashboardPage.module.css';

// TODO(Phase 6): palitan ng totoong data mula sa GET /api/dashboard
function AdminDashboardPage() {
  return (
    <section>
      <div className={styles.header}>
        <h1 className={styles.title}>Owner Dashboard</h1>
        <span className={styles.sampleNote}>Sample data</span>
      </div>

      <div className={styles.stats}>
        <StatCard variant="sales" title="Sales Today" value="₱12,450" caption="Both stores, vs. yesterday" change={8.2} />
        <StatCard variant="orders" title="Orders Today" value={86} caption="Both stores, vs. yesterday" change={-3.1} />
        <StatCard variant="lowStock" title="Low Stock" value={5} caption="Ingredients below threshold" />
        <StatCard variant="outOfStock" title="Out of Stock" value={1} caption="Needs restock now" />
      </div>

      <div className={styles.panels}>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Sales this week</h2>
          <p className={styles.panelText}>Daily sales per store.</p>
          <div className={styles.panelEmpty}>Chart coming in Phase 6</div>
        </div>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Top products</h2>
          <p className={styles.panelText}>Best sellers today.</p>
          <div className={styles.panelEmpty}>List coming in Phase 6</div>
        </div>
      </div>
    </section>
  );
}

export default AdminDashboardPage;
