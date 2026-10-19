import { useState, type FormEvent } from 'react';
import Modal from '../../../Modal/Modal';
import Button from '../../../../ui/Button/Button';
import styles from './CloseShiftModal.module.css';

import { closeShift } from '../../../../../api/shifts.api';
import type { Shift } from '../../../../../types';
import { formatPeso } from '../../../../../utils/format';

import shiftIcon from '../../../../../assets/icons/sidebar/pos.svg';

interface CloseShiftModalProps {
  shift: Shift;
  onClose: () => void;
  onDone: (shift: Shift) => void;
}

function CloseShiftModal({ shift, onClose, onDone }: CloseShiftModalProps) {
  const [closingCash, setClosingCash] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const counted = Number(closingCash) || 0;
  // Walang Order creation pa, kaya kapareho pa lang ng opening cash ang expected
  const expected = shift.openingCash;
  const variance = closingCash ? counted - expected : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const amount = Number(closingCash);
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Enter a valid closing cash amount.');
      return;
    }
    setSaving(true);
    try {
      const updated = await closeShift(shift.id, { closingCash: amount, note: note.trim() || undefined });
      onDone(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not close the shift.');
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      icon={shiftIcon}
      title="Close Shift"
      onClose={onClose}
      width={440}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="close-shift-form" loading={saving}>
            Close Shift
          </Button>
        </>
      }
    >
      <form id="close-shift-form" className={styles.form} onSubmit={handleSubmit}>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <div className={styles.summary}>
          <div className={styles.summaryRow}>
            <span>Opening cash</span>
            <span>{formatPeso(shift.openingCash)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Expected cash</span>
            <span>{formatPeso(expected)}</span>
          </div>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Closing cash</span>
          <input
            className={styles.input}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={closingCash}
            onChange={(e) => setClosingCash(e.target.value)}
            autoFocus
            required
          />
        </label>

        {variance !== null && (
          <div className={`${styles.varianceRow} ${variance < 0 ? styles.varianceShort : variance > 0 ? styles.varianceOver : ''}`}>
            <span>{variance === 0 ? 'Balanced' : variance < 0 ? 'Short' : 'Over'}</span>
            <span>{formatPeso(Math.abs(variance))}</span>
          </div>
        )}

        <label className={styles.field}>
          <span className={styles.label}>
            Note <span className={styles.optional}>optional</span>
          </span>
          <input className={styles.input} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
        </label>
      </form>
    </Modal>
  );
}

export default CloseShiftModal;
