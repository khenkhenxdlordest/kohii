import { useEffect, useMemo, useState } from 'react';
import styles from './InventoryOverviewPage.module.css';

import Button from '../../../components/ui/Button/Button';
import Icon from '../../../components/ui/Icon/Icon';
import StatCard from '../../../components/ui/StatCard/StatCard';
import DataTable, { type DataTableAction, type DataTableColumn } from '../../../components/ui/DataTable/DataTable';
import ItemFormModal from '../../../components/modal/admin/InventoryOverviewPage/ItemFormModal/ItemFormModal';
import StockActionModal, {
  type StockAction,
} from '../../../components/modal/admin/InventoryOverviewPage/StockActionModal/StockActionModal';
import ItemHistoryModal from '../../../components/modal/admin/InventoryOverviewPage/ItemHistoryModal/ItemHistoryModal';
import { getEmergencySummary, getInventoryItems, updateInventoryItem } from '../../../api/inventory.api';
import type { EmergencySummary, InventoryItem, InventoryItemType, StockStatus } from '../../../types';
import { formatPeso } from '../../../utils/format';
import { describePacks, formatQty, itemTypeLabels, itemTypeOrder, packEquivalent } from '../../../utils/inventory';

import plusIcon from '../../../assets/icons/actions/plus.svg';
import editIcon from '../../../assets/icons/actions/edit.svg';
import historyIcon from '../../../assets/icons/actions/history.svg';
import powerIcon from '../../../assets/icons/actions/power.svg';
import searchIcon from '../../../assets/icons/actions/search.svg';
import stockInIcon from '../../../assets/icons/sidebar/stock-in.svg';
import withdrawIcon from '../../../assets/icons/sidebar/stock-movements.svg';
import wasteIcon from '../../../assets/icons/cards/out-of-stock.svg';

type StockFilter = 'all' | 'attention' | 'inactive';

// undefined = sarado; null = bagong item; InventoryItem = edit
type FormState = InventoryItem | null | undefined;

const statusLabels: Record<StockStatus, string> = { OK: 'In stock', LOW: 'Low', OUT: 'Out' };
const statusRank: Record<StockStatus, number> = { OUT: 0, LOW: 1, OK: 2 };

function InventoryOverviewPage() {
  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [emergency, setEmergency] = useState<EmergencySummary | null>(null);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [activeType, setActiveType] = useState<InventoryItemType>('RAW_MATERIAL');
  const [filter, setFilter] = useState<StockFilter>('all');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState<FormState>(undefined);
  const [action, setAction] = useState<{ item: InventoryItem; action: StockAction } | null>(null);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let ignore = false;
    Promise.all([getInventoryItems(true), getEmergencySummary()])
      .then(([itemList, summary]) => {
        if (ignore) return;
        setItems(itemList);
        setEmergency(summary);
      })
      .catch((err: Error) => {
        if (!ignore) setLoadError(err.message);
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const list = useMemo(() => items ?? [], [items]);
  const active = list.filter((i) => i.isActive);
  const lowCount = active.filter((i) => i.stockStatus === 'LOW').length;
  const outCount = active.filter((i) => i.stockStatus === 'OUT').length;
  const attentionIn = (type: InventoryItemType) =>
    active.filter((i) => i.type === type && i.stockStatus !== 'OK').length;

  const rows = useMemo(
    () =>
      list.filter(
        (i) =>
          i.type === activeType &&
          (filter === 'inactive' ? !i.isActive : i.isActive) &&
          (filter !== 'attention' || i.stockStatus !== 'OK'),
      ),
    [list, activeType, filter],
  );

  const replaceItem = (saved: InventoryItem) => {
    setItems((current) => {
      const next = current ?? [];
      return next.some((i) => i.id === saved.id) ? next.map((i) => (i.id === saved.id ? saved : i)) : [...next, saved];
    });
  };

  const setActive = async (item: InventoryItem, isActive: boolean) => {
    setActionError('');
    setBusyId(item.id);
    try {
      replaceItem(await updateInventoryItem(item.id, { isActive }));
      setNotice(`${item.name} ${isActive ? 'activated' : 'deactivated'}.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update the item.');
    } finally {
      setBusyId(null);
    }
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
    {
      id: 'in',
      label: 'Stock in',
      icon: stockInIcon,
      tone: 'success',
      hidden: (i) => !i.isActive,
      onClick: (i) => setAction({ item: i, action: 'in' }),
    },
    {
      id: 'withdraw',
      label: 'Withdraw',
      icon: withdrawIcon,
      hidden: (i) => !i.isActive,
      onClick: (i) => setAction({ item: i, action: 'withdraw' }),
    },
    {
      id: 'waste',
      label: 'Log waste',
      icon: wasteIcon,
      tone: 'danger',
      hidden: (i) => !i.isActive,
      onClick: (i) => setAction({ item: i, action: 'waste' }),
    },
    { id: 'history', label: 'History', icon: historyIcon, onClick: (i) => setHistoryItem(i) },
    { id: 'edit', label: 'Edit', icon: editIcon, onClick: (i) => setForm(i) },
    {
      id: 'deactivate',
      label: 'Deactivate',
      icon: powerIcon,
      tone: 'danger',
      hidden: (i) => !i.isActive,
      onClick: (i) => setActive(i, false),
    },
    {
      id: 'activate',
      label: 'Activate',
      icon: powerIcon,
      tone: 'success',
      hidden: (i) => i.isActive,
      onClick: (i) => setActive(i, true),
    },
  ];

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Inventory</h1>
        </div>
        <Button icon={plusIcon} onClick={() => setForm(null)} disabled={items === null}>
          Add item
        </Button>
      </header>

      <div className={styles.cards}>
        <StatCard variant="products" title="Items" value={active.length} caption="Being tracked" />
        <StatCard variant="lowStock" title="Low stock" value={lowCount} caption="Order soon" />
        <StatCard variant="outOfStock" title="Out of stock" value={outCount} caption="Restock now" />
        <StatCard
          variant="sales"
          title="Emergency purchases"
          value={emergency ? formatPeso(emergency.totalCost) : '...'}
          caption={emergency ? `${emergency.count} this month` : 'This month'}
        />
      </div>

      {loadError ? (
        <div className={styles.state}>
          <p>{loadError}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setLoadError('');
              setItems(null);
              setReloadKey((k) => k + 1);
            }}
          >
            Try again
          </Button>
        </div>
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
                  <span className={styles.tabCount}>{active.filter((i) => i.type === type).length}</span>
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
              {(['all', 'attention', 'inactive'] as StockFilter[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={filter === value ? styles.segmentActive : ''}
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {value === 'all' ? 'All' : value === 'attention' ? 'Low and out' : 'Inactive'}
                </button>
              ))}
            </div>
          </div>

          {actionError && (
            <p className={styles.alert} role="alert">
              {actionError}
            </p>
          )}
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
            isRowMuted={(i) => !i.isActive}
            busyRowId={busyId}
            emptyMessage={filter === 'attention' ? 'Nothing is low or out of stock here.' : 'No items here yet.'}
          />
        </>
      )}

      {form !== undefined && (
        <ItemFormModal
          item={form}
          defaultType={activeType}
          onClose={() => setForm(undefined)}
          onSaved={(saved) => {
            replaceItem(saved);
            setActiveType(saved.type);
            setNotice(`${saved.name} saved.`);
            setForm(undefined);
          }}
        />
      )}

      {action && (
        <StockActionModal
          item={action.item}
          action={action.action}
          onClose={() => setAction(null)}
          onDone={(saved) => {
            replaceItem(saved);
            // Para makita agad sa card ang bagong emergency purchase
            if (action.action === 'in')
              getEmergencySummary()
                .then(setEmergency)
                .catch(() => undefined);
            setNotice(`${saved.name} updated.`);
            setAction(null);
          }}
        />
      )}

      {historyItem && <ItemHistoryModal item={historyItem} onClose={() => setHistoryItem(null)} />}
    </section>
  );
}

export default InventoryOverviewPage;
