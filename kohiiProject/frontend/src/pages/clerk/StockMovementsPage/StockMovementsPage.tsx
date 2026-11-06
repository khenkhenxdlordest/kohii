import { useEffect, useState } from 'react';
import { useRealtime } from '../../../hooks/useRealtime';
import styles from './StockMovementsPage.module.css';

import Icon from '../../../components/ui/Icon/Icon';
import DataTable, { type DataTableColumn } from '../../../components/ui/DataTable/DataTable';
import { getMovements } from '../../../api/inventory.api';
import type { StockMovement, StockMovementType } from '../../../types';
import { formatDateTime, formatPeso } from '../../../utils/format';
import { formatQty, movementLabels, wasteCauseLabels } from '../../../utils/inventory';

import searchIcon from '../../../assets/icons/actions/search.svg';

type TypeFilter = StockMovementType | 'ALL';

const typeOrder: StockMovementType[] = ['STOCK_IN', 'WITHDRAW', 'WASTE', 'SALE', 'AUDIT_ADJUST', 'VOID_RETURN'];

function StockMovementsPage() {
  const { socket } = useRealtime();
  const [movements, setMovements] = useState<StockMovement[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let ignore = false;
    getMovements({ limit: 500 })
      .then((list) => {
        if (!ignore) setMovements(list);
      })
      .catch((err: Error) => {
        if (!ignore) setLoadError(err.message);
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => setReloadKey((k) => k + 1);
    socket.on('stock:updated', refresh);
    return () => {
      socket.off('stock:updated', refresh);
    };
  }, [socket]);

  const list = movements ?? [];
  const rows = typeFilter === 'ALL' ? list : list.filter((m) => m.type === typeFilter);

  const columns: DataTableColumn<StockMovement>[] = [
    {
      key: 'date',
      header: 'Date',
      width: 170,
      sortValue: (m) => m.createdAt,
      render: (m) => formatDateTime(m.createdAt),
    },
    {
      key: 'item',
      header: 'Item',
      searchValue: (m) => m.item.name,
      sortValue: (m) => m.item.name,
      render: (m, highlight) => highlight(m.item.name),
    },
    {
      key: 'type',
      header: 'Type',
      width: 150,
      sortValue: (m) => movementLabels[m.type],
      render: (m) => (
        <span className={`${styles.typeTag} ${styles[m.type]}`}>
          {m.source === 'EMERGENCY' ? 'Emergency' : movementLabels[m.type]}
          {m.wasteCause && ` · ${wasteCauseLabels[m.wasteCause]}`}
        </span>
      ),
    },
    {
      key: 'qty',
      header: 'Qty',
      width: 130,
      align: 'right',
      sortValue: (m) => m.qty,
      render: (m) => (
        <span className={m.qty >= 0 ? styles.qtyIn : styles.qtyOut}>
          {m.qty >= 0 ? '+' : '−'}
          {formatQty(Math.abs(m.qty), m.item.unit)}
        </span>
      ),
    },
    {
      key: 'balance',
      header: 'Balance after',
      width: 140,
      align: 'right',
      sortValue: (m) => m.balanceAfter,
      render: (m) => formatQty(m.balanceAfter, m.item.unit),
    },
    {
      key: 'store',
      header: 'Store',
      width: 110,
      searchValue: (m) => m.store?.name,
      render: (m) => m.store?.code ?? '—',
    },
    { key: 'user', header: 'By', width: 140, searchValue: (m) => m.user, render: (m, h) => h(m.user) },
    {
      key: 'note',
      header: 'Note',
      searchValue: (m) => m.note,
      render: (m, highlight) => (
        <span className={styles.note}>
          {highlight(m.note)}
          {m.supplier && ` ${m.note ? '· ' : ''}${m.supplier}`}
          {m.totalCost !== null && ` · ${formatPeso(m.totalCost)}`}
        </span>
      ),
    },
  ];

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Stock Movements</h1>
          <p className={styles.subtitle}>History of every stock change.</p>
        </div>
      </header>

      {loadError ? (
        <p className={styles.state}>{loadError}</p>
      ) : movements === null ? (
        <p className={styles.state}>Loading...</p>
      ) : (
        <>
          <div className={styles.typeTabs} role="tablist" aria-label="Movement type">
            <button
              type="button"
              role="tab"
              aria-selected={typeFilter === 'ALL'}
              className={`${styles.typeTab} ${typeFilter === 'ALL' ? styles.typeTabActive : ''}`}
              onClick={() => setTypeFilter('ALL')}
            >
              All
            </button>
            {typeOrder.map((type) => (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={typeFilter === type}
                className={`${styles.typeTab} ${typeFilter === type ? styles.typeTabActive : ''}`}
                onClick={() => setTypeFilter(type)}
              >
                {movementLabels[type]}
              </button>
            ))}
          </div>

          <label className={styles.search}>
            <Icon src={searchIcon} size={18} />
            <span className={styles.srOnly}>Search movements</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search item, user or note"
            />
          </label>

          <DataTable
            key={typeFilter}
            rows={rows}
            columns={columns}
            getRowId={(m) => m.id}
            searchTerm={search}
            pageSize={12}
            emptyMessage="No stock movements yet."
          />
        </>
      )}
    </section>
  );
}

export default StockMovementsPage;
