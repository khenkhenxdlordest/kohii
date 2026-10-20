import { useCallback, useEffect, useState } from 'react';
import { getKitchenQueue, updateItemPrepStatus } from '../../../api/orders.api';
import { useRealtime } from '../../../hooks/useRealtime';
import { sizeLabels } from '../../../utils/productSizes';
import { formatDateTime } from '../../../utils/format';
import type { KitchenQueueOrder } from '../../../types';
import Button from '../../../components/ui/Button/Button';
import styles from './KitchenQueuePage.module.css';

function KitchenQueuePage() {
  const { socket } = useRealtime();
  const [orders, setOrders] = useState<KitchenQueueOrder[] | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const refresh = useCallback(() => {
    getKitchenQueue()
      .then(setOrders)
      .catch(() => setOrders([]));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!socket) return;
    socket.on('order:kitchen:new', refresh);
    socket.on('order:item:statusChanged', refresh);
    return () => {
      socket.off('order:kitchen:new', refresh);
      socket.off('order:item:statusChanged', refresh);
    };
  }, [socket, refresh]);

  const handleAdvance = async (itemId: number, next: 'READY' | 'DELIVERED') => {
    setUpdatingId(itemId);
    try {
      await updateItemPrepStatus(itemId, next);
      refresh();
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Kitchen Queue</h1>
        <p className={styles.subtitle}>Meal orders waiting to be prepared or delivered.</p>
      </header>

      {orders === null ? (
        <p className={styles.state}>Loading...</p>
      ) : orders.length === 0 ? (
        <p className={styles.state}>No meal orders in the queue.</p>
      ) : (
        <div className={styles.grid}>
          {orders.map((order) => (
            <article key={order.orderId} className={styles.card}>
              <header className={styles.cardHeader}>
                <span className={styles.receipt}>
                  {order.receiptNo}
                  <span className={styles.storeBadge}>{order.storeCode}</span>
                </span>
                <span className={styles.time}>{formatDateTime(order.createdAt)}</span>
              </header>

              <ul className={styles.items}>
                {order.items.map((item) => (
                  <li key={item.id} className={styles.item}>
                    <div className={styles.itemInfo}>
                      <span className={styles.itemName}>
                        {item.qty}× {item.productName}
                        <span className={styles.itemSize}> ({sizeLabels[item.size]})</span>
                      </span>
                      {item.remarks && <span className={styles.itemRemarks}>{item.remarks}</span>}
                    </div>

                    <div className={styles.itemActions}>
                      <span className={`${styles.statusTag} ${styles[item.prepStatus]}`}>{item.prepStatus}</span>
                      {item.prepStatus === 'PENDING' && (
                        <Button
                          size="sm"
                          loading={updatingId === item.id}
                          onClick={() => handleAdvance(item.id, 'READY')}
                        >
                          Mark Ready
                        </Button>
                      )}
                      {item.prepStatus === 'READY' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={updatingId === item.id}
                          onClick={() => handleAdvance(item.id, 'DELIVERED')}
                        >
                          Mark Delivered
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default KitchenQueuePage;
