import { useEffect, useState, type FormEvent } from 'react';
import Modal from '../../../Modal/Modal';
import Button from '../../../../ui/Button/Button';
import styles from './PriceChangeModal.module.css';

import { changeProductPrice, getProduct } from '../../../../../api/products.api';
import type { PriceHistoryEntry, Product, ProductSize } from '../../../../../types';
import { formatDateTime, formatPeso } from '../../../../../utils/format';
import { priceOf, sizeLabels, sizeOunces, sizesFor } from '../../../../../utils/productSizes';

interface PriceChangeModalProps {
  product: Product;
  onClose: () => void;
  onSaved: (product: Product) => void;
}

// Ginagamit lang sa ProductsPage. Bawat pagpapalit ay may ProductPriceHistory at AuditLog sa backend.
function PriceChangeModal({ product, onClose, onSaved }: PriceChangeModalProps) {
  const sizes = sizesFor(product.category.group);
  const isDrink = product.category.group === 'DRINKS';
  // Unang bukas: ang unang size na may presyo
  const firstSize = sizes.find((s) => priceOf(product, s) !== null) ?? sizes[0];

  const [size, setSize] = useState<ProductSize>(firstSize);
  const [price, setPrice] = useState(String(priceOf(product, firstSize) ?? ''));
  const [reason, setReason] = useState('');
  const [history, setHistory] = useState<PriceHistoryEntry[] | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<'save' | 'remove' | null>(null);

  const current = priceOf(product, size);
  // Drinks: puwedeng tanggalin ang isang size basta may matitirang Hot o Iced
  const remaining = product.prices.filter((p) => p.size !== size);
  const canRemove = isDrink && current !== null && remaining.some((p) => p.size === 'HOT' || p.size === 'ICED');

  useEffect(() => {
    let ignore = false;
    getProduct(product.id)
      .then((detail) => {
        if (!ignore) setHistory(detail.priceHistory);
      })
      .catch(() => {
        if (!ignore) setHistory([]);
      });
    return () => {
      ignore = true;
    };
  }, [product.id]);

  const selectSize = (next: ProductSize) => {
    setSize(next);
    setError('');
    setPrice(String(priceOf(product, next) ?? ''));
  };

  const submit = async (newPrice: number | null) => {
    setError('');
    setSaving(newPrice === null ? 'remove' : 'save');
    try {
      onSaved(await changeProductPrice(product.id, size, newPrice, reason.trim() || undefined));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the price.');
      setSaving(null);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit(Number(price));
  };

  return (
    <Modal
      open
      title="Change price"
      description={product.name}
      onClose={onClose}
      width={560}
      footer={
        <>
          {canRemove && (
            <Button
              variant="danger"
              className={styles.removeButton}
              onClick={() => submit(null)}
              loading={saving === 'remove'}
              disabled={saving !== null}
            >
              Remove {sizeLabels[size]}
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={saving !== null}>
            Cancel
          </Button>
          <Button type="submit" form="price-form" loading={saving === 'save'} disabled={saving !== null}>
            {current === null ? `Add ${sizeLabels[size]}` : 'Save new price'}
          </Button>
        </>
      }
    >
      <form id="price-form" className={styles.form} onSubmit={handleSubmit}>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        {isDrink && (
          <div className={styles.sizeTabs} role="tablist" aria-label="Size">
            {sizes.map((value) => {
              const valuePrice = priceOf(product, value);
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={size === value}
                  className={`${styles.sizeTab} ${size === value ? styles.sizeTabActive : ''}`}
                  onClick={() => selectSize(value)}
                >
                  <span className={styles.sizeName}>
                    {sizeLabels[value]} {sizeOunces[value]}
                  </span>
                  <span className={valuePrice === null ? styles.sizeNone : styles.sizePrice}>
                    {valuePrice === null ? 'Not offered' : formatPeso(valuePrice)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="new-price">
            {current === null
              ? `${sizeLabels[size]} price (PHP)`
              : isDrink
                ? `New ${sizeLabels[size].toLowerCase()} price (PHP)`
                : `New price (PHP), now ${formatPeso(current)}`}
          </label>
          <input
            id="new-price"
            className={styles.input}
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            autoFocus
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="price-reason">
            Reason <span className={styles.optional}>(optional)</span>
          </label>
          <input
            id="price-reason"
            className={styles.input}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Supplier price increase"
            maxLength={200}
          />
        </div>
      </form>

      <section className={styles.history} aria-label="Price history">
        <h3 className={styles.historyTitle}>Price history</h3>
        {history === null ? (
          <p className={styles.historyEmpty}>Loading...</p>
        ) : history.length === 0 ? (
          <p className={styles.historyEmpty}>No price changes yet.</p>
        ) : (
          <ul className={styles.historyList}>
            {history.map((entry) => (
              <li key={entry.id} className={styles.historyItem}>
                <div>
                  <span className={`${styles.sizeBadge} ${styles[`size_${entry.size}`] ?? ''}`}>
                    {sizeLabels[entry.size]}
                  </span>
                  <span className={styles.historyPrice}>
                    {entry.oldPrice === null ? '' : `${formatPeso(entry.oldPrice)} to `}
                    {entry.newPrice === null ? 'Removed' : formatPeso(entry.newPrice)}
                  </span>
                  {entry.reason && <span className={styles.historyReason}>{entry.reason}</span>}
                </div>
                <span className={styles.historyMeta}>
                  {formatDateTime(entry.changedAt)} by {entry.changedBy}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Modal>
  );
}

export default PriceChangeModal;
