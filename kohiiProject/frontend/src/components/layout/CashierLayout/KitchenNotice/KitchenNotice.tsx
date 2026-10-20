import { useEffect, useState } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useRealtime } from '../../../../hooks/useRealtime';
import Icon from '../../../ui/Icon/Icon';
import styles from './KitchenNotice.module.css';

import readyIcon from '../../../../assets/icons/cards/kitchen.svg';
import closeIcon from '../../../../assets/icons/actions/close.svg';

interface PrepStatusEvent {
  orderId: number;
  itemId: number;
  productName: string;
  prepStatus: 'READY' | 'DELIVERED';
  storeId: number;
  receiptNo: string;
}

interface ToastEntry {
  id: string;
  message: string;
}

const AUTO_DISMISS_MS = 7000;

// Live toast kapag may meal na naging Ready o Delivered sa store mismo ng cashier na nakalogin —
// kahit saang page siya, hindi na kailangang nasa /cashier/kitchen para malaman
function KitchenNotice() {
  const { user } = useAuth();
  const { socket } = useRealtime();
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const dismiss = (id: string) => setToasts((current) => current.filter((t) => t.id !== id));

  useEffect(() => {
    if (!socket || !user?.storeId) return;

    const handle = (payload: PrepStatusEvent) => {
      if (payload.storeId !== user.storeId) return;
      const message =
        payload.prepStatus === 'READY'
          ? `Ready to serve: ${payload.productName} (${payload.receiptNo})`
          : `Delivered: ${payload.productName} (${payload.receiptNo})`;
      const id = `${payload.itemId}-${payload.prepStatus}-${Date.now()}`;
      setToasts((current) => [...current, { id, message }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    };

    socket.on('order:item:statusChanged', handle);
    return () => {
      socket.off('order:item:statusChanged', handle);
    };
  }, [socket, user?.storeId]);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.stack} role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={styles.toast}>
          <Icon src={readyIcon} size={18} />
          <span className={styles.message}>{toast.message}</span>
          <button type="button" className={styles.close} aria-label="Dismiss" onClick={() => dismiss(toast.id)}>
            <Icon src={closeIcon} size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default KitchenNotice;
