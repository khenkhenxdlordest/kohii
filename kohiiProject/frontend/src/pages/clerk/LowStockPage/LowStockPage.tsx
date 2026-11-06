import { useEffect, useState } from 'react';
import { useRealtime } from '../../../hooks/useRealtime';
import styles from './LowStockPage.module.css';

import DataTable, { type DataTableAction, type DataTableColumn } from '../../../components/ui/DataTable/DataTable';
import StatCard from '../../../components/ui/StatCard/StatCard';
import StockActionModal from '../../../components/modal/clerk/StoreInventoryPage/StockActionModal/StockActionModal';
import { getLowStockItems } from '../../../api/inventory.api';
import type { InventoryItem, StockStatus } from '../../../types';
import { formatQty, itemTypeLabels } from '../../../utils/inventory';

import stockInIcon from '../../../assets/icons/sidebar/stock-in.svg';

const statusLabels: Record<StockStatus, string> = { OK: 'In stock', LOW: 'Low', OUT: 'Out' };
const statusRank: Record<StockStatus, number> = { OUT: 0, LOW: 1, OK: 2 };

function LowStockPage() {
  const { socket } = useRealtime();
  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [actionItem, setActionItem] = useState<InventoryItem | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let ignore = false;
    getLowStockItems()
      .then((list) => {
        if (!ignore) setItems(list);
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
    socket.on('stock:low', refresh);
    return () => {
      socket.off('stock:updated', refresh);
      socket.off('stock:low', refresh);
    };
  }, [socket]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const list = items ?? [];
  const lowCount = list.filter((i) => i.stockStatus === 'LOW').length;
  const outCount = list.filter((i) => i.stockStatus === 'OUT').length;

  const columns: DataTableColumn<InventoryItem>[] = [
    { key: 'name', header: 'Item', searchValue: (i) => i.name, sortValue: (i) => i.name, render: (i, h) => h(i.name) },
    { key: 'type', header: 'Category', width: 140, sortValue: (i) => itemTypeLabels[i.type], render: (i) => itemTypeLabels[i.type] },
    {
      key: 'onHand',
      header: 'On hand',
      width: 140,
      align: 'right',
      sortValue: (i) => i.stockQty,
      render: (i) => <span className={styles.qty}>{formatQty(i.stockQty, i.unit)}</span>,
    },
    {
      key: 'low',
      header: 'Low at',
      width: 120,
      align: 'right',
      sortValue: (i) => i.lowStockThreshold,
      render: (i) => <span className={styles.lowAt}>{formatQty(i.lowStockThreshold, i.unit)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: 110,
      sortValue: (i) => statusRank[i.stockStatus],
      render: (i) => (
        <span className={`${styles.status} ${styles[i.stockStatus]}`}>
          <span className={styles.statusDot} />
          {statusLabels[i.stockStatus]}
        </span>
      ),
    },
  ];

  const actions: DataTableAction<InventoryItem>[] = [
    { id: 'in', label: 'Stock in', icon: stockInIcon, tone: 'success', onClick: (i) => setActionItem(i) },
  ];

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Low Stock</h1>
          <p className={styles.subtitle}>Ingredients that need restocking.</p>
        </div>
      </header>

      <div className={styles.cards}>
        <StatCard variant="lowStock" title="Low stock" value={lowCount} caption="Order soon" />
        <StatCard variant="outOfStock" title="Out of stock" value={outCount} caption="Restock now" />
      </div>

      {loadError ? (
        <p className={styles.state}>{loadError}</p>
      ) : items === null ? (
        <p className={styles.state}>Loading...</p>
      ) : (
        <>
          {notice && (
            <p className={styles.notice} role="status">
              {notice}
            </p>
          )}
          <DataTable
            rows={list}
            columns={columns}
            actions={actions}
            getRowId={(i) => i.id}
            pageSize={10}
            emptyMessage="All stocked up — nothing is low or out right now."
          />
        </>
      )}

      {actionItem && (
        <StockActionModal
          item={actionItem}
          action="in"
          onClose={() => setActionItem(null)}
          onDone={() => {
            setNotice(`${actionItem.name} stocked in.`);
            setActionItem(null);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </section>
  );
}

export default LowStockPage;
