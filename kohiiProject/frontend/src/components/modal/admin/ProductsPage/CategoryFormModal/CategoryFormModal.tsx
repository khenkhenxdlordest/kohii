import { useState, type FormEvent } from 'react';
import Modal from '../../../Modal/Modal';
import Button from '../../../../ui/Button/Button';
import styles from './CategoryFormModal.module.css';

import { createCategory, updateCategory } from '../../../../../api/categories.api';
import type { Category, CategoryGroup } from '../../../../../types';
import { categoryGroupHints, categoryGroupLabels, categoryGroupOrder } from '../../../../../utils/categoryGroups';

interface CategoryFormModalProps {
  /** null = bagong category; may laman = edit */
  category: Category | null;
  onClose: () => void;
  onSaved: (category: Category) => void;
}

// Ginagamit lang sa CategoriesPage. Naka-mount lang habang bukas, kaya laging bago ang form.
function CategoryFormModal({ category, onClose, onSaved }: CategoryFormModalProps) {
  const [name, setName] = useState(category?.name ?? '');
  const [group, setGroup] = useState<CategoryGroup>(category?.group ?? 'DRINKS');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isEdit = category !== null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const saved = isEdit ? await updateCategory(category.id, { name, group }) : await createCategory(name, group);
      onSaved({ ...saved, productCount: category?.productCount ?? 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the category.');
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title={isEdit ? 'Edit category' : 'New category'}
      description="Categories group products on the menu and in the POS."
      onClose={onClose}
      width={480}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="category-form" loading={saving}>
            {isEdit ? 'Save changes' : 'Add category'}
          </Button>
        </>
      }
    >
      <form id="category-form" className={styles.form} onSubmit={handleSubmit}>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="category-name">
            Category name
          </label>
          <input
            id="category-name"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Non-Coffee"
            maxLength={50}
            autoFocus
            required
          />
        </div>

        <fieldset className={styles.groupList}>
          <legend className={styles.label}>Menu group</legend>
          {categoryGroupOrder.map((value) => (
            <label key={value} className={`${styles.groupOption} ${group === value ? styles.groupOptionActive : ''}`}>
              <input
                type="radio"
                name="category-group"
                value={value}
                checked={group === value}
                onChange={() => setGroup(value)}
              />
              <span>
                <span className={styles.groupLabel}>{categoryGroupLabels[value]}</span>
                <span className={styles.groupHint}>{categoryGroupHints[value]}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </form>
    </Modal>
  );
}

export default CategoryFormModal;
