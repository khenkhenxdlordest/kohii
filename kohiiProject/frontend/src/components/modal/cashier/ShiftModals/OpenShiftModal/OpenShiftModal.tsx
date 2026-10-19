import { useState, type FormEvent } from 'react';
import Modal from '../../../Modal/Modal';
import Button from '../../../../ui/Button/Button';
import styles from './OpenShiftModal.module.css';

import { openShift } from '../../../../../api/shifts.api';
import type { Shift } from '../../../../../types';

import shiftIcon from '../../../../../assets/icons/sidebar/pos.svg';

interface OpenShiftModalProps {
  onClose: () => void;
  onDone: (shift: Shift) => void;
}

function OpenShiftModal({ onClose, onDone }: OpenShiftModalProps) {
  const [openingCash, setOpeningCash] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const amount = Number(openingCash);
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Enter a valid opening cash amount.');
      return;
    }
    setSaving(true);
    try {
      const shift = await openShift(amount);
      onDone(shift);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the shift.');
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      icon={shiftIcon}
      title="Open Shift"
      onClose={onClose}
      width={420}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="open-shift-form" loading={saving}>
            Open Shift
          </Button>
        </>
      }
    >
      <form id="open-shift-form" className={styles.form} onSubmit={handleSubmit}>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <label className={styles.field}>
          <span className={styles.label}>Opening cash</span>
          <input
            className={styles.input}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={openingCash}
            onChange={(e) => setOpeningCash(e.target.value)}
            autoFocus
            required
          />
        </label>
      </form>
    </Modal>
  );
}

export default OpenShiftModal;
