import { useMemo, useState } from 'react';
import Modal from '../../../Modal/Modal';
import Button from '../../../../ui/Button/Button';
import { remarksPresets } from '../../../../../utils/remarksPresets';
import type { CategoryGroup } from '../../../../../types';
import styles from './RemarksModal.module.css';

import editIcon from '../../../../../assets/icons/actions/edit.svg';

interface RemarksModalProps {
  itemName: string;
  categoryGroup: CategoryGroup;
  currentRemarks?: string;
  onClose: () => void;
  onSave: (remarks: string) => void;
}

function RemarksModal({ itemName, categoryGroup, currentRemarks, onClose, onSave }: RemarksModalProps) {
  const presets = remarksPresets[categoryGroup];
  const initialParts = useMemo(
    () => (currentRemarks ? currentRemarks.split(',').map((p) => p.trim()).filter(Boolean) : []),
    [currentRemarks],
  );
  const [selected, setSelected] = useState<Set<string>>(new Set(initialParts.filter((p) => presets.includes(p))));
  const [freeText, setFreeText] = useState(initialParts.filter((p) => !presets.includes(p)).join(', '));

  const toggleChip = (chip: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(chip)) next.delete(chip);
      else next.add(chip);
      return next;
    });
  };

  const handleSave = () => {
    const parts = [...selected, ...freeText.split(',').map((p) => p.trim()).filter(Boolean)];
    onSave(parts.join(', '));
    onClose();
  };

  return (
    <Modal
      open
      icon={editIcon}
      title="Remarks"
      description={itemName}
      onClose={onClose}
      width={360}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </>
      }
    >
      {presets.length > 0 && (
        <div className={styles.chips} role="group" aria-label="Preset remarks">
          {presets.map((chip) => (
            <button
              key={chip}
              type="button"
              className={`${styles.chip} ${selected.has(chip) ? styles.chipActive : ''}`}
              aria-pressed={selected.has(chip)}
              onClick={() => toggleChip(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      <label className={styles.fieldLabel} htmlFor="remarks-free-text">
        Other notes
      </label>
      <textarea
        id="remarks-free-text"
        className={styles.textarea}
        placeholder="Type any other note here"
        rows={3}
        value={freeText}
        onChange={(e) => setFreeText(e.target.value)}
      />
    </Modal>
  );
}

export default RemarksModal;
