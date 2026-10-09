import { useState, type FormEvent } from 'react';
import Modal from '../../../Modal/Modal';
import Button from '../../../../ui/Button/Button';
import styles from './ProductFormModal.module.css';

import { createProduct, updateProduct } from '../../../../../api/products.api';
import type { Category, Product, ProductType } from '../../../../../types';
import { allowsUpsize, categoryGroupLabels, categoryGroupOrder } from '../../../../../utils/categoryGroups';

interface ProductFormModalProps {
  /** null = bagong product; may laman = edit */
  product: Product | null;
  categories: Category[];
  /** Para sa bagong product: ang category ng bukas na tab sa ProductsPage */
  defaultCategoryId?: number;
  onClose: () => void;
  onSaved: (product: Product) => void;
}

const typeOptions: { value: ProductType; label: string; hint: string }[] = [
  { value: 'MADE', label: 'Made to order', hint: 'Prepared from a recipe, e.g. Iced Latte' },
  { value: 'READY_MADE', label: 'Ready made', hint: 'Bought and resold as is, e.g. cookies' },
];

// Ginagamit lang sa ProductsPage. Ang presyo ay sa pag-add lang; ang pagpapalit ay sa PriceChangeModal.
function ProductFormModal({ product, categories, defaultCategoryId, onClose, onSaved }: ProductFormModalProps) {
  const isEdit = product !== null;
  const activeCategories = categories.filter((c) => c.isActive || c.id === product?.categoryId);
  const firstCategory = activeCategories.find((c) => c.id === defaultCategoryId && c.isActive) ?? activeCategories[0];

  const [name, setName] = useState(product?.name ?? '');
  const [categoryId, setCategoryId] = useState(String(product?.categoryId ?? firstCategory?.id ?? ''));
  const [type, setType] = useState<ProductType>(product?.type ?? 'MADE');
  const [price, setPrice] = useState('');
  const [upsizePrice, setUpsizePrice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedGroup = activeCategories.find((c) => c.id === Number(categoryId))?.group;
  const canUpsize = selectedGroup !== undefined && allowsUpsize(selectedGroup);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const saved = isEdit
        ? await updateProduct(product.id, { name, categoryId: Number(categoryId), type })
        : await createProduct({
            name,
            categoryId: Number(categoryId),
            type,
            price: Number(price),
            upsizePrice: canUpsize && upsizePrice.trim() ? Number(upsizePrice) : undefined,
          });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the product.');
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title={isEdit ? 'Edit product' : 'New product'}
      description={isEdit ? 'To change the price, use Change price instead.' : 'Add a drink, rice meal or snack to the menu.'}
      onClose={onClose}
      width={520}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" loading={saving}>
            {isEdit ? 'Save changes' : 'Add product'}
          </Button>
        </>
      }
    >
      <form id="product-form" className={styles.form} onSubmit={handleSubmit}>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="product-name">
            Product name
          </label>
          <input
            id="product-name"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Iced Spanish Latte"
            maxLength={80}
            autoFocus
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="product-category">
            Category
          </label>
          <select
            id="product-category"
            className={styles.input}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
          >
            {activeCategories.length === 0 && <option value="">Add a category first</option>}
            {categoryGroupOrder.map((group) => {
              const inGroup = activeCategories.filter((c) => c.group === group);
              if (inGroup.length === 0) return null;
              return (
                <optgroup key={group} label={categoryGroupLabels[group]}>
                  {inGroup.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          {isEdit && product.upsizePrice !== null && !canUpsize && (
            <p className={styles.warning}>
              This product has an upsize price. Remove it first in Change price before moving it out of drinks.
            </p>
          )}
        </div>

        {!isEdit && (
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="product-price">
                {canUpsize ? 'Regular price (PHP)' : 'Price (PHP)'}
              </label>
              <input
                id="product-price"
                className={styles.input}
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            {canUpsize ? (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="product-upsize-price">
                  Upsize price (PHP) <span className={styles.optional}>optional</span>
                </label>
                <input
                  id="product-upsize-price"
                  className={styles.input}
                  type="number"
                  inputMode="decimal"
                  min={price || '0.01'}
                  step="0.01"
                  value={upsizePrice}
                  onChange={(e) => setUpsizePrice(e.target.value)}
                  placeholder="Leave blank if no upsize"
                />
              </div>
            ) : (
              <p className={styles.noUpsize}>
                {selectedGroup ? categoryGroupLabels[selectedGroup] : 'This category'} have one price only. Upsize is for
                drinks.
              </p>
            )}
          </div>
        )}

        <fieldset className={styles.typeGroup}>
          <legend className={styles.label}>Type</legend>
          {typeOptions.map((option) => (
            <label
              key={option.value}
              className={`${styles.typeOption} ${type === option.value ? styles.typeOptionActive : ''}`}
            >
              <input
                type="radio"
                name="product-type"
                value={option.value}
                checked={type === option.value}
                onChange={() => setType(option.value)}
              />
              <span>
                <span className={styles.typeLabel}>{option.label}</span>
                <span className={styles.typeHint}>{option.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </form>
    </Modal>
  );
}

export default ProductFormModal;
