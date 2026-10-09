import { useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent } from 'react';
import styles from './ProductsPage.module.css';

import Button from '../../../components/ui/Button/Button';
import Icon from '../../../components/ui/Icon/Icon';
import StatusBadge from '../../../components/ui/StatusBadge/StatusBadge';
import DataTable, { type DataTableAction, type DataTableColumn } from '../../../components/ui/DataTable/DataTable';
import { matchesSearch } from '../../../components/ui/DataTable/highlight';
import ProductFormModal from '../../../components/modal/admin/ProductsPage/ProductFormModal/ProductFormModal';
import PriceChangeModal from '../../../components/modal/admin/ProductsPage/PriceChangeModal/PriceChangeModal';
import ManageCategoriesModal from '../../../components/modal/admin/ProductsPage/ManageCategoriesModal/ManageCategoriesModal';
import { getCategories } from '../../../api/categories.api';
import { getProducts, updateProduct } from '../../../api/products.api';
import type { Category, Product } from '../../../types';
import { formatPeso } from '../../../utils/format';
import { categoryGroupLabels, categoryGroupOrder } from '../../../utils/categoryGroups';
import { priceOf, sizeLabels, sizeOunces, sizesFor } from '../../../utils/productSizes';

import plusIcon from '../../../assets/icons/actions/plus.svg';
import editIcon from '../../../assets/icons/actions/edit.svg';
import priceIcon from '../../../assets/icons/actions/price.svg';
import powerIcon from '../../../assets/icons/actions/power.svg';
import searchIcon from '../../../assets/icons/actions/search.svg';
import manageIcon from '../../../assets/icons/actions/manage.svg';
import gripIcon from '../../../assets/icons/actions/grip.svg';
import upIcon from '../../../assets/icons/actions/chevron-up.svg';
import downIcon from '../../../assets/icons/actions/chevron-down.svg';
// Pansamantalang larawan habang wala pang na-a-upload na photo ang product
import samplePhoto from '../../../assets/images/sampleimagemenu/sampleCoffee.png';

type StatusFilter = 'active' | 'inactive' | 'all';

// undefined = sarado; null = bagong product; Product = edit
type FormState = Product | null | undefined;

const ORDER_KEY = 'kohii.productTableOrder';
const ROWS_PER_TABLE = 6;

const typeLabels: Record<Product['type'], string> = {
  MADE: 'Made to order',
  READY_MADE: 'Ready made',
};

// Default na ayos: Drinks, Rice Meals, Snacks; naka-deactivate sa dulo
const defaultOrder = (a: Category, b: Category) =>
  Number(b.isActive) - Number(a.isActive) ||
  categoryGroupOrder.indexOf(a.group) - categoryGroupOrder.indexOf(b.group) ||
  a.name.localeCompare(b.name);

// Naaalala sa browser ang ayos ng mga table (per device lang)
function readSavedOrder(): number[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(ORDER_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'number') : [];
  } catch {
    return [];
  }
}

function saveOrder(order: number[]) {
  try {
    localStorage.setItem(ORDER_KEY, JSON.stringify(order));
  } catch {
    // Hindi mahalaga kung hindi ma-save; babalik lang sa default na ayos
  }
}

function ProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [order, setOrder] = useState<number[]>(readSavedOrder);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);

  const [form, setForm] = useState<FormState>(undefined);
  const [formCategoryId, setFormCategoryId] = useState<number | undefined>(undefined);
  const [priceTarget, setPriceTarget] = useState<Product | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');
  const [preview, setPreview] = useState<{ src: string; top: number; left: number } | null>(null);

  // Lumulutang na malaking preview ng thumbnail kapag hinover ang product photo
  const showPreview = (e: MouseEvent<HTMLImageElement>, src: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPreview({ src, top: rect.bottom + 8, left: rect.left });
  };

  // Kinukuha lahat nang isang beses; maliit lang ang menu kaya sa browser na lang ang filter
  useEffect(() => {
    let ignore = false;
    Promise.all([getProducts({ includeInactive: true }), getCategories(true)])
      .then(([productList, categoryList]) => {
        if (ignore) return;
        setProducts(productList);
        setCategories(categoryList);
      })
      .catch((err: Error) => {
        if (!ignore) setLoadError(err.message);
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  // Isang table bawat category; kasama ang inactive na category kung may laman pa.
  // Sinusunod ang naka-save na ayos; ang bago o hindi pa naaayos ay sa dulo.
  const sections = useMemo(() => {
    const visible = categories.filter((c) => c.isActive || (products ?? []).some((p) => p.categoryId === c.id));
    const rank = (c: Category) => {
      const index = order.indexOf(c.id);
      return index === -1 ? Number.MAX_SAFE_INTEGER : index;
    };
    return visible.sort((a, b) => rank(a) - rank(b) || defaultOrder(a, b));
  }, [categories, products, order]);

  const rowsFor = (categoryId: number) =>
    (products ?? []).filter(
      (p) => p.categoryId === categoryId && (statusFilter === 'all' || p.isActive === (statusFilter === 'active')),
    );

  const query = search.trim();
  // Kapag may search, itinatago ang table na walang tumama
  const shownSections = query
    ? sections.filter((c) => rowsFor(c.id).some((p) => matchesSearch(p.name, query)))
    : sections;

  const countIn = (categoryId: number) =>
    (products ?? []).filter((p) => p.categoryId === categoryId && p.isActive).length;

  // FLIP animation: tinatandaan ang pwesto ng bawat table bago mag-sort,
  // tapos pinapadulas mula sa lumang pwesto papunta sa bago. Hindi gumagalaw ang page.
  const sectionRefs = useRef(new Map<number, HTMLElement>());
  const previousTops = useRef<Map<number, number> | null>(null);

  useLayoutEffect(() => {
    const before = previousTops.current;
    previousTops.current = null;
    if (!before || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    sectionRefs.current.forEach((el, id) => {
      const oldTop = before.get(id);
      if (oldTop === undefined) return;
      const delta = oldTop - el.getBoundingClientRect().top;
      if (Math.abs(delta) < 1) return;
      el.animate([{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }], {
        duration: 380,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      });
    });
  }, [order]);

  const applyOrder = (ids: number[]) => {
    const tops = new Map<number, number>();
    sectionRefs.current.forEach((el, id) => tops.set(id, el.getBoundingClientRect().top));
    previousTops.current = tops;
    setOrder(ids);
    saveOrder(ids);
  };

  /** Pill sa itaas: iniaakyat ang table sa unang pwesto */
  const moveToTop = (categoryId: number) => {
    const ids = sections.map((c) => c.id);
    if (ids[0] === categoryId) return;
    applyOrder([categoryId, ...ids.filter((id) => id !== categoryId)]);
  };

  const moveBy = (categoryId: number, step: -1 | 1) => {
    const ids = sections.map((c) => c.id);
    const from = ids.indexOf(categoryId);
    const to = from + step;
    if (from === -1 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    applyOrder(ids);
  };

  const moveTo = (sourceId: number, targetId: number) => {
    if (sourceId === targetId) return;
    const ids = sections.map((c) => c.id).filter((id) => id !== sourceId);
    ids.splice(ids.indexOf(targetId), 0, sourceId);
    applyOrder(ids);
  };

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, categoryId: number) => {
    setDragId(categoryId);
    event.dataTransfer.effectAllowed = 'move';
    // Ang buong table ang makikitang hinihila, hindi lang ang hawakan
    const section = event.currentTarget.closest('section');
    if (section) event.dataTransfer.setDragImage(section, 24, 24);
  };

  const endDrag = () => {
    setDragId(null);
    setDropTargetId(null);
  };

  const retry = () => {
    setLoadError('');
    setProducts(null);
    setReloadKey((k) => k + 1);
  };

  const replaceProduct = (saved: Product) => {
    setProducts((list) => {
      const current = list ?? [];
      return current.some((p) => p.id === saved.id)
        ? current.map((p) => (p.id === saved.id ? saved : p))
        : [...current, saved];
    });
  };

  // Kapag pinalitan ang pangalan ng category, sinasabay ang pangalan sa mga product
  const handleCategoriesChange = (next: Category[]) => {
    setCategories(next);
    setProducts(
      (list) =>
        list?.map((p) => {
          const category = next.find((c) => c.id === p.categoryId);
          return category ? { ...p, category: { id: category.id, name: category.name, group: category.group } } : p;
        }) ?? null,
    );
  };

  const openAddForm = (categoryId?: number) => {
    setFormCategoryId(categoryId);
    setForm(null);
  };

  const setActive = async (product: Product, isActive: boolean) => {
    setActionError('');
    setBusyId(product.id);
    try {
      replaceProduct(await updateProduct(product.id, { isActive }));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update the product.');
    } finally {
      setBusyId(null);
    }
  };

  const columnsFor = (category: Category): DataTableColumn<Product>[] => {
    // Drinks: Hot / Iced / Upsize na column. Food: isang Price
    const priceColumns: DataTableColumn<Product>[] = sizesFor(category.group).map((size) => ({
      key: `price-${size}`,
      header: sizeOunces[size] ? `${sizeLabels[size]} ${sizeOunces[size]}` : sizeLabels[size],
      width: 120,
      align: 'right',
      sortValue: (p) => priceOf(p, size),
      render: (p) => {
        const value = priceOf(p, size);
        return value === null ? (
          <span className={styles.noUpsize}>None</span>
        ) : (
          <span className={styles.price}>{formatPeso(value)}</span>
        );
      },
    }));
    return [
      {
        key: 'name',
        header: 'Product',
        searchValue: (p) => p.name,
        render: (p, highlight) => (
          <div className={styles.nameCell}>
            <img
              className={styles.thumb}
              src={p.imageUrl ?? samplePhoto}
              alt=""
              onMouseEnter={(e) => showPreview(e, p.imageUrl ?? samplePhoto)}
              onMouseLeave={() => setPreview(null)}
            />
            <div>
              <span className={styles.name}>{highlight(p.name)}</span>
              <span className={styles.type}>{typeLabels[p.type]}</span>
            </div>
          </div>
        ),
      },
      ...priceColumns,
      { key: 'status', header: 'Status', width: 130, render: (p) => <StatusBadge active={p.isActive} /> },
    ];
  };

  const actions: DataTableAction<Product>[] = [
    { id: 'edit', label: 'Edit', icon: editIcon, onClick: (p) => setForm(p) },
    { id: 'price', label: 'Change price', icon: priceIcon, tone: 'success', onClick: (p) => setPriceTarget(p) },
    {
      id: 'deactivate',
      label: 'Deactivate',
      icon: powerIcon,
      tone: 'danger',
      hidden: (p) => !p.isActive,
      onClick: (p) => setActive(p, false),
    },
    {
      id: 'activate',
      label: 'Activate',
      icon: powerIcon,
      tone: 'success',
      hidden: (p) => p.isActive,
      onClick: (p) => setActive(p, true),
    },
  ];

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Products</h1>
          <p className={styles.subtitle}>One table per category. Drag the handle or use the arrows to reorder.</p>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="secondary"
            icon={manageIcon}
            onClick={() => setManageOpen(true)}
            disabled={products === null}
          >
            Manage Categories
          </Button>
          <Button icon={plusIcon} onClick={() => openAddForm()} disabled={products === null || sections.length === 0}>
            Add product
          </Button>
        </div>
      </header>

      {loadError ? (
        <div className={styles.state}>
          <p>{loadError}</p>
          <Button variant="secondary" size="sm" onClick={retry}>
            Try again
          </Button>
        </div>
      ) : products === null ? (
        <p className={styles.state}>Loading products...</p>
      ) : sections.length === 0 ? (
        <div className={styles.state}>
          <p>No categories yet. Add one first, e.g. Coffee or Rice Meals.</p>
          <Button size="sm" icon={manageIcon} onClick={() => setManageOpen(true)}>
            Manage Categories
          </Button>
        </div>
      ) : (
        <>
          {/* Nakadikit sa itaas habang nag-i-scroll para laging abot ang search */}
          <div className={styles.toolbar}>
            <label className={styles.search}>
              <Icon src={searchIcon} size={18} />
              <span className={styles.srOnly}>Search all products</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search all products"
              />
            </label>

            <div className={styles.segmented} role="group" aria-label="Status">
              {(['active', 'inactive', 'all'] as StatusFilter[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={statusFilter === value ? styles.segmentActive : ''}
                  aria-pressed={statusFilter === value}
                  onClick={() => setStatusFilter(value)}
                >
                  {value === 'all' ? 'All' : value === 'active' ? 'Active' : 'Inactive'}
                </button>
              ))}
            </div>

            {/* Sorting lang: iniaakyat ang napiling table sa itaas, hindi gumagalaw ang page */}
            <div className={styles.sortPills} role="group" aria-label="Move a category table to the top">
              <span className={styles.sortLabel}>Show first:</span>
              {sections.map((category, index) => (
                <button
                  key={category.id}
                  type="button"
                  className={`${styles.sortPill} ${index === 0 ? styles.sortPillFirst : ''}`}
                  aria-pressed={index === 0}
                  onClick={() => moveToTop(category.id)}
                >
                  <span className={`${styles.groupDot} ${styles[category.group]}`} aria-hidden="true" />
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {actionError && (
            <p className={styles.alert} role="alert">
              {actionError}
            </p>
          )}

          {shownSections.length === 0 && <p className={styles.state}>No products match "{query}".</p>}

          <div className={styles.sections}>
            {shownSections.map((category) => {
              const index = sections.indexOf(category);
              const isDragging = dragId === category.id;
              const isDropTarget = dropTargetId === category.id && dragId !== null && dragId !== category.id;

              return (
                <section
                  key={category.id}
                  ref={(el) => {
                    if (el) sectionRefs.current.set(category.id, el);
                    else sectionRefs.current.delete(category.id);
                  }}
                  className={`${styles.categorySection} ${isDragging ? styles.dragging : ''} ${isDropTarget ? styles.dropTarget : ''}`}
                  aria-labelledby={`category-title-${category.id}`}
                  onDragOver={(e) => {
                    if (dragId === null) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dropTargetId !== category.id) setDropTargetId(category.id);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragId !== null) moveTo(dragId, category.id);
                    endDrag();
                  }}
                >
                  <header className={styles.sectionHeader}>
                    <button
                      type="button"
                      className={styles.dragHandle}
                      draggable
                      onDragStart={(e) => handleDragStart(e, category.id)}
                      onDragEnd={endDrag}
                      aria-label={`Drag to reorder ${category.name}`}
                      title="Drag to reorder"
                    >
                      <Icon src={gripIcon} size={18} />
                    </button>

                    <div className={styles.sectionTitleWrap}>
                      <h2 id={`category-title-${category.id}`} className={styles.sectionTitle}>
                        <span className={`${styles.groupDot} ${styles[category.group]}`} aria-hidden="true" />
                        {category.name}
                        {!category.isActive && <span className={styles.inactiveTag}>Inactive</span>}
                      </h2>
                      <p className={styles.sectionMeta}>
                        {countIn(category.id)} active · {categoryGroupLabels[category.group]}
                        {category.group === 'DRINKS' ? ' · hot, iced, upsize' : ''}
                      </p>
                    </div>

                    <div className={styles.sectionActions}>
                      <div className={styles.moveButtons}>
                        <button
                          type="button"
                          className={styles.moveButton}
                          onClick={() => moveBy(category.id, -1)}
                          disabled={index === 0}
                          aria-label={`Move ${category.name} up`}
                          title="Move up"
                        >
                          <Icon src={upIcon} size={16} />
                        </button>
                        <button
                          type="button"
                          className={styles.moveButton}
                          onClick={() => moveBy(category.id, 1)}
                          disabled={index === sections.length - 1}
                          aria-label={`Move ${category.name} down`}
                          title="Move down"
                        >
                          <Icon src={downIcon} size={16} />
                        </button>
                      </div>
                      {category.isActive && (
                        <Button variant="secondary" size="sm" icon={plusIcon} onClick={() => openAddForm(category.id)}>
                          Add
                        </Button>
                      )}
                    </div>
                  </header>

                  <DataTable
                    rows={rowsFor(category.id)}
                    columns={columnsFor(category)}
                    actions={actions}
                    getRowId={(p) => p.id}
                    searchTerm={search}
                    isRowMuted={(p) => !p.isActive}
                    busyRowId={busyId}
                    pageSize={ROWS_PER_TABLE}
                    emptyMessage={
                      statusFilter === 'active' && countIn(category.id) === 0
                        ? `No ${category.name.toLowerCase()} yet.`
                        : 'No products match your filters.'
                    }
                  />
                </section>
              );
            })}
          </div>
        </>
      )}

      {form !== undefined && (
        <ProductFormModal
          product={form}
          categories={categories}
          defaultCategoryId={formCategoryId}
          onClose={() => setForm(undefined)}
          onSaved={(saved) => {
            replaceProduct(saved);
            setForm(undefined);
          }}
        />
      )}

      {priceTarget && (
        <PriceChangeModal
          product={priceTarget}
          onClose={() => setPriceTarget(null)}
          onSaved={(saved) => {
            replaceProduct(saved);
            setPriceTarget(null);
          }}
        />
      )}

      {manageOpen && (
        <ManageCategoriesModal
          categories={categories}
          onClose={() => setManageOpen(false)}
          onCategoriesChange={handleCategoriesChange}
        />
      )}

      {preview && (
        <img
          className={styles.hoverPreview}
          src={preview.src}
          alt=""
          style={{ top: preview.top, left: preview.left }}
        />
      )}
    </section>
  );
}

export default ProductsPage;
