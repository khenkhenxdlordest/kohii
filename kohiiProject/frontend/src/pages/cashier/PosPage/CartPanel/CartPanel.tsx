import { useState } from 'react';
import { useCart } from '../../../../hooks/useCart';
import { formatPeso } from '../../../../utils/format';
import { sizeLabels } from '../../../../utils/productSizes';
import { paymentMethods } from '../../../../utils/paymentMethods';
import type { CartItem } from '../../../../context/cart.context';
import type { Order, PaymentMethod } from '../../../../types';
import Button from '../../../../components/ui/Button/Button';
import Icon from '../../../../components/ui/Icon/Icon';
import PaymentPanel from './PaymentPanel/PaymentPanel';
import DiscountModal from './DiscountModal/DiscountModal';
import RemarksModal from '../../../../components/modal/cashier/PosPage/RemarksModal/RemarksModal';
import styles from './CartPanel.module.css';

import plusIcon from '../../../../assets/icons/actions/plus.svg';
import minusIcon from '../../../../assets/icons/actions/minus.svg';
import closeIcon from '../../../../assets/icons/actions/close.svg';
import discountIcon from '../../../../assets/icons/actions/discount.svg';
import editIcon from '../../../../assets/icons/actions/edit.svg';

const discountLabels: Record<string, string> = {
  NONE: 'Discount',
  SENIOR: 'Senior Citizen (20%)',
  PWD: 'PWD (20%)',
};

function CartPanel() {
  const {
    items,
    subtotal,
    discountType,
    discountPercent,
    discountAmount,
    total,
    setDiscount,
    incrementQty,
    decrementQty,
    removeItem,
    updateRemarks,
    clearCart,
  } = useCart();
  const [view, setView] = useState<'cart' | 'payment' | 'success'>('cart');
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [remarksItem, setRemarksItem] = useState<CartItem | null>(null);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  const handleComplete = (order: Order) => {
    setLastOrder(order);
    clearCart();
    setMethod(null);
    setView('success');
  };

  if (view === 'success' && lastOrder) {
    return (
      <aside className={styles.panel}>
        <header className={styles.header}>
          <h2 className={styles.title}>Sale complete</h2>
        </header>
        <div className={styles.success}>
          <span className={styles.successReceipt}>{lastOrder.receiptNo}</span>
          <span className={styles.successTotal}>{formatPeso(lastOrder.total)}</span>
          <Button className={styles.checkout} onClick={() => setView('cart')}>
            New order
          </Button>
        </div>
      </aside>
    );
  }

  if (view === 'payment' && method) {
    return (
      <aside className={styles.panel}>
        <header className={styles.header}>
          <h2 className={styles.title}>Payment</h2>
        </header>
        <PaymentPanel total={total} method={method} onBack={() => setView('cart')} onComplete={handleComplete} />
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
                {item.remarks && <span className={styles.lineRemarks}>{item.remarks}</span>}
              </div>

              <button
                type="button"
                className={styles.noteButton}
                aria-label={`Add remarks for ${item.name}`}
                onClick={() => setRemarksItem(item)}
              >
                <Icon src={editIcon} size={14} />
              </button>

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
          <span>{formatPeso(subtotal)}</span>
        </div>

        <button
          type="button"
          className={styles.discountRow}
          disabled={items.length === 0}
          onClick={() => setDiscountModalOpen(true)}
        >
          <span className={styles.discountLabel}>
            <Icon src={discountIcon} size={16} />
            {discountType === 'CUSTOM' ? `Custom (${discountPercent}%)` : discountLabels[discountType]}
          </span>
          <span>{discountAmount > 0 ? `− ${formatPeso(discountAmount)}` : 'Add'}</span>
        </button>

        <div className={styles.totalRow}>
          <span>Total</span>
          <span className={styles.subtotalValue}>{formatPeso(total)}</span>
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

      {discountModalOpen && (
        <DiscountModal
          subtotal={subtotal}
          current={discountType}
          currentPercent={discountPercent}
          onClose={() => setDiscountModalOpen(false)}
          onApply={setDiscount}
        />
      )}

      {remarksItem && (
        <RemarksModal
          itemName={remarksItem.name}
          categoryGroup={remarksItem.categoryGroup}
          currentRemarks={remarksItem.remarks}
          onClose={() => setRemarksItem(null)}
          onSave={(remarks) => updateRemarks(remarksItem.productId, remarksItem.size, remarks)}
        />
      )}
    </aside>
  );
}

export default CartPanel;
