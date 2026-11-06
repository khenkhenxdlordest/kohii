import { useState, type FormEvent } from 'react';
import Modal from '../../../Modal/Modal';
import Button from '../../../../ui/Button/Button';
import Icon from '../../../../ui/Icon/Icon';
import styles from './RecipeFormModal.module.css';

import { updateRecipe } from '../../../../../api/recipes.api';
import type { InventoryItem, ProductRecipe } from '../../../../../types';

import plusIcon from '../../../../../assets/icons/actions/plus.svg';
import closeIcon from '../../../../../assets/icons/actions/close.svg';
import recipesIcon from '../../../../../assets/icons/sidebar/recipes.svg';

interface RecipeFormModalProps {
  product: ProductRecipe;
  /** Lahat ng aktibong inventory items na puwedeng piliin bilang ingredient */
  ingredients: InventoryItem[];
  onClose: () => void;
  onSaved: (product: ProductRecipe) => void;
}

interface Row {
  key: string;
  inventoryItemId: number | null;
  qty: string;
}

let rowKey = 0;
const newRow = (inventoryItemId: number | null = null, qty = ''): Row => ({
  key: `row-${(rowKey += 1)}`,
  inventoryItemId,
  qty,
});

function RecipeFormModal({ product, ingredients, onClose, onSaved }: RecipeFormModalProps) {
  const [rows, setRows] = useState<Row[]>(() =>
    product.recipeItems.length
      ? product.recipeItems.map((r) => newRow(r.inventoryItemId, String(r.qtyPerUnit)))
      : [newRow()],
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const unitFor = (inventoryItemId: number | null) => ingredients.find((i) => i.id === inventoryItemId)?.unit ?? '';
  const unitText = (unit: string) => (unit === 'PCS' ? 'pcs' : unit.toLowerCase());

  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const removeRow = (key: string) => setRows((current) => current.filter((r) => r.key !== key));

  const availableFor = (row: Row) =>
    ingredients.filter((i) => i.id === row.inventoryItemId || !rows.some((r) => r.inventoryItemId === i.id));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const items = rows
      .filter((r) => r.inventoryItemId !== null && Number(r.qty) > 0)
      .map((r) => ({ inventoryItemId: r.inventoryItemId!, qtyPerUnit: Number(r.qty) }));

    setSaving(true);
    try {
      const saved = await updateRecipe(product.id, items);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the recipe.');
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      icon={recipesIcon}
      title="Edit recipe"
      description={product.name}
      onClose={onClose}
      width={520}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="recipe-form" loading={saving}>
            Save recipe
          </Button>
        </>
      }
    >
      <form id="recipe-form" className={styles.form} onSubmit={handleSubmit}>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        {ingredients.length === 0 ? (
          <p className={styles.empty}>No inventory items yet — add some in Inventory Overview first.</p>
        ) : (
          <ul className={styles.rowList}>
            {rows.map((row) => (
              <li key={row.key} className={styles.row}>
                <select
                  className={styles.input}
                  value={row.inventoryItemId ?? ''}
                  onChange={(e) => updateRow(row.key, { inventoryItemId: e.target.value ? Number(e.target.value) : null })}
                  aria-label="Ingredient"
                >
                  <option value="">Select ingredient</option>
                  {availableFor(row).map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>

                <span className={styles.qtyWrap}>
                  <input
                    className={styles.qtyInput}
                    type="number"
                    inputMode="decimal"
                    min="0.001"
                    step="any"
                    value={row.qty}
                    onChange={(e) => updateRow(row.key, { qty: e.target.value })}
                    placeholder="0"
                    aria-label="Quantity used per sale"
                  />
                  <span className={styles.qtyUnit}>{unitText(unitFor(row.inventoryItemId))}</span>
                </span>

                <button
                  type="button"
                  className={styles.removeRow}
                  onClick={() => removeRow(row.key)}
                  aria-label="Remove ingredient"
                >
                  <Icon src={closeIcon} size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <Button
          variant="ghost"
          size="sm"
          icon={plusIcon}
          onClick={() => setRows((current) => [...current, newRow()])}
          disabled={ingredients.length === 0 || rows.length >= ingredients.length}
        >
          Add ingredient
        </Button>
      </form>
    </Modal>
  );
}

export default RecipeFormModal;
