import { useEffect, useMemo, useState } from 'react';
import styles from './SalesReportsPage.module.css';

import Icon from '../../../components/ui/Icon/Icon';
import Button from '../../../components/ui/Button/Button';
import DataTable, { type DataTableColumn } from '../../../components/ui/DataTable/DataTable';
import DailySalesChart from '../../../components/ui/DailySalesChart/DailySalesChart';
import DateRangeFilter, { defaultDateRangeValue, type DateRangeValue } from '../../../components/ui/DateRangeFilter/DateRangeFilter';
import ExportReportModal from '../../../components/modal/admin/SalesReportsPage/ExportReportModal/ExportReportModal';
import { getEmployees } from '../../../api/employees.api';
import { getMockSales, STORE_CODES, type MockSaleRow } from '../../../utils/mockDashboard';
import { formatDateTime, formatPeso } from '../../../utils/format';

import searchIcon from '../../../assets/icons/actions/search.svg';
import downloadIcon from '../../../assets/icons/sidebar/stock-in.svg';

type StoreFilter = 'all' | string;

const STORE_NAMES: Record<string, string> = { ALY: 'Alley', PDM: 'Podium' };
// 90 araw (~3 buwan) para may laman kapag pumili ng nakaraang buwan gamit ang "Select month"
const DAYS_OF_DATA = 90;

const columns: DataTableColumn<MockSaleRow>[] = [
  {
    key: 'dateTime',
    header: 'Date & Time',
    width: 180,
    sortValue: (row) => row.dateTime,
    render: (row) => formatDateTime(row.dateTime),
  },
  {
    key: 'store',
    header: 'Store',
    width: 130,
    searchValue: (row) => row.storeName,
    sortValue: (row) => row.storeName,
    render: (row, highlight) => (
      <span className={styles.storeTag}>
        {highlight(row.storeName)} <span className={styles.storeCode}>{row.storeCode}</span>
      </span>
    ),
  },
  {
    key: 'cashier',
    header: 'Cashier',
    searchValue: (row) => row.cashier,
    sortValue: (row) => row.cashier,
    render: (row, highlight) => highlight(row.cashier),
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

const dateOf = (iso: string) => iso.slice(0, 10);

function SalesReportsPage() {
  const [cashierNames, setCashierNames] = useState<string[] | null>(null);
  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState<StoreFilter>('all');
  const [dateRange, setDateRange] = useState<DateRangeValue>(defaultDateRangeValue);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    getEmployees()
      .then((employees) => {
        if (ignore) return;
        const names = employees
          .filter((e) => e.position === 'CASHIER' && e.profile)
          .map((e) => `${e.profile!.firstName} ${e.profile!.lastName}`);
        setCashierNames(names);
      })
      .catch(() => !ignore && setCashierNames([]));
    return () => {
      ignore = true;
    };
  }, []);

  // TODO(Phase 3/6): palitan ng totoong sales mula sa GET /api/reports kapag tapos na ang POS
  const sales = useMemo(() => getMockSales(cashierNames ?? [], DAYS_OF_DATA), [cashierNames]);

  const shownSales = useMemo(() => {
    return sales.filter((s) => {
      if (storeFilter !== 'all' && s.storeCode !== storeFilter) return false;
      const day = dateOf(s.dateTime);
      if (dateRange.from && day < dateRange.from) return false;
      if (dateRange.to && day > dateRange.to) return false;
      return true;
    });
  }, [sales, storeFilter, dateRange]);

  const totals = useMemo(() => {
    const sum = shownSales.reduce((acc, s) => acc + s.total, 0);
    return { sum, count: shownSales.length };
  }, [shownSales]);

  // Hiwalay sa date filter ng table: laging ang buong DAYS_OF_DATA window ang
  // pinapakita ng chart (ang sarili nitong Daily/Monthly/Yearly toggle ang
  // nagde-decide kung gaano karami ang ipapakita), store filter lang ang sinusunod
  const chartSales = useMemo(
    () => (storeFilter === 'all' ? sales : sales.filter((s) => s.storeCode === storeFilter)),
    [sales, storeFilter],
  );

  const chartData = useMemo(() => {
    const byDay = new Map<string, { orders: number; total: number }>();
    for (const s of chartSales) {
      const day = dateOf(s.dateTime);
      const entry = byDay.get(day) ?? { orders: 0, total: 0 };
      entry.orders += 1;
      entry.total += s.total;
      byDay.set(day, entry);
    }
    return [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, data]) => ({ day, orders: data.orders, total: data.total }));
  }, [chartSales]);

  const chartSubtitle = storeFilter === 'all' ? 'Both stores' : (STORE_NAMES[storeFilter] ?? storeFilter);

  const rangeLabel = useMemo(() => {
    const storePart = storeFilter === 'all' ? 'Both stores' : (STORE_NAMES[storeFilter] ?? storeFilter);
    const datePart =
      dateRange.from || dateRange.to ? `${dateRange.from || '…'} to ${dateRange.to || '…'}` : `Last ${DAYS_OF_DATA} days`;
    return `${storePart} · ${datePart}`;
  }, [storeFilter, dateRange]);

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Sales Reports</h1>
          <p className={styles.subtitle}>Sales per day, store and cashier.</p>
        </div>
        <span className={styles.sampleNote}>Sample data</span>
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

      {chartData.length > 1 && (
        <div className={styles.dailyPanel}>
          <DailySalesChart data={chartData} subtitle={chartSubtitle} />
        </div>
      )}

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Icon src={searchIcon} size={18} />
          <span className={styles.srOnly}>Search sales</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search store or cashier"
          />
        </label>

        <div className={styles.segmented} role="group" aria-label="Store">
          <button
            type="button"
            className={storeFilter === 'all' ? styles.segmentActive : ''}
            aria-pressed={storeFilter === 'all'}
            onClick={() => setStoreFilter('all')}
          >
            All
          </button>
          {STORE_CODES.map((code) => (
            <button
              key={code}
              type="button"
              className={storeFilter === code ? styles.segmentActive : ''}
              aria-pressed={storeFilter === code}
              onClick={() => setStoreFilter(code)}
            >
              {STORE_NAMES[code] ?? code}
            </button>
          ))}
        </div>

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
        emptyMessage={cashierNames === null ? 'Loading...' : 'No sales found.'}
      />

      {exportOpen && <ExportReportModal rows={shownSales} rangeLabel={rangeLabel} onClose={() => setExportOpen(false)} />}
    </section>
  );
}

export default SalesReportsPage;
