import { Link } from 'react-router-dom';
import Icon from '../Icon/Icon';
import styles from './StatCard.module.css';

import salesIcon from '../../../assets/icons/cards/sales.svg';
import ordersIcon from '../../../assets/icons/cards/orders.svg';
import lowStockIcon from '../../../assets/icons/cards/low-stock.svg';
import outOfStockIcon from '../../../assets/icons/cards/out-of-stock.svg';
import stockInIcon from '../../../assets/icons/cards/stock-in.svg';
import productsIcon from '../../../assets/icons/cards/products.svg';
import usersIcon from '../../../assets/icons/cards/users.svg';
import ownerIcon from '../../../assets/icons/cards/owner.svg';
import clerkIcon from '../../../assets/icons/cards/clerk.svg';
import cashierIcon from '../../../assets/icons/cards/cashier.svg';
import baristaIcon from '../../../assets/icons/cards/barista.svg';
import kitchenIcon from '../../../assets/icons/cards/kitchen.svg';
import trendUpIcon from '../../../assets/icons/cards/trend-up.svg';
import trendDownIcon from '../../../assets/icons/cards/trend-down.svg';

export type StatCardVariant =
  | 'sales'
  | 'orders'
  | 'lowStock'
  | 'outOfStock'
  | 'stockIn'
  | 'products'
  | 'users'
  | 'owners'
  | 'clerks'
  | 'cashiers'
  | 'baristas'
  | 'kitchen';

const variantIcons: Record<StatCardVariant, string> = {
  sales: salesIcon,
  orders: ordersIcon,
  lowStock: lowStockIcon,
  outOfStock: outOfStockIcon,
  stockIn: stockInIcon,
  products: productsIcon,
  users: usersIcon,
  owners: ownerIcon,
  clerks: clerkIcon,
  cashiers: cashierIcon,
  baristas: baristaIcon,
  kitchen: kitchenIcon,
};

interface StatCardProps {
  title: string;
  value: string | number;
  /** Maliit na text sa ilalim, hal. "Today" o "vs. yesterday" */
  caption: string;
  variant: StatCardVariant;
  /** Pagbabago sa porsiyento, hal. 12.5 o -3. Hindi ipapakita kapag wala */
  change?: number;
  /** Kapag may route, magiging shortcut ang buong card papunta roon */
  to?: string;
}

function StatCard({ title, value, caption, variant, change, to }: StatCardProps) {
  const trend = change === undefined || change === 0 ? null : change > 0 ? 'up' : 'down';

  const content = (
    <>
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
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`${styles.card} ${styles[variant]} ${styles.clickable}`}>
        {content}
      </Link>
    );
  }

  return <article className={`${styles.card} ${styles[variant]}`}>{content}</article>;
}

export default StatCard;
