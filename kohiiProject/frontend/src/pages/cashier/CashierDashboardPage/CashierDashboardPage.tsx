import StatCard from '../../../components/ui/StatCard/StatCard';
import styles from './CashierDashboardPage.module.css';

// TODO(Phase 3/6): palitan ng totoong data mula sa orders at dashboard API
function CashierDashboardPage() {
  return (
    <section>
      <div className={styles.header}>
        <h1 className={styles.title}>My Shift</h1>
        <span className={styles.sampleNote}>Sample data</span>
      </div>

      <div className={styles.stats}>
        <StatCard variant="sales" title="My Sales Today" value="₱4,320" caption="This store, vs. yesterday" change={5.4} />
        <StatCard variant="orders" title="My Orders Today" value={31} caption="Completed orders" />
        <StatCard variant="products" title="Items Sold" value={47} caption="Drinks and snacks" />
      </div>

      <div className={styles.panels}>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Recent orders</h2>
          <p className={styles.panelText}>Your latest orders this shift.</p>
          <div className={styles.panelEmpty}>List coming in Phase 3</div>
        </div>
      </div>
    </section>
  );
}

export default CashierDashboardPage;
