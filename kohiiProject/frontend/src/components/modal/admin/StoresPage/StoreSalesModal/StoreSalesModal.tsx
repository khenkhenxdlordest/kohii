import Modal from '../../../Modal/Modal';
import Icon from '../../../../ui/Icon/Icon';
import styles from './StoreSalesModal.module.css';

import type { Store } from '../../../../../types';
import type { StoreSales } from '../../../../../utils/mockDashboard';
import { shiftLabels } from '../../../../../utils/roles';

import salesIcon from '../../../../../assets/icons/cards/sales.svg';
import ordersIcon from '../../../../../assets/icons/cards/orders.svg';

const peso = (value: number) => `₱${value.toLocaleString()}`;

// Pansamantala habang wala pang POS (Phase 3); malinaw na naka-tag na "Sample data"
function StoreSalesModal({ store, data, onClose }: { store: Store; data: StoreSales; onClose: () => void }) {
  const avgOrder = data.orders > 0 ? data.sales / data.orders : 0;
  const maxShiftSales = Math.max(...data.shifts.map((s) => s.sales), 1);

  return (
    <Modal
      open
      icon={salesIcon}
      title={`${store.name} sales`}
      description="Today · Sample data, coming from POS in Phase 3"
      onClose={onClose}
      width={460}
    >
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>
            <Icon src={salesIcon} size={14} />
            Total sales
          </span>
          <span className={styles.statValue}>{peso(data.sales)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>
            <Icon src={ordersIcon} size={14} />
            Orders
          </span>
          <span className={styles.statValue}>{data.orders}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Avg. order</span>
          <span className={styles.statValue}>{peso(Math.round(avgOrder))}</span>
        </div>
      </div>

      <p className={styles.sectionTitle}>By shift</p>
      <div className={styles.shiftList}>
        {data.shifts.map((s) => (
          <div key={s.shift} className={styles.shiftRow}>
            <span className={styles.shiftLabel}>{shiftLabels[s.shift]}</span>
            <div className={styles.shiftBar}>
              <span className={styles.shiftBarFill} style={{ width: `${(s.sales / maxShiftSales) * 100}%` }} />
            </div>
            <span className={styles.shiftValue}>
              {peso(s.sales)} <span className={styles.shiftOrders}>· {s.orders} orders</span>
            </span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export default StoreSalesModal;
