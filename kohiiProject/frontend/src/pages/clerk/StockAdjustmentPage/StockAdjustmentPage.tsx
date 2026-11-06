import { useEffect, useMemo, useState } from 'react';
import { useRealtime } from '../../../hooks/useRealtime';
import styles from './StockAdjustmentPage.module.css';

import Button from '../../../components/ui/Button/Button';
import DataTable, { type DataTableAction, type DataTableColumn } from '../../../components/ui/DataTable/DataTable';
import StockActionModal from '../../../components/modal/clerk/StoreInventoryPage/StockActionModal/StockActionModal';
import { getInventoryItems, getMovements } from '../../../api/inventory.api';
import type { InventoryItem, StockMovement } from '../../../types';
import { formatDateTime } from '../../../utils/format';
import { formatQty, wasteCauseLabels } from '../../../utils/inventory';

import wasteIcon from '../../../assets/icons/cards/out-of-stock.svg';

type Tab = 'waste' | 'count';

interface DraftRow {
  item: InventoryItem;
  countedQty: string;
}

function StockAdjustmentPage() {
  const { socket } = useRealtime();
  const [tab, setTab] = useState<Tab>('waste');

  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [recentWaste, setRecentWaste] = useState<StockMovement[]>([]);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [actionItem, setActionItem] = useState<InventoryItem | null>(null);
  const [notice, setNotice] = useState('');

  const [draft, setDraft] = useState<DraftRow[] | null>(null);
  const [countNotice, setCountNotice] = useState('');

  useEffect(() => {
    let ignore = false;
    getInventoryItems()
      .then((list) => {
        if (!ignore) setItems(list);
      })
      .catch((err: Error) => {
        if (!ignore) setLoadError(err.message);
      });
    getMovements({ type: 'WASTE', limit: 10 })
      .then((list) => {
        if (!ignore) setRecentWaste(list);
      })
      .catch(() => undefined);
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

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!countNotice) return;
    const timer = setTimeout(() => setCountNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [countNotice]);

  const wasteColumns: DataTableColumn<InventoryItem>[] = [
    { key: 'name', header: 'Item', searchValue: (i) => i.name, sortValue: (i) => i.name, render: (i, h) => h(i.name) },
    {
      key: 'onHand',
      header: 'On hand',
      width: 160,
      align: 'right',
      sortValue: (i) => i.stockQty,
      render: (i) => <span className={styles.qty}>{formatQty(i.stockQty, i.unit)}</span>,
    },
  ];

  const wasteActions: DataTableAction<InventoryItem>[] = [
    { id: 'waste', label: 'Log waste', icon: wasteIcon, tone: 'danger', onClick: (i) => setActionItem(i) },
  ];

  const startCount = () => {
    setDraft((items ?? []).map((item) => ({ item, countedQty: String(item.stockQty) })));
  };

  const updateCounted = (itemId: number, value: string) => {
    setDraft((current) => (current ?? []).map((row) => (row.item.id === itemId ? { ...row, countedQty: value } : row)));
  };

  const finalizeCount = () => {
    setDraft(null);
    setCountNotice('Count saved as draft locally. Backend for finalizing audits is not built yet.');
  };

  const countColumns: DataTableColumn<DraftRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Item',
        searchValue: (r) => r.item.name,
        sortValue: (r) => r.item.name,
        render: (r, h) => h(r.item.name),
      },
      {
        key: 'system',
        header: 'System qty',
        width: 140,
        align: 'right',
        sortValue: (r) => r.item.stockQty,
        render: (r) => <span className={styles.qty}>{formatQty(r.item.stockQty, r.item.unit)}</span>,
      },
      {
        key: 'counted',
        header: 'Counted qty',
        width: 160,
        align: 'right',
        render: (r) => (
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            className={styles.countInput}
            value={r.countedQty}
            onChange={(e) => updateCounted(r.item.id, e.target.value)}
          />
        ),
      },
      {
        key: 'variance',
        header: 'Variance',
        width: 140,
        align: 'right',
        sortValue: (r) => (Number(r.countedQty) || 0) - r.item.stockQty,
        render: (r) => {
          const variance = (Number(r.countedQty) || 0) - r.item.stockQty;
          const cls = variance === 0 ? styles.varianceNone : variance > 0 ? styles.variancePos : styles.varianceNeg;
          return (
            <span className={cls}>
              {variance > 0 ? '+' : ''}
              {formatQty(variance, r.item.unit)}
            </span>
          );
        },
      },
    ],
    [],
  );

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Stock Adjustment</h1>
          <p className={styles.subtitle}>Record waste, spoilage and stock counts.</p>
        </div>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Adjustment type">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'waste'}
          className={`${styles.tab} ${tab === 'waste' ? styles.tabActive : ''}`}
          onClick={() => setTab('waste')}
        >
          Waste &amp; Spoilage
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'count'}
          className={`${styles.tab} ${tab === 'count' ? styles.tabActive : ''}`}
          onClick={() => setTab('count')}
        >
          Stock Count
        </button>
      </div>

      {tab === 'waste' ? (
        loadError ? (
          <p className={styles.state}>{loadError}</p>
        ) : items === null ? (
          <p className={styles.state}>Loading inventory...</p>
        ) : (
          <>
            {notice && (
              <p className={styles.notice} role="status">
                {notice}
              </p>
            )}
            <DataTable
              rows={items}
              columns={wasteColumns}
              actions={wasteActions}
              getRowId={(i) => i.id}
              pageSize={8}
              emptyMessage="No items yet."
            />

            <div className={styles.recentPanel}>
              <h2 className={styles.recentTitle}>Recent waste</h2>
              {recentWaste.length === 0 ? (
                <p className={styles.recentEmpty}>No waste logged yet.</p>
              ) : (
                <ul className={styles.recentList}>
                  {recentWaste.map((m) => (
                    <li key={m.id} className={styles.recentRow}>
                      <span className={styles.recentName}>{m.item.name}</span>
                      <span className={styles.recentQty}>−{formatQty(Math.abs(m.qty), m.item.unit)}</span>
                      <span className={styles.recentMeta}>
                        {formatDateTime(m.createdAt)} · {m.user}
                        {m.wasteCause && ` · ${wasteCauseLabels[m.wasteCause]}`}
                        {m.note && ` · ${m.note}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )
      ) : (
        <>
          <p className={styles.draftBadge}>Draft mode — hindi pa naka-connect sa backend. Local lang muna ito.</p>

          {countNotice && (
            <p className={styles.notice} role="status">
              {countNotice}
            </p>
          )}

          {draft === null ? (
            <div className={styles.state}>
              <p>Start a new physical count of all tracked items.</p>
              <Button onClick={startCount} disabled={items === null}>
                Start count
              </Button>
            </div>
          ) : (
            <>
              <DataTable rows={draft} columns={countColumns} getRowId={(r) => r.item.id} pageSize={10} emptyMessage="No items." />
              <div className={styles.countActions}>
                <Button variant="secondary" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
                <Button onClick={finalizeCount}>Finalize count</Button>
              </div>
            </>
          )}
        </>
      )}

      {actionItem && (
        <StockActionModal
          item={actionItem}
          action="waste"
          onClose={() => setActionItem(null)}
          onDone={(saved) => {
            setItems((current) => (current ?? []).map((i) => (i.id === saved.id ? saved : i)));
            setNotice(`${saved.name} waste logged.`);
            setActionItem(null);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </section>
  );
}

export default StockAdjustmentPage;
