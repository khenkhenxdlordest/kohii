import { useEffect, useMemo, useState } from 'react';
import Icon from '../../../components/ui/Icon/Icon';
import Button from '../../../components/ui/Button/Button';
import DataTable, { type DataTableColumn } from '../../../components/ui/DataTable/DataTable';
import DateRangeFilter, { type DateRangeValue } from '../../../components/ui/DateRangeFilter/DateRangeFilter';
import ExportReportModal from '../../../components/modal/admin/SalesReportsPage/ExportReportModal/ExportReportModal';
import { useAuth } from '../../../hooks/useAuth';
import { getOrders } from '../../../api/orders.api';
import { dateOf, discountLabel } from '../../../utils/salesAggregation';
import { formatDateTime, formatPeso } from '../../../utils/format';
import type { OrderListItem } from '../../../types';
import styles from './DailySalesPage.module.css';

import searchIcon from '../../../assets/icons/actions/search.svg';
import downloadIcon from '../../../assets/icons/sidebar/stock-in.svg';

const DAYS_OF_DATA = 90;

const toIso = (date: Date) => date.toISOString().slice(0, 10);

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

function DailySalesPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeValue>({ preset: 'today', from: toIso(new Date()), to: toIso(new Date()) });
  const [exportOpen, setExportOpen] = useState(false);
  const [sales, setSales] = useState<OrderListItem[] | null>(null);

  const storeName = user?.store?.name ?? '';

  useEffect(() => {
    if (!user?.storeId) return;
    let ignore = false;
    const to = toIso(new Date());
    const from = toIso(new Date(Date.now() - DAYS_OF_DATA * 86_400_000));
    getOrders({ storeId: user.storeId, from, to })
      .then((rows) => !ignore && setSales(rows))
      .catch(() => !ignore && setSales([]));
    return () => {
      ignore = true;
    };
  }, [user?.storeId]);

  const shownSales = useMemo(
    () =>
      (sales ?? []).filter((s) => {
        const day = dateOf(s.createdAt);
        if (dateRange.from && day < dateRange.from) return false;
        if (dateRange.to && day > dateRange.to) return false;
        return true;
      }),
    [sales, dateRange],
  );

  const totals = useMemo(() => {
    const sum = shownSales.reduce((acc, s) => acc + s.total, 0);
    return { sum, count: shownSales.length };
  }, [shownSales]);

  const rangeLabel = useMemo(() => {
    const datePart = dateRange.from || dateRange.to ? `${dateRange.from || '…'} to ${dateRange.to || '…'}` : `Last ${DAYS_OF_DATA} days`;
    return `${storeName} · ${datePart}`;
  }, [dateRange, storeName]);

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Daily Sales</h1>
          <p className={styles.subtitle}>Your sales summary, filterable by day.</p>
        </div>
      </header>

      <div className={styles.summaryBar}>
        <div className={styles.summaryChip}>
          <span className={styles.summaryLabel}>Orders</span>
          <span className={styles.summaryValue}>{totals.count}</span>
        </div>
        <div className={styles.summaryChip}>
          <span className={styles.summaryLabel}>Total sales</span>
          <span className={styles.summaryValue}>{formatPeso(totals.sum)}</span>
        </div>
      </div>

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Icon src={searchIcon} size={18} />
          <span className={styles.srOnly}>Search sales</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payment or discount"
          />
        </label>

        <DateRangeFilter value={dateRange} onApply={setDateRange} />

        <Button variant="secondary" size="sm" icon={downloadIcon} className={styles.exportButton} onClick={() => setExportOpen(true)}>
          Export
        </Button>
      </div>

      <DataTable
        rows={shownSales}
        columns={columns}
        getRowId={(row) => row.id}
        searchTerm={search}
        pageSize={10}
        emptyMessage={sales === null ? 'Loading...' : 'No sales found.'}
      />

      {exportOpen && <ExportReportModal rows={shownSales} rangeLabel={rangeLabel} onClose={() => setExportOpen(false)} />}
    </section>
  );
}

export default DailySalesPage;
