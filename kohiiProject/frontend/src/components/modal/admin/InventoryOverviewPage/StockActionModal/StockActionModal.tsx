import { useState, type FormEvent } from 'react';
import Modal from '../../../Modal/Modal';
import Button from '../../../../ui/Button/Button';
import styles from './StockActionModal.module.css';

import { logWaste, stockIn, withdrawStock, type QuantityInput } from '../../../../../api/inventory.api';
import type { InventoryItem, StockInSource, WasteCause } from '../../../../../types';
import { formatQty, wasteCauseLabels } from '../../../../../utils/inventory';

import stockInIcon from '../../../../../assets/icons/sidebar/stock-in.svg';
import withdrawIcon from '../../../../../assets/icons/sidebar/stock-movements.svg';
import wasteIcon from '../../../../../assets/icons/cards/out-of-stock.svg';

export type StockAction = 'in' | 'withdraw' | 'waste';

interface StockActionModalProps {
  item: InventoryItem;
  action: StockAction;
  onClose: () => void;
  onDone: (item: InventoryItem) => void;
}

const titles: Record<StockAction, string> = { in: 'Stock in', withdraw: 'Withdraw', waste: 'Log waste' };
const icons: Record<StockAction, string> = { in: stockInIcon, withdraw: withdrawIcon, waste: wasteIcon };
const causes: WasteCause[] = ['SPOILED', 'EXPIRED', 'SPILLED', 'DAMAGED', 'OTHER'];

// "exact" = eksaktong dami sa unit; ang iba ay id ng lalagyan
type Mode = number | 'exact';

// Ginagamit lang sa InventoryOverviewPage: dagdag (stock in) at bawas (withdraw, waste) ng stock
function StockActionModal({ item, action, onClose, onDone }: StockActionModalProps) {
  const defaultPack = item.packs.find((p) => p.isDefault) ?? item.packs[0];
  const [mode, setMode] = useState<Mode>(defaultPack?.id ?? 'exact');
  const [count, setCount] = useState('1');
  const [exact, setExact] = useState('');
  const [source, setSource] = useState<StockInSource>('SUPPLIER');
  const [supplier, setSupplier] = useState('');
  const [amount, setAmount] = useState('');
  const [cause, setCause] = useState<WasteCause>('SPOILED');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const pack = mode === 'exact' ? null : item.packs.find((p) => p.id === mode);
  const qty = pack ? (Number(count) || 0) * pack.size : Number(exact) || 0;
  const isAdd = action === 'in';
  const after = isAdd ? item.stockQty + qty : item.stockQty - qty;
  const notEnough = !isAdd && qty > item.stockQty;

  const chooseSource = (next: StockInSource) => {
    setSource(next);
    // Karaniwang sa sari-sari store bumibili kapag emergency (hal. naubusan ng oil)
    if (next === 'EMERGENCY' && !supplier) setSupplier('Sari-sari store');
    if (next === 'SUPPLIER' && supplier === 'Sari-sari store') setSupplier('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (qty <= 0) {
      setError('Enter a quantity greater than 0.');
      return;
    }
    setSaving(true);
    const quantity: QuantityInput = pack
      ? { packId: pack.id, packCount: Number(count), note: note.trim() || undefined }
      : { qty, note: note.trim() || undefined };
    try {
      const result =
        action === 'in'
          ? await stockIn(item.id, {
              ...quantity,
              source,
              supplier: supplier.trim() || undefined,
              totalCost: amount.trim() ? Number(amount) : undefined,
            })
          : action === 'withdraw'
            ? await withdrawStock(item.id, quantity)
            : await logWaste(item.id, { ...quantity, cause });
      onDone(result.item);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the stock.');
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      icon={icons[action]}
      title={`${titles[action]}: ${item.name}`}
      description={`On hand: ${formatQty(item.stockQty, item.unit)}`}
      onClose={onClose}
      width={520}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="stock-action-form"
            variant={action === 'waste' ? 'dangerSolid' : 'primary'}
            loading={saving}
            disabled={notEnough}
          >
            {titles[action]}
          </Button>
        </>
      }
    >
      <form id="stock-action-form" className={styles.form} onSubmit={handleSubmit}>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        {isAdd && (
          <div className={styles.segmented} role="radiogroup" aria-label="Source">
            {(['SUPPLIER', 'EMERGENCY'] as StockInSource[]).map((value) => (
              <label key={value} className={`${styles.segment} ${source === value ? styles.segmentActive : ''}`}>
                <input
                  type="radio"
                  name="stock-source"
                  checked={source === value}
                  onChange={() => chooseSource(value)}
                />
                {value === 'SUPPLIER' ? 'Supplier delivery' : 'Emergency purchase'}
              </label>
            ))}
          </div>
        )}

        {/* Lalagyan (hal. 2 bote) o eksaktong dami (hal. 500 ml) */}
        <div className={styles.field}>
          <span className={styles.label}>Quantity</span>
          <div className={styles.modes} role="radiogroup" aria-label="Quantity by">
            {item.packs.map((p) => (
              <label key={p.id} className={`${styles.mode} ${mode === p.id ? styles.modeActive : ''}`}>
                <input type="radio" name="qty-mode" checked={mode === p.id} onChange={() => setMode(p.id)} />
                {p.label} <span className={styles.modeSize}>{formatQty(p.size, item.unit)}</span>
              </label>
            ))}
            <label className={`${styles.mode} ${mode === 'exact' ? styles.modeActive : ''}`}>
              <input type="radio" name="qty-mode" checked={mode === 'exact'} onChange={() => setMode('exact')} />
              Exact amount
            </label>
          </div>

          <div className={styles.qtyRow}>
            {pack ? (
              <>
                <input
                  className={styles.input}
                  type="number"
                  inputMode="decimal"
                  min="0.001"
                  step="any"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  aria-label={`How many ${pack.label.toLowerCase()}s`}
                  autoFocus
                  required
                />
                <span className={styles.unitText}>× {pack.label.toLowerCase()}</span>
              </>
            ) : (
              <>
                <input
                  className={styles.input}
                  type="number"
                  inputMode="decimal"
                  min="0.001"
                  step="any"
                  value={exact}
                  onChange={(e) => setExact(e.target.value)}
                  aria-label={`Amount in ${item.unit.toLowerCase()}`}
                  autoFocus
                  required
                />
                <span className={styles.unitText}>{item.unit === 'PCS' ? 'pcs' : item.unit.toLowerCase()}</span>
              </>
            )}
            <span className={`${styles.preview} ${notEnough ? styles.previewBad : ''}`}>
              {isAdd ? '+' : '−'}
              {formatQty(qty, item.unit)} → {notEnough ? 'not enough stock' : formatQty(after, item.unit)}
            </span>
          </div>
        </div>

        {isAdd && (
          <div className={styles.grid2}>
            <label className={styles.field}>
              <span className={styles.label}>
                {source === 'EMERGENCY' ? 'Bought from' : 'Supplier'} <span className={styles.optional}>optional</span>
              </span>
              <input
                className={styles.input}
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                maxLength={80}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>
                Amount paid (PHP) {source === 'SUPPLIER' && <span className={styles.optional}>optional</span>}
              </span>
              <input
                className={styles.input}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required={source === 'EMERGENCY'}
              />
            </label>
          </div>
        )}

        {action === 'waste' && (
          <div className={styles.field}>
            <span className={styles.label}>Reason</span>
            <div className={styles.modes} role="radiogroup" aria-label="Reason">
              {causes.map((value) => (
                <label key={value} className={`${styles.mode} ${cause === value ? styles.modeDanger : ''}`}>
                  <input type="radio" name="waste-cause" checked={cause === value} onChange={() => setCause(value)} />
                  {wasteCauseLabels[value]}
                </label>
              ))}
            </div>
          </div>
        )}

        <label className={styles.field}>
          <span className={styles.label}>
            Note <span className={styles.optional}>optional</span>
          </span>
          <input className={styles.input} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
        </label>
      </form>
    </Modal>
  );
}

export default StockActionModal;
