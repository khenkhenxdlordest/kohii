import { useEffect, useMemo, useState } from 'react';
import { getCategories } from '../../../api/categories.api';
import { getProducts } from '../../../api/products.api';
import type { Category, Product } from '../../../types';
import { CartProvider } from '../../../context/CartProvider';
import { useShift } from '../../../hooks/useShift';
import Button from '../../../components/ui/Button/Button';
import OpenShiftModal from '../../../components/modal/cashier/ShiftModals/OpenShiftModal/OpenShiftModal';
import CategoryTabs from './CategoryTabs/CategoryTabs';
import ProductGrid from './ProductGrid/ProductGrid';
import CartPanel from './CartPanel/CartPanel';
import styles from './PosPage.module.css';

function PosPage() {
  const { shift, loading: shiftLoading, refresh: refreshShift } = useShift();
  const [openModalOpen, setOpenModalOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!shift) return;
    let ignore = false;
    Promise.all([getCategories(), getProducts()])
      .then(([categoryList, productList]) => {
        if (ignore) return;
        setCategories(categoryList);
        setProducts(productList);
      })
      .catch((err: Error) => {
        if (!ignore) setLoadError(err.message);
      });
    return () => {
      ignore = true;
    };
  }, [shift]);

  const visibleProducts = useMemo(
    () =>
      products.filter((p) => p.isActive && (activeCategoryId === null || p.categoryId === activeCategoryId)),
    [products, activeCategoryId],
  );

  if (shiftLoading) return null;

  if (!shift) {
    return (
      <section className={styles.gate}>
        <h1 className={styles.title}>Point of Sale</h1>
        <div className={styles.gateCard}>
          <Button onClick={() => setOpenModalOpen(true)}>Open Shift</Button>
        </div>

        {openModalOpen && (
          <OpenShiftModal
            onClose={() => setOpenModalOpen(false)}
            onDone={() => {
              refreshShift();
              setOpenModalOpen(false);
            }}
          />
        )}
      </section>
    );
  }

  return (
    <CartProvider>
      <section className={styles.page}>
        <div className={styles.main}>
          <h1 className={styles.title}>Point of Sale</h1>
          <CategoryTabs categories={categories} activeId={activeCategoryId} onSelect={setActiveCategoryId} />

          {loadError ? (
            <p className={styles.state}>{loadError}</p>
          ) : (
            <div className={styles.grid}>
              <ProductGrid products={visibleProducts} />
            </div>
          )}
        </div>

        <CartPanel />
      </section>
    </CartProvider>
  );
}

export default PosPage;
