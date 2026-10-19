import { useState } from 'react';
import Modal from '../../../../../components/modal/Modal/Modal';
import Button from '../../../../../components/ui/Button/Button';
import { formatPeso } from '../../../../../utils/format';
import type { DiscountType } from '../../../../../types';
import styles from './DiscountModal.module.css';

import discountIcon from '../../../../../assets/icons/actions/discount.svg';

const presets: { id: DiscountType; label: string; percent: number }[] = [
  { id: 'NONE', label: 'No discount', percent: 0 },
  { id: 'SENIOR', label: 'Senior Citizen', percent: 20 },
  { id: 'PWD', label: 'PWD', percent: 20 },
];

interface DiscountModalProps {
  subtotal: number;
  current: DiscountType;
  currentPercent: number;
  onClose: () => void;
  onApply: (type: DiscountType, customPercent?: number) => void;
}

function DiscountModal({ subtotal, current, currentPercent, onClose, onApply }: DiscountModalProps) {
  const [selected, setSelected] = useState<DiscountType>(current);
  const [customPercent, setCustomPercent] = useState(current === 'CUSTOM' ? String(currentPercent) : '');

  const percent = selected === 'CUSTOM' ? Number(customPercent) || 0 : (presets.find((o) => o.id === selected)?.percent ?? 0);
  const discountAmount = Math.round(subtotal * (percent / 100) * 100) / 100;

  const handleApply = () => {
    onApply(selected, selected === 'CUSTOM' ? Math.min(100, Math.max(0, Number(customPercent) || 0)) : undefined);
    onClose();
  };

  return (
    <Modal
      open
      icon={discountIcon}
      title="Discount"
      onClose={onClose}
      width={400}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply}>Apply</Button>
        </>
      }
    >
      <div className={styles.options} role="radiogroup" aria-label="Discount type">
        {presets.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`${styles.option} ${selected === option.id ? styles.optionActive : ''}`}
            aria-pressed={selected === option.id}
            onClick={() => setSelected(option.id)}
          >
            <span>{option.label}</span>
            <span className={styles.optionPercent}>{option.percent > 0 ? `${option.percent}%` : '—'}</span>
          </button>
        ))}

        <button
          type="button"
          className={`${styles.option} ${selected === 'CUSTOM' ? styles.optionActive : ''}`}
          aria-pressed={selected === 'CUSTOM'}
          onClick={() => setSelected('CUSTOM')}
        >
          <span>Custom</span>
          <span className={styles.optionPercent}>%</span>
        </button>

        {selected === 'CUSTOM' && (
          <div className={styles.customField}>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step="0.1"
              placeholder="0"
              className={styles.customInput}
              value={customPercent}
              onChange={(e) => setCustomPercent(e.target.value)}
              autoFocus
            />
            <span className={styles.customSuffix}>%</span>
          </div>
        )}
      </div>

      <div className={styles.preview}>
        <span>Discount amount</span>
        <span className={styles.previewValue}>{formatPeso(discountAmount)}</span>
      </div>
    </Modal>
  );
}

export default DiscountModal;
