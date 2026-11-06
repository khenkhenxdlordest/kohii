import { useEffect, useState } from 'react';
import { useRealtime } from '../../../hooks/useRealtime';
import styles from './StockInPage.module.css';

import Icon from '../../../components/ui/Icon/Icon';
import DataTable, { type DataTableAction, type DataTableColumn } from '../../../components/ui/DataTable/DataTable';
import StockActionModal from '../../../components/modal/clerk/StoreInventoryPage/StockActionModal/StockActionModal';
import { getInventoryItems, getMovements } from '../../../api/inventory.api';
import type { InventoryItem, StockMovement } from '../../../types';
import { describePacks, formatQty } from '../../../utils/inventory';
import { formatDateTime, formatPeso } from '../../../utils/format';

import searchIcon from '../../../assets/icons/actions/search.svg';
import stockInIcon from '../../../assets/icons/sidebar/stock-in.svg';

function StockInPage() {
  const { socket } = useRealtime();
  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [recent, setRecent] = useState<StockMovement[]>([]);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');
  const [actionItem, setActionItem] = useState<InventoryItem | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let ignore = false;
    getInventoryItems()
      .then((list) => {
        if (!ignore) setItems(list);
      })
      .catch((err: Error) => {
        if (!ignore) setLoadError(err.message);
      });
    getMovements({ type: 'STOCK_IN', limit: 10 })
      .then((list) => {
        if (!ignore) setRecent(list);
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

  const columns: DataTableColumn<InventoryItem>[] = [
    {
      key: 'name',
      header: 'Item',
      searchValue: (i) => i.name,
      sortValue: (i) => i.name,
      render: (i, highlight) => (
        <>
          <span className={styles.name}>{highlight(i.name)}</span>
          {i.packs.length > 0 && <span className={styles.packs}>{describePacks(i)}</span>}
        </>
      ),
    },
    {
      key: 'onHand',
      header: 'On hand',
      width: 160,
      align: 'right',
      sortValue: (i) => i.stockQty,
      render: (i) => <span className={styles.qty}>{formatQty(i.stockQty, i.unit)}</span>,
    },
  ];

  const actions: DataTableAction<InventoryItem>[] = [
    { id: 'in', label: 'Stock in', icon: stockInIcon, tone: 'success', onClick: (i) => setActionItem(i) },
  ];

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Stock In</h1>
          <p className={styles.subtitle}>Record newly received stock.</p>
        </div>
      </header>

      {loadError ? (
        <p className={styles.state}>{loadError}</p>
      ) : items === null ? (
        <p className={styles.state}>Loading inventory...</p>
      ) : (
        <>
          <label className={styles.search}>
            <Icon src={searchIcon} size={18} />
            <span className={styles.srOnly}>Search items</span>
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items" />
          </label>

          {notice && (
            <p className={styles.notice} role="status">
              {notice}
            </p>
          )}

          <DataTable
            rows={items}
            columns={columns}
            actions={actions}
            getRowId={(i) => i.id}
            searchTerm={search}
            pageSize={8}
            emptyMessage="No items yet."
          />
        </>
      )}

      <div className={styles.recentPanel}>
        <h2 className={styles.recentTitle}>Recently stocked in</h2>
        {recent.length === 0 ? (
          <p className={styles.recentEmpty}>No deliveries recorded yet.</p>
        ) : (
          <ul className={styles.recentList}>
            {recent.map((m) => (
              <li key={m.id} className={styles.recentRow}>
                <span className={styles.recentName}>{m.item.name}</span>
                <span className={styles.recentQty}>+{formatQty(m.qty, m.item.unit)}</span>
                <span className={styles.recentMeta}>
                  {formatDateTime(m.createdAt)} · {m.user}
                  {m.supplier && ` · ${m.supplier}`}
                  {m.totalCost !== null && ` · ${formatPeso(m.totalCost)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {actionItem && (
        <StockActionModal
          item={actionItem}
          action="in"
          onClose={() => setActionItem(null)}
          onDone={(saved) => {
            setItems((current) => (current ?? []).map((i) => (i.id === saved.id ? saved : i)));
            setNotice(`${saved.name} stocked in.`);
            setActionItem(null);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </section>
  );
}

export default StockInPage;
