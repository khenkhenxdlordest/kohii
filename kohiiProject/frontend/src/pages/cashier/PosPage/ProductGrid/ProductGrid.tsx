import { useState } from 'react';
import type { Product, ProductSize } from '../../../../types';
import { useCart } from '../../../../hooks/useCart';
import { formatPeso } from '../../../../utils/format';
import { sizeLabels } from '../../../../utils/productSizes';
import styles from './ProductGrid.module.css';

interface ProductGridProps {
  products: Product[];
}

function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();

  const baseSizes = product.prices.filter((p) => p.size !== 'UPSIZE');
  const upsizePrice = product.prices.find((p) => p.size === 'UPSIZE');
  const hasOptions = product.prices.length > 1;

  const [selectedSize, setSelectedSize] = useState<ProductSize>(baseSizes[0]?.size ?? product.prices[0]?.size);
  const [upsized, setUpsized] = useState(false);

  if (product.prices.length === 0) return null;

  const basePrice = baseSizes.find((p) => p.size === selectedSize)?.price ?? product.prices[0].price;
  // Ang Upsize (22oz) ay palugit lang ng Iced (16oz) — walang Upsize ang Hot
  const canUpsize = selectedSize === 'ICED' && !!upsizePrice;
  const activeSize: ProductSize = upsized && canUpsize ? 'UPSIZE' : selectedSize;
  const activePrice = upsized && canUpsize ? upsizePrice!.price : basePrice;
  const icedPrice = baseSizes.find((p) => p.size === 'ICED')?.price ?? 0;
  const upsizeDelta = upsizePrice ? upsizePrice.price - icedPrice : 0;

  const handleAdd = () => {
    addItem({ productId: product.id, name: product.name, size: activeSize, unitPrice: activePrice, categoryGroup: product.category.group });
  };

  const lowestPrice = Math.min(...product.prices.map((p) => p.price));

  return (
    <div className={styles.card}>
      <button type="button" className={styles.imageButton} onClick={hasOptions ? undefined : handleAdd}>
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" className={styles.image} />
        ) : (
          <span className={styles.imagePlaceholder}>{product.name.charAt(0)}</span>
        )}
      </button>
      <div className={styles.body}>
        <p className={styles.name}>{product.name}</p>

        {hasOptions ? (
          <>
            <select
              className={styles.sizeSelect}
              value={selectedSize}
              onChange={(e) => {
                setSelectedSize(e.target.value as ProductSize);
                setUpsized(false);
              }}
              aria-label={`Size for ${product.name}`}
            >
              {baseSizes.map((p) => (
                <option key={p.size} value={p.size}>
                  {sizeLabels[p.size]} — {formatPeso(p.price)}
                </option>
              ))}
            </select>

            {canUpsize && (
              <button
                type="button"
                className={`${styles.upsizeButton} ${upsized ? styles.upsizeActive : ''}`}
                aria-pressed={upsized}
                onClick={() => setUpsized((v) => !v)}
              >
                Upsize +{formatPeso(upsizeDelta)}
              </button>
            )}

            <button type="button" className={styles.addButton} onClick={handleAdd}>
              Add — {formatPeso(activePrice)}
            </button>
          </>
        ) : (
          <p className={styles.price}>{formatPeso(lowestPrice)}</p>
        )}
      </div>
    </div>
  );
}

function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return <p className={styles.empty}>No products here yet.</p>;
  }

  return (
    <div className={styles.grid}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export default ProductGrid;
