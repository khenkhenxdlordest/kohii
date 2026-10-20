import { useEffect, useMemo, useState } from 'react';
import styles from './ProductPerformancePage.module.css';

import Icon from '../../../components/ui/Icon/Icon';
import DataTable, { type DataTableColumn, type DataTableAction } from '../../../components/ui/DataTable/DataTable';
import PriceHistoryModal from '../../../components/modal/admin/ProductPerformancePage/PriceHistoryModal/PriceHistoryModal';
import { getProducts } from '../../../api/products.api';
import { getOrders } from '../../../api/orders.api';
import { pctChange, productSales } from '../../../utils/salesAggregation';
import { categoryGroupLabels } from '../../../utils/categoryGroups';
import { formatPeso } from '../../../utils/format';
import type { CategoryGroup, Product } from '../../../types';

import searchIcon from '../../../assets/icons/actions/search.svg';
import historyIcon from '../../../assets/icons/actions/history.svg';
import trendUpIcon from '../../../assets/icons/cards/trend-up.svg';
import trendDownIcon from '../../../assets/icons/cards/trend-down.svg';

type GroupFilter = 'all' | CategoryGroup;

interface Performance {
  unitsSold: number;
  revenue: number;
  trend: number;
}

type Row = Product & { performance: Performance };

const toIso = (date: Date) => date.toISOString().slice(0, 10);

function ProductPerformancePage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [performanceById, setPerformanceById] = useState<Map<number, Performance> | null>(null);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');
  const [historyTarget, setHistoryTarget] = useState<Product | null>(null);

  useEffect(() => {
    let ignore = false;
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    Promise.all([
      getProducts(),
      getOrders({ from: toIso(thisMonthStart), to: toIso(now), includeItems: true }),
      getOrders({ from: toIso(lastMonthStart), to: toIso(lastMonthEnd), includeItems: true }),
    ])
      .then(([productList, thisMonthOrders, lastMonthOrders]) => {
        if (ignore) return;
        setProducts(productList);
        const thisMonth = new Map(productSales(thisMonthOrders).map((p) => [p.productId, p]));
        const lastMonth = new Map(productSales(lastMonthOrders).map((p) => [p.productId, p]));
        const byId = new Map<number, Performance>();
        for (const p of productList) {
          const current = thisMonth.get(p.id);
          const before = lastMonth.get(p.id);
          byId.set(p.id, {
            unitsSold: current?.qty ?? 0,
            revenue: current?.revenue ?? 0,
            trend: pctChange(current?.qty ?? 0, before?.qty ?? 0),
          });
        }
        setPerformanceById(byId);
      })
      .catch((err: Error) => !ignore && setLoadError(err.message));
    return () => {
      ignore = true;
    };
  }, []);

  const rows: Row[] = useMemo(() => {
    if (!products || !performanceById) return [];
    return products
      .filter((p) => p.isActive)
      .map((p) => ({ ...p, performance: performanceById.get(p.id) ?? { unitsSold: 0, revenue: 0, trend: 0 } }))
      .sort((a, b) => b.performance.unitsSold - a.performance.unitsSold);
  }, [products, performanceById]);

  const shownRows = groupFilter === 'all' ? rows : rows.filter((r) => r.category.group === groupFilter);

  const columns: DataTableColumn<Row>[] = [
    {
      key: 'rank',
      header: '#',
      width: 48,
      render: (row) => <span className={styles.rank}>{shownRows.indexOf(row) + 1}</span>,
    },
    {
      key: 'name',
      header: 'Product',
      searchValue: (row) => row.name,
      render: (row, highlight) => (
        <>
          <span className={styles.name}>{highlight(row.name)}</span>
          <span className={styles.category}>{row.category.name}</span>
        </>
      ),
    },
    {
      key: 'unitsSold',
      header: 'Units sold',
      width: 120,
      align: 'right',
      sortValue: (row) => row.performance.unitsSold,
      render: (row) => row.performance.unitsSold,
    },
    {
      key: 'revenue',
      header: 'Revenue',
      width: 130,
      align: 'right',
      sortValue: (row) => row.performance.revenue,
      render: (row) => <span className={styles.revenue}>{formatPeso(row.performance.revenue)}</span>,
    },
    {
      key: 'trend',
      header: 'Trend',
      width: 110,
      align: 'right',
      sortValue: (row) => row.performance.trend,
      render: (row) => {
        const { trend } = row.performance;
        if (trend === 0) return <span className={styles.muted}>—</span>;
        const up = trend > 0;
        return (
          <span className={`${styles.trend} ${up ? styles.trendUp : styles.trendDown}`}>
            <Icon src={up ? trendUpIcon : trendDownIcon} size={13} />
            {up ? '+' : ''}
            {trend}%
          </span>
        );
      },
    },
  ];

  const actions: DataTableAction<Row>[] = [
    { id: 'history', label: 'Price history', icon: historyIcon, onClick: (row) => setHistoryTarget(row) },
  ];

  const groupOptions: GroupFilter[] = ['all', 'DRINKS', 'RICE_MEALS', 'SNACKS'];

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Product Performance</h1>
          <p className={styles.subtitle}>Best and least selling products, with price history per product.</p>
        </div>
      </header>

      {loadError ? (
        <p className={styles.state}>{loadError}</p>
      ) : (
        <>
          <div className={styles.toolbar}>
            <label className={styles.search}>
              <Icon src={searchIcon} size={18} />
              <span className={styles.srOnly}>Search products</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products"
              />
            </label>

            <div className={styles.segmented} role="group" aria-label="Category group">
              {groupOptions.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={groupFilter === value ? styles.segmentActive : ''}
                  aria-pressed={groupFilter === value}
                  onClick={() => setGroupFilter(value)}
                >
                  {value === 'all' ? 'All' : categoryGroupLabels[value]}
                </button>
              ))}
            </div>
          </div>

          <DataTable
            rows={shownRows}
            columns={columns}
            actions={actions}
            getRowId={(row) => row.id}
            searchTerm={search}
            pageSize={10}
            emptyMessage={products === null ? 'Loading...' : 'No active products.'}
          />
        </>
      )}

      {historyTarget && <PriceHistoryModal product={historyTarget} onClose={() => setHistoryTarget(null)} />}
    </section>
  );
}

export default ProductPerformancePage;
