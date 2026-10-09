import { useEffect, useMemo, useState } from 'react';
import styles from './ProductPerformancePage.module.css';

import Icon from '../../../components/ui/Icon/Icon';
import DataTable, { type DataTableColumn, type DataTableAction } from '../../../components/ui/DataTable/DataTable';
import PriceHistoryModal from '../../../components/modal/admin/ProductPerformancePage/PriceHistoryModal/PriceHistoryModal';
import { getProducts } from '../../../api/products.api';
import { getProductPerformance, type ProductPerformance } from '../../../utils/mockDashboard';
import { categoryGroupLabels } from '../../../utils/categoryGroups';
import { formatPeso } from '../../../utils/format';
import type { CategoryGroup, Product } from '../../../types';

import searchIcon from '../../../assets/icons/actions/search.svg';
import historyIcon from '../../../assets/icons/actions/history.svg';
import trendUpIcon from '../../../assets/icons/cards/trend-up.svg';
import trendDownIcon from '../../../assets/icons/cards/trend-down.svg';

type GroupFilter = 'all' | CategoryGroup;

type Row = Product & { performance: ProductPerformance };

function ProductPerformancePage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');
  const [historyTarget, setHistoryTarget] = useState<Product | null>(null);

  useEffect(() => {
    let ignore = false;
    getProducts()
      .then((list) => !ignore && setProducts(list))
      .catch((err: Error) => !ignore && setLoadError(err.message));
    return () => {
      ignore = true;
    };
  }, []);

  // TODO(Phase 3/6): palitan ng totoong units sold/revenue mula sa GET /api/reports kapag tapos na ang POS
  const rows: Row[] = useMemo(() => {
    if (!products) return [];
    const performance = getProductPerformance(products);
    const byId = new Map(performance.map((p) => [p.id, p]));
    return products
      .filter((p) => p.isActive)
      .map((p) => ({ ...p, performance: byId.get(p.id)! }))
      .sort((a, b) => b.performance.unitsSold - a.performance.unitsSold);
  }, [products]);

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
        <span className={styles.sampleNote}>Units sold &amp; revenue: sample data</span>
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
