import { useEffect, useState } from 'react';
import Modal from '../../../Modal/Modal';
import Button from '../../../../ui/Button/Button';
import styles from './PriceHistoryModal.module.css';

import { getProduct } from '../../../../../api/products.api';
import type { PriceHistoryEntry, Product } from '../../../../../types';
import { formatDateTime, formatPeso } from '../../../../../utils/format';
import { sizeLabels } from '../../../../../utils/productSizes';

import historyIcon from '../../../../../assets/icons/actions/history.svg';

// Totoong ProductPriceHistory mula sa backend (GET /api/products/:id); walang mock dito
function PriceHistoryModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [history, setHistory] = useState<PriceHistoryEntry[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    getProduct(product.id)
      .then((detail) => {
        if (!ignore) setHistory(detail.priceHistory);
      })
      .catch((err: Error) => {
        if (!ignore) setError(err.message);
      });
    return () => {
      ignore = true;
    };
  }, [product.id]);

  return (
    <Modal
      open
      icon={historyIcon}
      title={product.name}
      description="Price history"
      onClose={onClose}
      width={560}
      footer={
        <Button variant="secondary" className={styles.closeButton} onClick={onClose}>
          Close
        </Button>
      }
    >
      {error ? (
        <p className={styles.state}>{error}</p>
      ) : history === null ? (
        <p className={styles.state}>Loading...</p>
      ) : history.length === 0 ? (
        <p className={styles.state}>No price changes yet.</p>
      ) : (
        <ol className={styles.timeline}>
          {history.map((entry, index) => {
            const isRemoval = entry.newPrice === null;
            const isIncrease = !isRemoval && entry.oldPrice !== null && entry.newPrice! > entry.oldPrice;
            return (
              <li key={entry.id} className={styles.entry} style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}>
                <span
                  className={`${styles.dot} ${isRemoval ? styles.removed : isIncrease ? styles.up : styles.down}`}
                  aria-hidden="true"
                />
                <div className={styles.body}>
                  <div className={styles.top}>
                    <span className={styles.size}>{sizeLabels[entry.size]}</span>
                    <span className={styles.change}>
                      {entry.oldPrice === null ? 'New' : formatPeso(entry.oldPrice)}
                      {' → '}
                      {isRemoval ? (
                        <span className={styles.removedValue}>Removed</span>
                      ) : (
                        <span className={isIncrease ? styles.up : styles.down}>{formatPeso(entry.newPrice!)}</span>
                      )}
                    </span>
                  </div>
                  <p className={styles.meta}>
                    {formatDateTime(entry.changedAt)} · {entry.changedBy}
                  </p>
                  {entry.reason && <p className={styles.note}>{entry.reason}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Modal>
  );
}

export default PriceHistoryModal;
