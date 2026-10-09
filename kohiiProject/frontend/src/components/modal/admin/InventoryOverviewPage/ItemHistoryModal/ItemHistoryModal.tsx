import { useEffect, useState } from 'react';
import Modal from '../../../Modal/Modal';
import Button from '../../../../ui/Button/Button';
import styles from './ItemHistoryModal.module.css';

import { getMovements } from '../../../../../api/inventory.api';
import type { InventoryItem, StockMovement } from '../../../../../types';
import { formatDateTime, formatPeso } from '../../../../../utils/format';
import { formatQty, movementLabels, wasteCauseLabels } from '../../../../../utils/inventory';

import historyIcon from '../../../../../assets/icons/actions/history.svg';

interface ItemHistoryModalProps {
  item: InventoryItem;
  onClose: () => void;
}

// Ginagamit lang sa InventoryOverviewPage: bawat galaw ng stock ng isang item
function ItemHistoryModal({ item, onClose }: ItemHistoryModalProps) {
  const [movements, setMovements] = useState<StockMovement[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    getMovements({ itemId: item.id, limit: 100 })
      .then((data) => {
        if (!ignore) setMovements(data);
      })
      .catch((err: Error) => {
        if (!ignore) setError(err.message);
      });
    return () => {
      ignore = true;
    };
  }, [item.id]);

  return (
    <Modal
      open
      icon={historyIcon}
      title={item.name}
      description={`On hand: ${formatQty(item.stockQty, item.unit)}`}
      onClose={onClose}
      width={600}
      footer={
        <Button variant="secondary" className={styles.closeButton} onClick={onClose}>
          Close
        </Button>
      }
    >
      {error ? (
        <p className={styles.state}>{error}</p>
      ) : movements === null ? (
        <p className={styles.state}>Loading...</p>
      ) : movements.length === 0 ? (
        <p className={styles.state}>No stock changes yet.</p>
      ) : (
        <ol className={styles.timeline}>
          {movements.map((m, index) => {
            const isIn = m.qty > 0;
            return (
              <li key={m.id} className={styles.entry} style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}>
                <span className={`${styles.dot} ${styles[m.type]}`} aria-hidden="true" />
                <div className={styles.body}>
                  <div className={styles.top}>
                    <span className={`${styles.kind} ${styles[m.type]}`}>
                      {m.source === 'EMERGENCY' ? 'Emergency purchase' : movementLabels[m.type]}
                      {m.wasteCause && ` · ${wasteCauseLabels[m.wasteCause]}`}
                    </span>
                    <span className={`${styles.qty} ${isIn ? styles.qtyIn : styles.qtyOut}`}>
                      {isIn ? '+' : '−'}
                      {formatQty(Math.abs(m.qty), item.unit)}
                    </span>
                  </div>
                  <p className={styles.meta}>
                    {formatDateTime(m.createdAt)} · {m.user}
                    {m.store && ` · ${m.store.name}`}
                    {m.supplier && ` · ${m.supplier}`}
                    {m.totalCost !== null && ` · ${formatPeso(m.totalCost)}`}
                  </p>
                  {m.note && <p className={styles.note}>{m.note}</p>}
                </div>
                <span className={styles.balance}>{formatQty(m.balanceAfter, item.unit)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </Modal>
  );
}

export default ItemHistoryModal;
