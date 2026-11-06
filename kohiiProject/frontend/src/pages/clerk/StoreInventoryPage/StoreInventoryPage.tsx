import { useEffect, useMemo, useState } from 'react';
import { useRealtime } from '../../../hooks/useRealtime';
import styles from './StoreInventoryPage.module.css';

import Icon from '../../../components/ui/Icon/Icon';
import DataTable, { type DataTableAction, type DataTableColumn } from '../../../components/ui/DataTable/DataTable';
import StatCard from '../../../components/ui/StatCard/StatCard';
import StockActionModal, {
  type StockAction,
} from '../../../components/modal/clerk/StoreInventoryPage/StockActionModal/StockActionModal';
import ItemHistoryModal from '../../../components/modal/clerk/StoreInventoryPage/ItemHistoryModal/ItemHistoryModal';
import ItemFormModal from '../../../components/modal/shared/ItemFormModal/ItemFormModal';
import { getInventoryItems, getMovements } from '../../../api/inventory.api';
import type { InventoryItem, InventoryItemType, StockStatus } from '../../../types';
import { describePacks, formatQty, itemTypeLabels, itemTypeOrder, packEquivalent } from '../../../utils/inventory';
import { dateOf } from '../../../utils/salesAggregation';

import editIcon from '../../../assets/icons/actions/edit.svg';
import historyIcon from '../../../assets/icons/actions/history.svg';
import searchIcon from '../../../assets/icons/actions/search.svg';
import stockInIcon from '../../../assets/icons/sidebar/stock-in.svg';
import withdrawIcon from '../../../assets/icons/sidebar/stock-movements.svg';
import wasteIcon from '../../../assets/icons/cards/out-of-stock.svg';

type StockFilter = 'all' | 'attention';

const statusLabels: Record<StockStatus, string> = { OK: 'In stock', LOW: 'Low', OUT: 'Out' };
const statusRank: Record<StockStatus, number> = { OUT: 0, LOW: 1, OK: 2 };

function StoreInventoryPage() {
  const { socket } = useRealtime();
  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [stockInToday, setStockInToday] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [activeType, setActiveType] = useState<InventoryItemType>('RAW_MATERIAL');
  const [filter, setFilter] = useState<StockFilter>('all');
  const [search, setSearch] = useState('');

  const [action, setAction] = useState<{ item: InventoryItem; action: StockAction } | null>(null);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let ignore = false;
    getInventoryItems()
      .then((itemList) => {
        if (!ignore) setItems(itemList);
      })
      .catch((err: Error) => {
        if (!ignore) setLoadError(err.message);
      });
    getMovements({ type: 'STOCK_IN', limit: 200 })
      .then((movements) => {
        if (ignore) return;
        const today = dateOf(new Date().toISOString());
        setStockInToday(movements.filter((m) => dateOf(m.createdAt) === today).length);
      })
      .catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!socket) return;
    // Centralized ang inventory: i-refresh kapag may stock update sa ibang device
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

  const list = useMemo(() => items ?? [], [items]);
  const lowCount = list.filter((i) => i.stockStatus === 'LOW').length;
  const outCount = list.filter((i) => i.stockStatus === 'OUT').length;
  const attentionIn = (type: InventoryItemType) => list.filter((i) => i.type === type && i.stockStatus !== 'OK').length;

  const rows = useMemo(
    () => list.filter((i) => i.type === activeType && (filter !== 'attention' || i.stockStatus !== 'OK')),
    [list, activeType, filter],
  );

  const replaceItem = (saved: InventoryItem) => {
    setItems((current) => (current ?? []).map((i) => (i.id === saved.id ? saved : i)));
  };

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
      width: 170,
      align: 'right',
      sortValue: (i) => i.stockQty,
      render: (i) => (
        <span className={styles.onHand}>
          <span className={styles.qty}>{formatQty(i.stockQty, i.unit)}</span>
          {packEquivalent(i) && <span className={styles.equivalent}>{packEquivalent(i)}</span>}
        </span>
      ),
    },
    {
      key: 'low',
      header: 'Low at',
      width: 110,
      align: 'right',
      sortValue: (i) => i.lowStockThreshold,
      render: (i) => <span className={styles.lowAt}>{formatQty(i.lowStockThreshold, i.unit)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: 120,
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
    { id: 'in', label: 'Stock in', icon: stockInIcon, tone: 'success', onClick: (i) => setAction({ item: i, action: 'in' }) },
    { id: 'withdraw', label: 'Withdraw', icon: withdrawIcon, onClick: (i) => setAction({ item: i, action: 'withdraw' }) },
    { id: 'waste', label: 'Log waste', icon: wasteIcon, tone: 'danger', onClick: (i) => setAction({ item: i, action: 'waste' }) },
    { id: 'edit', label: 'Edit', icon: editIcon, onClick: (i) => setEditItem(i) },
    { id: 'history', label: 'History', icon: historyIcon, onClick: (i) => setHistoryItem(i) },
  ];

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Store Inventory</h1>
          <p className={styles.subtitle}>Current stock of every ingredient.</p>
        </div>
      </header>

      <div className={styles.cards}>
        <StatCard variant="products" title="Items" value={list.length} caption="Being tracked" />
        <StatCard variant="lowStock" title="Low stock" value={lowCount} caption="Order soon" />
        <StatCard variant="outOfStock" title="Out of stock" value={outCount} caption="Restock now" />
        <StatCard variant="stockIn" title="Stock in today" value={stockInToday} caption="Deliveries recorded" />
      </div>

      {loadError ? (
        <p className={styles.state}>{loadError}</p>
      ) : items === null ? (
        <p className={styles.state}>Loading inventory...</p>
      ) : (
        <>
          <div className={styles.typeTabs} role="tablist" aria-label="Inventory type">
            {itemTypeOrder.map((type) => {
              const attention = attentionIn(type);
              return (
                <button
                  key={type}
                  type="button"
                  role="tab"
                  aria-selected={activeType === type}
                  className={`${styles.typeTab} ${activeType === type ? styles.typeTabActive : ''}`}
                  onClick={() => setActiveType(type)}
                >
                  {itemTypeLabels[type]}
                  <span className={styles.tabCount}>{list.filter((i) => i.type === type).length}</span>
                  {attention > 0 && (
                    <span className={styles.tabAlert} title={`${attention} low or out of stock`}>
                      {attention}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className={styles.toolbar}>
            <label className={styles.search}>
              <Icon src={searchIcon} size={18} />
              <span className={styles.srOnly}>Search items</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${itemTypeLabels[activeType].toLowerCase()}`}
              />
            </label>

            <div className={styles.segmented} role="group" aria-label="Show">
              {(['all', 'attention'] as StockFilter[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={filter === value ? styles.segmentActive : ''}
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {value === 'all' ? 'All' : 'Low and out'}
                </button>
              ))}
            </div>
          </div>

          {notice && (
            <p className={styles.notice} role="status">
              {notice}
            </p>
          )}

          <DataTable
            key={activeType}
            rows={rows}
            columns={columns}
            actions={actions}
            getRowId={(i) => i.id}
            searchTerm={search}
            emptyMessage={filter === 'attention' ? 'Nothing is low or out of stock here.' : 'No items here yet.'}
          />
        </>
      )}

      {action && (
        <StockActionModal
          item={action.item}
          action={action.action}
          onClose={() => setAction(null)}
          onDone={(saved) => {
            replaceItem(saved);
            setNotice(`${saved.name} updated.`);
            setAction(null);
          }}
        />
      )}

      {historyItem && <ItemHistoryModal item={historyItem} onClose={() => setHistoryItem(null)} />}

      {editItem && (
        <ItemFormModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSaved={(saved) => {
            replaceItem(saved);
            setNotice(`${saved.name} updated.`);
            setEditItem(null);
          }}
        />
      )}
    </section>
  );
}

export default StoreInventoryPage;
