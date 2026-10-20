import { useEffect, useState } from 'react';
import Icon from '../../../components/ui/Icon/Icon';
import DataTable, { type DataTableColumn } from '../../../components/ui/DataTable/DataTable';
import { useAuth } from '../../../hooks/useAuth';
import { getOrders } from '../../../api/orders.api';
import { discountLabel } from '../../../utils/salesAggregation';
import { formatDateTime, formatPeso } from '../../../utils/format';
import type { OrderListItem } from '../../../types';
import styles from './OrdersPage.module.css';

import searchIcon from '../../../assets/icons/actions/search.svg';

const DAYS_OF_DATA = 30;

const columns: DataTableColumn<OrderListItem>[] = [
  {
    key: 'dateTime',
    header: 'Date & Time',
    width: 180,
    sortValue: (row) => row.createdAt,
    render: (row) => formatDateTime(row.createdAt),
  },
  { key: 'items', header: 'Items', width: 80, align: 'right', sortValue: (row) => row.itemsCount },
  {
    key: 'payment',
    header: 'Payment',
    width: 110,
    sortValue: (row) => row.paymentMethod,
    render: (row) => <span className={`${styles.paymentTag} ${styles[row.paymentMethod]}`}>{row.paymentMethod}</span>,
  },
  {
    key: 'discount',
    header: 'Discount',
    width: 120,
    sortValue: (row) => row.discountType,
    render: (row) =>
      row.discountType === 'NONE' ? (
        <span className={styles.muted}>None</span>
      ) : (
        <span className={styles.discountTag}>{discountLabel(row)}</span>
      ),
  },
  {
    key: 'total',
    header: 'Total',
    width: 120,
    align: 'right',
    sortValue: (row) => row.total,
    render: (row) => <span className={styles.total}>{formatPeso(row.total)}</span>,
  },
];

const toIso = (date: Date) => date.toISOString().slice(0, 10);

function OrdersPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<OrderListItem[] | null>(null);

  useEffect(() => {
    if (!user?.storeId) return;
    let ignore = false;
    const to = toIso(new Date());
    const from = toIso(new Date(Date.now() - DAYS_OF_DATA * 86_400_000));
    getOrders({ storeId: user.storeId, cashierId: user.id, from, to })
      .then((rows) => !ignore && setOrders(rows))
      .catch(() => !ignore && setOrders([]));
    return () => {
      ignore = true;
    };
  }, [user?.storeId, user?.id]);

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Orders</h1>
          <p className={styles.subtitle}>Orders made during your shift.</p>
        </div>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Icon src={searchIcon} size={18} />
          <span className={styles.srOnly}>Search orders</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payment or discount"
          />
        </label>
      </div>

      <DataTable
        rows={orders ?? []}
        columns={columns}
        getRowId={(row) => row.id}
        searchTerm={search}
        pageSize={10}
        emptyMessage={orders === null ? 'Loading...' : 'No orders yet.'}
      />
    </section>
  );
}

export default OrdersPage;
