import { useState } from 'react';
import Button from '../../../ui/Button/Button';
import OpenShiftModal from '../../../modal/cashier/ShiftModals/OpenShiftModal/OpenShiftModal';
import CloseShiftModal from '../../../modal/cashier/ShiftModals/CloseShiftModal/CloseShiftModal';
import { useShift } from '../../../../hooks/useShift';
import { formatPeso } from '../../../../utils/format';
import styles from './ShiftBar.module.css';

const timeFormat = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' });

function ShiftBar() {
  const { shift, loading, refresh } = useShift();
  const [modal, setModal] = useState<'open' | 'close' | null>(null);

  if (loading) return null;

  return (
    <div className={styles.bar}>
      {shift ? (
        <>
          <span className={styles.status}>
            <span className={styles.dot} />
            Shift open since {timeFormat.format(new Date(shift.openedAt))} · {formatPeso(shift.openingCash)} opening
          </span>
          <Button variant="secondary" size="sm" onClick={() => setModal('close')}>
            Close Shift
          </Button>
        </>
      ) : (
        <>
          <span className={styles.statusInactive}>No open shift</span>
          <Button size="sm" onClick={() => setModal('open')}>
            Open Shift
          </Button>
        </>
      )}

      {modal === 'open' && (
        <OpenShiftModal
          onClose={() => setModal(null)}
          onDone={() => {
            refresh();
            setModal(null);
          }}
        />
      )}

      {modal === 'close' && shift && (
        <CloseShiftModal
          shift={shift}
          onClose={() => setModal(null)}
          onDone={() => {
            refresh();
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

export default ShiftBar;
