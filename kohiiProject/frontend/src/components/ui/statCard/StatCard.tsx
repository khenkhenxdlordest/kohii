import Icon from '../Icon/Icon';
import styles from './StatCard.module.css';

import salesIcon from '../../../assets/icons/cards/sales.svg';
import ordersIcon from '../../../assets/icons/cards/orders.svg';
import lowStockIcon from '../../../assets/icons/cards/low-stock.svg';
import outOfStockIcon from '../../../assets/icons/cards/out-of-stock.svg';
import stockInIcon from '../../../assets/icons/cards/stock-in.svg';
import productsIcon from '../../../assets/icons/cards/products.svg';
import trendUpIcon from '../../../assets/icons/cards/trend-up.svg';
import trendDownIcon from '../../../assets/icons/cards/trend-down.svg';

export type StatCardVariant = 'sales' | 'orders' | 'lowStock' | 'outOfStock' | 'stockIn' | 'products';

const variantIcons: Record<StatCardVariant, string> = {
  sales: salesIcon,
  orders: ordersIcon,
  lowStock: lowStockIcon,
  outOfStock: outOfStockIcon,
  stockIn: stockInIcon,
  products: productsIcon,
};

interface StatCardProps {
  title: string;
  value: string | number;
  /** Maliit na text sa ilalim, hal. "Today" o "vs. yesterday" */
  caption: string;
  variant: StatCardVariant;
  /** Pagbabago sa porsiyento, hal. 12.5 o -3. Hindi ipapakita kapag wala */
  change?: number;
}

function StatCard({ title, value, caption, variant, change }: StatCardProps) {
  const trend = change === undefined || change === 0 ? null : change > 0 ? 'up' : 'down';

  return (
    <article className={`${styles.card} ${styles[variant]}`}>
      <span className={styles.accent} aria-hidden="true" />

      <div className={styles.body}>
        <p className={styles.title}>{title}</p>
        <p className={styles.value}>{value}</p>
        <p className={styles.caption}>{caption}</p>
      </div>

      <div className={styles.side}>
        <span className={styles.iconChip}>
          <Icon src={variantIcons[variant]} size={20} />
        </span>
        {change !== undefined && (
          <span className={`${styles.trend} ${trend ? styles[trend] : ''}`}>
            {trend && <Icon src={trend === 'up' ? trendUpIcon : trendDownIcon} size={14} />}
            {change > 0 ? '+' : ''}
            {change}%
          </span>
        )}
      </div>
    </article>
  );
}

export default StatCard;
