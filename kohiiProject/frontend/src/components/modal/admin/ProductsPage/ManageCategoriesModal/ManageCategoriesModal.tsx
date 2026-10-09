import { useMemo, useState } from 'react';
import Modal from '../../../Modal/Modal';
import Button from '../../../../ui/Button/Button';
import Icon from '../../../../ui/Icon/Icon';
import ActionButton from '../../../../ui/ActionButton/ActionButton';
import CategoryFormModal from '../CategoryFormModal/CategoryFormModal';
import styles from './ManageCategoriesModal.module.css';

import { updateCategory } from '../../../../../api/categories.api';
import type { Category } from '../../../../../types';
import { categoryGroupLabels, categoryGroupOrder } from '../../../../../utils/categoryGroups';

import manageIcon from '../../../../../assets/icons/actions/manage.svg';
import plusIcon from '../../../../../assets/icons/actions/plus.svg';
import editIcon from '../../../../../assets/icons/actions/edit.svg';
import powerIcon from '../../../../../assets/icons/actions/power.svg';
import searchIcon from '../../../../../assets/icons/actions/search.svg';

interface ManageCategoriesModalProps {
  categories: Category[];
  onClose: () => void;
  /** Tinatawag tuwing may nadagdag o nabago, para ma-update ang tabs sa ProductsPage */
  onCategoriesChange: (categories: Category[]) => void;
}

// undefined = sarado; null = bagong category; Category = edit
type FormState = Category | null | undefined;

const sortCategories = (list: Category[]) =>
  [...list].sort(
    (a, b) => categoryGroupOrder.indexOf(a.group) - categoryGroupOrder.indexOf(b.group) || a.name.localeCompare(b.name),
  );

// Ginagamit lang sa ProductsPage (button na "Manage Categories")
function ManageCategoriesModal({ categories, onClose, onCategoriesChange }: ManageCategoriesModalProps) {
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<FormState>(undefined);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const visible = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return sortCategories(categories).filter((c) => !keyword || c.name.toLowerCase().includes(keyword));
  }, [categories, search]);

  const replace = (saved: Category) => {
    const exists = categories.some((c) => c.id === saved.id);
    onCategoriesChange(
      sortCategories(exists ? categories.map((c) => (c.id === saved.id ? saved : c)) : [...categories, saved]),
    );
  };

  // Ang 2-click rule ay nasa ActionButton; dito na ang pangalawang pindot
  const toggleActive = async (category: Category) => {
    setError('');
    setBusyId(category.id);
    try {
      const updated = await updateCategory(category.id, { isActive: !category.isActive });
      replace({ ...category, ...updated });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the category.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Modal
        open
        icon={manageIcon}
        title="Manage Categories"
        description="Add, rename or deactivate menu categories."
        onClose={onClose}
        width={520}
        footer={
          <Button variant="secondary" className={styles.backButton} onClick={onClose}>
            Back
          </Button>
        }
      >
        <div className={styles.controls}>
          <label className={styles.search}>
            <Icon src={searchIcon} size={16} />
            <span className={styles.srOnly}>Search categories</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search category" />
          </label>
          <Button size="sm" icon={plusIcon} onClick={() => setForm(null)}>
            Add Category
          </Button>
        </div>

        <div className={`${styles.errorSlot} ${error ? styles.errorVisible : ''}`} aria-live="polite">
          <p className={styles.errorText}>{error || ' '}</p>
        </div>

        <ul className={styles.list}>
          {visible.map((category, index) => {
            return (
              <li
                key={category.id}
                className={`${styles.row} ${category.isActive ? '' : styles.inactive}`}
                style={{ animationDelay: `${index * 35}ms` }}
              >
                <span className={`${styles.dot} ${styles[category.group]}`} aria-hidden="true" />
                <div className={styles.meta}>
                  <p className={styles.name}>
                    {category.name}
                    {!category.isActive && <span className={styles.inactiveTag}>Inactive</span>}
                  </p>
                  <p className={styles.count}>
                    {category.productCount} {category.productCount === 1 ? 'product' : 'products'} ·{' '}
                    {categoryGroupLabels[category.group]}
                  </p>
                </div>

                <div className={styles.actions}>
                  {busyId === category.id ? (
                    <span className={styles.spinner} aria-label="Saving" />
                  ) : (
                    <>
                      <ActionButton icon={editIcon} label="Edit" iconSize={17} onConfirm={() => setForm(category)} />
                      <ActionButton
                        icon={powerIcon}
                        label={category.isActive ? 'Deactivate' : 'Activate'}
                        tone={category.isActive ? 'danger' : 'success'}
                        iconSize={17}
                        onConfirm={() => toggleActive(category)}
                      />
                    </>
                  )}
                </div>
              </li>
            );
          })}
          {visible.length === 0 && <li className={styles.empty}>No categories found.</li>}
        </ul>
      </Modal>

      {form !== undefined && (
        <CategoryFormModal
          category={form}
          onClose={() => setForm(undefined)}
          onSaved={(saved) => {
            replace(saved);
            setForm(undefined);
          }}
        />
      )}
    </>
  );
}

export default ManageCategoriesModal;
