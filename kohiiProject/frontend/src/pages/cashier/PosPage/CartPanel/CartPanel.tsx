import { useState } from 'react';
import { useCart } from '../../../../hooks/useCart';
import { formatPeso } from '../../../../utils/format';
import { sizeLabels } from '../../../../utils/productSizes';
import { paymentMethods } from '../../../../utils/paymentMethods';
import type { PaymentMethod } from '../../../../types';
import Button from '../../../../components/ui/Button/Button';
import Icon from '../../../../components/ui/Icon/Icon';
import PaymentPanel from './PaymentPanel/PaymentPanel';
import styles from './CartPanel.module.css';

import plusIcon from '../../../../assets/icons/actions/plus.svg';
import minusIcon from '../../../../assets/icons/actions/minus.svg';
import closeIcon from '../../../../assets/icons/actions/close.svg';

function CartPanel() {
  const { items, subtotal, incrementQty, decrementQty, removeItem, clearCart } = useCart();
  const [view, setView] = useState<'cart' | 'payment'>('cart');
  const [method, setMethod] = useState<PaymentMethod | null>(null);

  if (view === 'payment' && method) {
    return (
      <aside className={styles.panel}>
        <header className={styles.header}>
          <h2 className={styles.title}>Payment</h2>
        </header>
        <PaymentPanel total={subtotal} method={method} onBack={() => setView('cart')} />
      </aside>
    );
  }

  return (
    <aside className={styles.panel}>
      <header className={styles.header}>
        <h2 className={styles.title}>Current order</h2>
        {items.length > 0 && (
          <button type="button" className={styles.clear} onClick={clearCart}>
            Clear
          </button>
        )}
      </header>

      {items.length === 0 ? (
        <p className={styles.empty}>No items yet. Tap a product to add it.</p>
      ) : (
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={`${item.productId}-${item.size}`} className={styles.line}>
              <span className={styles.lineIcon} aria-hidden="true">
                {item.name.charAt(0)}
              </span>

              <div className={styles.lineInfo}>
                <span className={styles.lineName}>{item.name}</span>
                <span className={styles.lineSize}>{sizeLabels[item.size]}</span>
              </div>

              <div className={styles.stepper}>
                <button
                  type="button"
                  className={styles.stepperButton}
                  aria-label={`Decrease ${item.name}`}
                  onClick={() => decrementQty(item.productId, item.size)}
                >
                  <Icon src={minusIcon} size={14} />
                </button>
                <span className={styles.qty}>{item.qty}</span>
                <button
                  type="button"
                  className={styles.stepperButton}
                  aria-label={`Increase ${item.name}`}
                  onClick={() => incrementQty(item.productId, item.size)}
                >
                  <Icon src={plusIcon} size={14} />
                </button>
              </div>

              <span className={styles.lineTotal}>{formatPeso(item.unitPrice * item.qty)}</span>

              <button
                type="button"
                className={styles.remove}
                aria-label={`Remove ${item.name}`}
                onClick={() => removeItem(item.productId, item.size)}
              >
                <Icon src={closeIcon} size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <footer className={styles.footer}>
        <div className={styles.subtotalRow}>
          <span>Subtotal</span>
          <span className={styles.subtotalValue}>{formatPeso(subtotal)}</span>
        </div>

        <p className={styles.methodLabel}>Select payment method</p>
        <div className={styles.methods} role="group" aria-label="Payment method">
          {paymentMethods.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`${styles.methodButton} ${method === m.id ? styles.methodActive : ''}`}
              aria-pressed={method === m.id}
              disabled={items.length === 0}
              onClick={() => setMethod(m.id)}
            >
              <Icon src={m.icon} size={18} />
              {m.label}
            </button>
          ))}
        </div>

        <div className={styles.footerActions}>
          <Button
            variant="secondary"
            className={styles.resetButton}
            disabled={method === null}
            onClick={() => setMethod(null)}
          >
            Reset Selection
          </Button>
          <Button
            className={styles.continueButton}
            disabled={items.length === 0 || method === null}
            onClick={() => setView('payment')}
          >
            Continue
          </Button>
        </div>
      </footer>
    </aside>
  );
}

export default CartPanel;
