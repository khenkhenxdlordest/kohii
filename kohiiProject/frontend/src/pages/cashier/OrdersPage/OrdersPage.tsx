import { useMemo, useState } from 'react';
import Icon from '../../../components/ui/Icon/Icon';
import DataTable, { type DataTableColumn } from '../../../components/ui/DataTable/DataTable';
import { useAuth } from '../../../hooks/useAuth';
import { getMockSales, type MockSaleRow } from '../../../utils/mockDashboard';
import { formatDateTime, formatPeso } from '../../../utils/format';
import styles from './OrdersPage.module.css';

import searchIcon from '../../../assets/icons/actions/search.svg';

const DAYS_OF_DATA = 30;

// TODO(Phase 6): palitan ng totoong orders mula sa GET /api/orders kapag tapos na ang Shift feature
function OrdersPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const storeCode = user?.store?.code ?? 'PDM';
  const cashierName = user?.profile ? `${user.profile.firstName} ${user.profile.lastName}` : 'Cashier';

  const orders = useMemo(
    () =>
      getMockSales([cashierName], DAYS_OF_DATA).filter(
        (row) => row.storeCode === storeCode && row.cashier === cashierName,
      ),
    [storeCode, cashierName],
  );

  const columns: DataTableColumn<MockSaleRow>[] = [
    {
      key: 'dateTime',
      header: 'Date & Time',
      width: 180,
      sortValue: (row) => row.dateTime,
      render: (row) => formatDateTime(row.dateTime),
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
      sortValue: (row) => row.discount,
      render: (row) =>
        row.discount === 'None' ? <span className={styles.muted}>None</span> : <span className={styles.discountTag}>{row.discount}</span>,
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

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Orders</h1>
          <p className={styles.subtitle}>Orders made during your shift.</p>
        </div>
        <span className={styles.sampleNote}>Sample data</span>
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
        rows={orders}
        columns={columns}
        getRowId={(row) => row.id}
        searchTerm={search}
        pageSize={10}
        emptyMessage="No orders yet."
      />
    </section>
  );
}

export default OrdersPage;
