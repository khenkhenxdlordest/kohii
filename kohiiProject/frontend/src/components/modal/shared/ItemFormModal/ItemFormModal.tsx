import { useState, type FormEvent } from 'react';
import Modal from '../../../Modal/Modal';
import Button from '../../../../ui/Button/Button';
import Icon from '../../../../ui/Icon/Icon';
import styles from './ItemFormModal.module.css';

import { createInventoryItem, updateInventoryItem } from '../../../../../api/inventory.api';
import type { InventoryItem, InventoryItemType, InventoryUnit } from '../../../../../types';
import { itemTypeLabels, itemTypeOrder, unitLabels } from '../../../../../utils/inventory';

import plusIcon from '../../../../../assets/icons/actions/plus.svg';
import closeIcon from '../../../../../assets/icons/actions/close.svg';
import inventoryIcon from '../../../../../assets/icons/sidebar/inventory.svg';

interface ItemFormModalProps {
  /** null = bagong item; may laman = edit */
  item: InventoryItem | null;
  /** Para sa bagong item: ang tab na bukas */
  defaultType?: InventoryItemType;
  onClose: () => void;
  onSaved: (item: InventoryItem) => void;
}

interface PackRow {
  key: string;
  id?: number;
  label: string;
  size: string;
  isDefault: boolean;
}

const units: InventoryUnit[] = ['G', 'ML', 'PCS'];
let rowKey = 0;
const newRow = (label = '', size = '', isDefault = false): PackRow => ({
  key: `row-${(rowKey += 1)}`,
  label,
  size,
  isDefault,
});

// Ginagamit lang sa InventoryOverviewPage: add/edit ng item at ng mga lalagyan nito
function ItemFormModal({ item, defaultType, onClose, onSaved }: ItemFormModalProps) {
  const isEdit = item !== null;
  const [name, setName] = useState(item?.name ?? '');
  const [type, setType] = useState<InventoryItemType>(item?.type ?? defaultType ?? 'RAW_MATERIAL');
  const [unit, setUnit] = useState<InventoryUnit>(item?.unit ?? 'G');
  const [lowStock, setLowStock] = useState(item ? String(item.lowStockThreshold) : '');
  const [initialQty, setInitialQty] = useState('');
  const [packs, setPacks] = useState<PackRow[]>(() =>
    item?.packs.length
      ? item.packs.map((p) => ({ ...newRow(p.label, String(p.size), p.isDefault), id: p.id }))
      : [newRow('Pack', '', true)],
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const unitText = unit === 'PCS' ? 'pcs' : unit.toLowerCase();

  const updateRow = (key: string, patch: Partial<PackRow>) =>
    setPacks((rows) =>
      rows.map((row) =>
        row.key === key ? { ...row, ...patch } : patch.isDefault ? { ...row, isDefault: false } : row,
      ),
    );

  const removeRow = (key: string) =>
    setPacks((rows) => {
      const next = rows.filter((row) => row.key !== key);
      // Kapag tinanggal ang default, ang una ang magiging default
      if (next.length && !next.some((r) => r.isDefault)) next[0] = { ...next[0], isDefault: true };
      return next;
    });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanPacks = packs
      .filter((p) => p.label.trim() && Number(p.size) > 0)
      .map((p) => ({ id: p.id, label: p.label.trim(), size: Number(p.size), isDefault: p.isDefault }));
    setSaving(true);
    try {
      const saved = isEdit
        ? await updateInventoryItem(item.id, {
            name,
            type,
            lowStockThreshold: Number(lowStock) || 0,
            packs: cleanPacks,
          })
        : await createInventoryItem({
            name,
            type,
            unit,
            lowStockThreshold: Number(lowStock) || 0,
            packs: cleanPacks,
            initialQty: initialQty.trim() ? Number(initialQty) : undefined,
          });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the item.');
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      icon={inventoryIcon}
      title={isEdit ? 'Edit item' : 'New inventory item'}
      onClose={onClose}
      width={580}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="item-form" loading={saving}>
            {isEdit ? 'Save changes' : 'Add item'}
          </Button>
        </>
      }
    >
      <form id="item-form" className={styles.form} onSubmit={handleSubmit}>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <label className={styles.field}>
          <span className={styles.label}>Item name</span>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cooking Oil"
            maxLength={80}
            autoFocus
            required
          />
        </label>

        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>Where it is used</span>
            <select
              className={styles.input}
              value={type}
              onChange={(e) => setType(e.target.value as InventoryItemType)}
            >
              {itemTypeOrder.map((value) => (
                <option key={value} value={value}>
                  {itemTypeLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Counted in</span>
            <select
              className={styles.input}
              value={unit}
              onChange={(e) => setUnit(e.target.value as InventoryUnit)}
              disabled={isEdit}
              title={isEdit ? 'The unit cannot change once stock is recorded' : undefined}
            >
              {units.map((value) => (
                <option key={value} value={value}>
                  {unitLabels[value]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className={styles.section}>
          <legend className={styles.label}>Containers</legend>
          <ul className={styles.packList}>
            {packs.map((row) => (
              <li key={row.key} className={styles.packRow}>
                <input
                  className={styles.input}
                  value={row.label}
                  onChange={(e) => updateRow(row.key, { label: e.target.value })}
                  placeholder="Pack, Bottle, Sack"
                  maxLength={30}
                  aria-label="Container name"
                />
                <span className={styles.equals}>=</span>
                <span className={styles.sizeWrap}>
                  <input
                    className={styles.sizeInput}
                    type="number"
                    inputMode="decimal"
                    min="0.001"
                    step="any"
                    value={row.size}
                    onChange={(e) => updateRow(row.key, { size: e.target.value })}
                    placeholder="0"
                    aria-label="Container size"
                  />
                  <span className={styles.sizeUnit}>{unitText}</span>
                </span>
                <label className={styles.defaultPick} title="Used first when adding or taking stock">
                  <input
                    type="radio"
                    name="default-pack"
                    checked={row.isDefault}
                    onChange={() => updateRow(row.key, { isDefault: true })}
                  />
                  Default
                </label>
                <button
                  type="button"
                  className={styles.removeRow}
                  onClick={() => removeRow(row.key)}
                  aria-label={`Remove ${row.label || 'container'}`}
                >
                  <Icon src={closeIcon} size={16} />
                </button>
              </li>
            ))}
          </ul>
          <Button
            variant="ghost"
            size="sm"
            icon={plusIcon}
            onClick={() => setPacks((rows) => [...rows, newRow('', '', rows.length === 0)])}
            disabled={packs.length >= 10}
          >
            Add container
          </Button>
        </fieldset>

        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>Low stock at ({unitText})</span>
            <input
              className={styles.input}
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={lowStock}
              onChange={(e) => setLowStock(e.target.value)}
              placeholder="0"
            />
          </label>
          {!isEdit && (
            <label className={styles.field}>
              <span className={styles.label}>
                Starting stock ({unitText}) <span className={styles.optional}>optional</span>
              </span>
              <input
                className={styles.input}
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={initialQty}
                onChange={(e) => setInitialQty(e.target.value)}
                placeholder="0"
              />
            </label>
          )}
        </div>
      </form>
    </Modal>
  );
}

export default ItemFormModal;
