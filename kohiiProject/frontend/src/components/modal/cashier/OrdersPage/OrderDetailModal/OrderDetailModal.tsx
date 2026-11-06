import Modal from '../../../Modal/Modal';
import { discountLabel } from '../../../../../utils/salesAggregation';
import { sizeLabels } from '../../../../../utils/productSizes';
import { formatDateTime, formatPeso } from '../../../../../utils/format';
import type { OrderListItem } from '../../../../../types';
import styles from './OrderDetailModal.module.css';

import receiptIcon from '../../../../../assets/icons/sidebar/orders.svg';

interface OrderDetailModalProps {
  order: OrderListItem;
  onClose: () => void;
}

function OrderDetailModal({ order, onClose }: OrderDetailModalProps) {
  return (
    <Modal open icon={receiptIcon} title={order.receiptNo} description={formatDateTime(order.createdAt)} onClose={onClose} width={440}>
      <ul className={styles.list}>
        {(order.items ?? []).map((item) => (
          <li key={item.id} className={styles.line}>
            <div className={styles.lineInfo}>
              <span className={styles.lineName}>
                {item.productName} <span className={styles.lineSize}>{sizeLabels[item.size]}</span>
              </span>
              {item.remarks && <span className={styles.lineRemarks}>{item.remarks}</span>}
            </div>
            <span className={styles.lineQty}>×{item.qty}</span>
            <span className={styles.lineTotal}>{formatPeso(item.lineTotal)}</span>
          </li>
        ))}
      </ul>

      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <span>Subtotal</span>
          <span>{formatPeso(order.subtotal)}</span>
        </div>
        {order.discountType !== 'NONE' && (
          <div className={styles.summaryRow}>
            <span>Discount ({discountLabel(order)})</span>
            <span>− {formatPeso(order.discountAmount)}</span>
          </div>
        )}
        <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
          <span>Total</span>
          <span>{formatPeso(order.total)}</span>
        </div>
        <div className={styles.summaryRow}>
          <span>Payment</span>
          <span>{order.paymentMethod}</span>
        </div>
        {order.amountTendered !== null && (
          <>
            <div className={styles.summaryRow}>
              <span>Tendered</span>
              <span>{formatPeso(order.amountTendered)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Change</span>
              <span>{formatPeso(order.changeDue ?? 0)}</span>
            </div>
          </>
        )}
        {order.referenceNo && (
          <div className={styles.summaryRow}>
            <span>Reference no.</span>
            <span>{order.referenceNo}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default OrderDetailModal;
