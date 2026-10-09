import styles from './StatusBadge.module.css';

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`${styles.badge} ${active ? styles.active : styles.inactive}`}>
      <span className={styles.dot} aria-hidden="true" />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

export default StatusBadge;
