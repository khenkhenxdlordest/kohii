import { useEffect, useMemo, useState } from 'react';
import styles from './InventoryReportsPage.module.css';

import Icon from '../../../components/ui/Icon/Icon';
import Button from '../../../components/ui/Button/Button';
import DataTable, { type DataTableColumn } from '../../../components/ui/DataTable/DataTable';
import { getInventoryItems, getMovements } from '../../../api/inventory.api';
import type { InventoryItem, StockMovement, StockMovementType, WasteCause } from '../../../types';
import { formatQty, movementLabels, wasteCauseLabels } from '../../../utils/inventory';
import { formatDateTime, formatPeso } from '../../../utils/format';

import searchIcon from '../../../assets/icons/actions/search.svg';

type TypeFilter = 'all' | StockMovementType;

const movementTypeOrder: StockMovementType[] = ['STOCK_IN', 'WITHDRAW', 'WASTE', 'SALE', 'AUDIT_ADJUST', 'VOID_RETURN'];
const wasteCauseOrder: WasteCause[] = ['SPOILED', 'EXPIRED', 'SPILLED', 'DAMAGED', 'OTHER'];
const MOVEMENT_LIMIT = 200;

function InventoryReportsPage() {
  const [movements, setMovements] = useState<StockMovement[] | null>(null);
  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  useEffect(() => {
    let ignore = false;
    Promise.all([getMovements({ limit: MOVEMENT_LIMIT }), getInventoryItems(true)])
      .then(([movementList, itemList]) => {
        if (ignore) return;
        setMovements(movementList);
        setItems(itemList);
      })
      .catch((err: Error) => {
        if (!ignore) setLoadError(err.message);
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const unitCostById = useMemo(() => new Map((items ?? []).map((i) => [i.id, i.unitCost])), [items]);

  // Totoong WasteLog mula sa movements; estimated cost lang gamit ang unit cost ng item
  const wasteSummary = useMemo(() => {
    const wasteRows = (movements ?? []).filter((m) => m.type === 'WASTE');
    return wasteCauseOrder
      .map((cause) => {
        const rows = wasteRows.filter((m) => m.wasteCause === cause);
        const cost = rows.reduce((sum, m) => {
          const unitCost = unitCostById.get(m.item.id);
          return unitCost ? sum + Math.abs(m.qty) * unitCost : sum;
        }, 0);
        return { cause, count: rows.length, cost };
      })
      .filter((row) => row.count > 0);
  }, [movements, unitCostById]);

  const shownMovements = useMemo(
    () => (typeFilter === 'all' ? (movements ?? []) : (movements ?? []).filter((m) => m.type === typeFilter)),
    [movements, typeFilter],
  );

  const columns: DataTableColumn<StockMovement>[] = [
    {
      key: 'createdAt',
      header: 'Date',
      width: 170,
      sortValue: (row) => row.createdAt,
      render: (row) => formatDateTime(row.createdAt),
    },
    {
      key: 'item',
      header: 'Item',
      searchValue: (row) => row.item.name,
      sortValue: (row) => row.item.name,
      render: (row, highlight) => highlight(row.item.name),
    },
    {
      key: 'type',
      header: 'Type',
      width: 150,
      sortValue: (row) => row.type,
      render: (row) => <span className={`${styles.typeTag} ${styles[row.type]}`}>{movementLabels[row.type]}</span>,
    },
    {
      key: 'qty',
      header: 'Qty',
      width: 110,
      align: 'right',
      sortValue: (row) => row.qty,
      render: (row) => (
        <span className={row.qty >= 0 ? styles.qtyIn : styles.qtyOut}>
          {row.qty >= 0 ? '+' : '−'}
          {formatQty(Math.abs(row.qty), row.item.unit)}
        </span>
      ),
    },
    {
      key: 'balanceAfter',
      header: 'Balance',
      width: 110,
      align: 'right',
      sortValue: (row) => row.balanceAfter,
      render: (row) => formatQty(row.balanceAfter, row.item.unit),
    },
    {
      key: 'store',
      header: 'Store',
      width: 100,
      sortValue: (row) => row.store?.name ?? '',
      render: (row) => row.store?.name ?? <span className={styles.muted}>—</span>,
    },
    {
      key: 'user',
      header: 'By',
      width: 140,
      searchValue: (row) => row.user,
      sortValue: (row) => row.user,
      render: (row, highlight) => highlight(row.user),
    },
    {
      key: 'note',
      header: 'Note',
      searchValue: (row) => row.note ?? '',
      render: (row, highlight) => <span className={styles.note}>{highlight(row.note ?? '')}</span>,
    },
  ];

  const retry = () => {
    setLoadError('');
    setMovements(null);
    setItems(null);
    setReloadKey((k) => k + 1);
  };

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Inventory Reports</h1>
          <p className={styles.subtitle}>Stock movements and waste, across both stores.</p>
        </div>
      </header>

      {loadError ? (
        <div className={styles.state}>
          <p>{loadError}</p>
          <Button variant="secondary" size="sm" onClick={retry}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <div className={styles.wastePanel}>
            <h2 className={styles.panelTitle}>Waste this period</h2>
            <p className={styles.panelText}>By cause, from the last {MOVEMENT_LIMIT} stock movements. Cost is estimated from unit cost.</p>
            {movements === null ? (
              <p className={styles.state}>Loading...</p>
            ) : wasteSummary.length === 0 ? (
              <p className={styles.state}>No waste logged yet.</p>
            ) : (
              <div className={styles.wasteGrid}>
                {wasteSummary.map((row) => (
                  <div key={row.cause} className={styles.wasteCard}>
                    <span className={styles.wasteCause}>{wasteCauseLabels[row.cause]}</span>
                    <span className={styles.wasteCount}>{row.count}</span>
                    <span className={styles.wasteCost}>{row.cost > 0 ? formatPeso(row.cost) : 'Cost unknown'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.toolbar}>
            <label className={styles.search}>
              <Icon src={searchIcon} size={18} />
              <span className={styles.srOnly}>Search movements</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search item, note or who did it"
              />
            </label>

            <div className={styles.segmented} role="group" aria-label="Type">
              <button
                type="button"
                className={typeFilter === 'all' ? styles.segmentActive : ''}
                aria-pressed={typeFilter === 'all'}
                onClick={() => setTypeFilter('all')}
              >
                All
              </button>
              {movementTypeOrder.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={typeFilter === type ? styles.segmentActive : ''}
                  aria-pressed={typeFilter === type}
                  onClick={() => setTypeFilter(type)}
                >
                  {movementLabels[type]}
                </button>
              ))}
            </div>
          </div>

          <DataTable
            rows={shownMovements}
            columns={columns}
            getRowId={(row) => row.id}
            searchTerm={search}
            pageSize={10}
            emptyMessage={movements === null ? 'Loading...' : 'No stock movements yet.'}
          />
        </>
      )}
    </section>
  );
}

export default InventoryReportsPage;
