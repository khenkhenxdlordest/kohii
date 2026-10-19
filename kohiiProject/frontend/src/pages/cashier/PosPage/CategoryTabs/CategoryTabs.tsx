import type { Category } from '../../../../types';
import styles from './CategoryTabs.module.css';

interface CategoryTabsProps {
  categories: Category[];
  activeId: number | null;
  onSelect: (id: number | null) => void;
}

function CategoryTabs({ categories, activeId, onSelect }: CategoryTabsProps) {
  return (
    <div className={styles.row} role="tablist" aria-label="Product category">
      <button
        type="button"
        role="tab"
        aria-selected={activeId === null}
        className={`${styles.card} ${activeId === null ? styles.active : ''}`}
        onClick={() => onSelect(null)}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          role="tab"
          aria-selected={activeId === category.id}
          className={`${styles.card} ${activeId === category.id ? styles.active : ''}`}
          onClick={() => onSelect(category.id)}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}

export default CategoryTabs;
