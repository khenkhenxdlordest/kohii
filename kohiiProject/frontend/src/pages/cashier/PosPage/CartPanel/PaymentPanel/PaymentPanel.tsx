import { useMemo, useState } from 'react';
import type { PaymentMethod } from '../../../../../types';
import { formatPeso } from '../../../../../utils/format';
import { paymentMethods } from '../../../../../utils/paymentMethods';
import Button from '../../../../../components/ui/Button/Button';
import Icon from '../../../../../components/ui/Icon/Icon';
import styles from './PaymentPanel.module.css';

import chevronIcon from '../../../../../assets/icons/actions/chevron-down.svg';

const quickCash = [50, 100, 500, 1000];

interface PaymentPanelProps {
  total: number;
  method: PaymentMethod;
  onBack: () => void;
}

function PaymentPanel({ total, method, onBack }: PaymentPanelProps) {
  const [tendered, setTendered] = useState('');
  const [referenceNo, setReferenceNo] = useState('');

  const tenderedAmount = Number(tendered) || 0;
  const change = tenderedAmount - total;
  const isCash = method === 'CASH';
  const methodInfo = paymentMethods.find((m) => m.id === method);

  const canComplete = useMemo(() => {
    if (isCash) return tenderedAmount >= total;
    return referenceNo.trim().length > 0;
  }, [isCash, tenderedAmount, total, referenceNo]);

  return (
    <div className={styles.panel}>
      <button type="button" className={styles.back} onClick={onBack}>
        <Icon src={chevronIcon} size={14} className={styles.backIcon} />
        Back to order
      </button>

      {methodInfo && (
        <div className={styles.methodBadge}>
          <Icon src={methodInfo.icon} size={18} />
          {methodInfo.label}
        </div>
      )}

      {isCash ? (
        <div className={styles.cash}>
          <label className={styles.fieldLabel} htmlFor="tendered">
            Amount tendered
          </label>
          <input
            id="tendered"
            type="number"
            min={0}
            inputMode="decimal"
            placeholder="0.00"
            className={styles.input}
            value={tendered}
            onChange={(e) => setTendered(e.target.value)}
          />

          <div className={styles.quickCash}>
            {quickCash.map((amount) => (
              <button
                key={amount}
                type="button"
                className={styles.quickButton}
                onClick={() => setTendered(String(amount))}
              >
                {formatPeso(amount)}
              </button>
            ))}
            <button type="button" className={styles.quickButton} onClick={() => setTendered(String(total))}>
              Exact
            </button>
          </div>

          <div className={`${styles.changeRow} ${change < 0 ? styles.changeShort : ''}`}>
            <span>{change < 0 ? 'Short' : 'Change'}</span>
            <span className={styles.changeValue}>{formatPeso(Math.abs(change))}</span>
          </div>
        </div>
      ) : (
        <div className={styles.reference}>
          <label className={styles.fieldLabel} htmlFor="referenceNo">
            Reference number
          </label>
          <input
            id="referenceNo"
            type="text"
            placeholder="Enter reference number"
            className={styles.input}
            value={referenceNo}
            onChange={(e) => setReferenceNo(e.target.value)}
          />
        </div>
      )}

      <div className={styles.totalRow}>
        <span>Total</span>
        <span className={styles.totalValue}>{formatPeso(total)}</span>
      </div>

      <p className={styles.readyNote}>
        {canComplete ? 'Ready to complete once checkout is available.' : isCash ? 'Enter a tendered amount to cover the total.' : 'Enter a reference number to continue.'}
      </p>

      <Button className={styles.checkout} disabled title="Coming soon — needs an open shift">
        Complete sale
      </Button>
      <p className={styles.note}>Checkout is coming soon — needs the Shift feature first.</p>
    </div>
  );
}

export default PaymentPanel;
