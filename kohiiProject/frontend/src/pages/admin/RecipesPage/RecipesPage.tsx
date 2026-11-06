import { useEffect, useState } from 'react';
import styles from './RecipesPage.module.css';

import Icon from '../../../components/ui/Icon/Icon';
import DataTable, { type DataTableAction, type DataTableColumn } from '../../../components/ui/DataTable/DataTable';
import RecipeFormModal from '../../../components/modal/admin/RecipesPage/RecipeFormModal/RecipeFormModal';
import { getRecipes } from '../../../api/recipes.api';
import { getInventoryItems } from '../../../api/inventory.api';
import type { CategoryGroup, InventoryItem, ProductRecipe } from '../../../types';
import { categoryGroupLabels } from '../../../utils/categoryGroups';

import editIcon from '../../../assets/icons/actions/edit.svg';
import searchIcon from '../../../assets/icons/actions/search.svg';

type GroupFilter = 'all' | CategoryGroup;

function RecipesPage() {
  const [products, setProducts] = useState<ProductRecipe[] | null>(null);
  const [ingredients, setIngredients] = useState<InventoryItem[]>([]);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');
  const [editTarget, setEditTarget] = useState<ProductRecipe | null>(null);

  useEffect(() => {
    let ignore = false;
    Promise.all([getRecipes(), getInventoryItems()])
      .then(([recipes, items]) => {
        if (ignore) return;
        setProducts(recipes);
        setIngredients(items);
      })
      .catch((err: Error) => !ignore && setLoadError(err.message));
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const shownProducts = (products ?? []).filter((p) => groupFilter === 'all' || p.category.group === groupFilter);

  const columns: DataTableColumn<ProductRecipe>[] = [
    {
      key: 'name',
      header: 'Product',
      searchValue: (p) => p.name,
      sortValue: (p) => p.name,
      render: (p, highlight) => (
        <>
          <span className={styles.name}>{highlight(p.name)}</span>
          <span className={styles.category}>{p.category.name}</span>
        </>
      ),
    },
    {
      key: 'ingredients',
      header: 'Ingredients',
      width: 140,
      align: 'right',
      sortValue: (p) => p.recipeItems.length,
      render: (p) =>
        p.recipeItems.length === 0 ? (
          <span className={styles.muted}>Not set</span>
        ) : (
          <span className={styles.count}>{p.recipeItems.length}</span>
        ),
    },
  ];

  const actions: DataTableAction<ProductRecipe>[] = [
    { id: 'edit', label: 'Edit recipe', icon: editIcon, onClick: (p) => setEditTarget(p) },
  ];

  const groupOptions: GroupFilter[] = ['all', 'DRINKS', 'RICE_MEALS', 'SNACKS'];

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Recipes</h1>
          <p className={styles.subtitle}>Set the ingredients used per product.</p>
        </div>
      </header>

      {loadError ? (
        <p className={styles.state}>{loadError}</p>
      ) : (
        <>
          <div className={styles.toolbar}>
            <label className={styles.search}>
              <Icon src={searchIcon} size={18} />
              <span className={styles.srOnly}>Search products</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products"
              />
            </label>

            <div className={styles.segmented} role="group" aria-label="Category group">
              {groupOptions.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={groupFilter === value ? styles.segmentActive : ''}
                  aria-pressed={groupFilter === value}
                  onClick={() => setGroupFilter(value)}
                >
                  {value === 'all' ? 'All' : categoryGroupLabels[value]}
                </button>
              ))}
            </div>
          </div>

          <DataTable
            rows={shownProducts}
            columns={columns}
            actions={actions}
            getRowId={(p) => p.id}
            searchTerm={search}
            pageSize={10}
            emptyMessage={products === null ? 'Loading...' : 'No products found.'}
          />
        </>
      )}

      {editTarget && (
        <RecipeFormModal
          product={editTarget}
          ingredients={ingredients}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </section>
  );
}

export default RecipesPage;
