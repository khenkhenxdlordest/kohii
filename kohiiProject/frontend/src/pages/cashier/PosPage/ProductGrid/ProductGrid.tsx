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
  const [pickingSize, setPickingSize] = useState(false);

  const pick = (size: ProductSize, price: number) => {
    addItem({ productId: product.id, name: product.name, size, unitPrice: price });
    setPickingSize(false);
  };

  const handleClick = () => {
    if (product.prices.length === 0) return;
    if (product.prices.length === 1) {
      pick(product.prices[0].size, product.prices[0].price);
      return;
    }
    setPickingSize((open) => !open);
  };

  if (product.prices.length === 0) return null;

  const lowestPrice = Math.min(...product.prices.map((p) => p.price));

  return (
    <div className={styles.card}>
      <button type="button" className={styles.imageButton} onClick={handleClick}>
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" className={styles.image} />
        ) : (
          <span className={styles.imagePlaceholder}>{product.name.charAt(0)}</span>
        )}
      </button>
      <div className={styles.body}>
        <p className={styles.name}>{product.name}</p>
        <p className={styles.price}>{product.prices.length > 1 ? `From ${formatPeso(lowestPrice)}` : formatPeso(lowestPrice)}</p>
      </div>

      {pickingSize && (
        <div className={styles.sizePicker} role="group" aria-label={`Choose size for ${product.name}`}>
          {product.prices.map(({ size, price }) => (
            <button key={size} type="button" className={styles.sizeOption} onClick={() => pick(size, price)}>
              <span>{sizeLabels[size]}</span>
              <span>{formatPeso(price)}</span>
            </button>
          ))}
        </div>
      )}
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
