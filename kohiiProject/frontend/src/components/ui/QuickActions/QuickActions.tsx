import { Link } from 'react-router-dom';
import Icon from '../Icon/Icon';
import styles from './QuickActions.module.css';

export interface QuickActionItem {
  to: string;
  title: string;
  description: string;
  chipText: string;
  /** SVG mula sa assets/icons */
  icon: string;
}

/** Card na naka-link sa isang page, may maikling paliwanag at icon preview sa kanan */
function QuickActions({ title, subtitle, items }: { title: string; subtitle: string; items: QuickActionItem[] }) {
  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.subtitle}>{subtitle}</p>

      <div className={styles.grid}>
        {items.map((item) => (
          <Link key={item.to} to={item.to} className={styles.card}>
            <div className={styles.left}>
              <p className={styles.cardTitle}>{item.title}</p>
              <p className={styles.cardDesc}>{item.description}</p>
              <span className={styles.chip}>{item.chipText}</span>
            </div>
            <div className={styles.right}>
              <Icon src={item.icon} size={30} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default QuickActions;
