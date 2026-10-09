import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import Modal from '../../../Modal/Modal';
import Button from '../../../../ui/Button/Button';
import styles from './ProductFormModal.module.css';

import { createProduct, updateProduct, uploadProductImage } from '../../../../../api/products.api';
import type { Category, Product, ProductSize, ProductType } from '../../../../../types';
import { categoryGroupLabels, categoryGroupOrder } from '../../../../../utils/categoryGroups';
import { sizeLabels, sizeOunces, sizesFor } from '../../../../../utils/productSizes';

interface ProductFormModalProps {
  /** null = bagong product; may laman = edit */
  product: Product | null;
  categories: Category[];
  /** Para sa bagong product: ang category ng bukas na tab sa ProductsPage */
  defaultCategoryId?: number;
  onClose: () => void;
  onSaved: (product: Product) => void;
}

const typeOptions: { value: ProductType; label: string; hint: string }[] = [
  { value: 'MADE', label: 'Made to order', hint: 'Prepared from a recipe, e.g. Iced Latte' },
  { value: 'READY_MADE', label: 'Ready made', hint: 'Bought and resold as is, e.g. cookies' },
];

// Ginagamit lang sa ProductsPage. Ang presyo ay sa pag-add lang; ang pagpapalit ay sa PriceChangeModal.
function ProductFormModal({ product, categories, defaultCategoryId, onClose, onSaved }: ProductFormModalProps) {
  const isEdit = product !== null;
  const activeCategories = categories.filter((c) => c.isActive || c.id === product?.categoryId);
  const firstCategory = activeCategories.find((c) => c.id === defaultCategoryId && c.isActive) ?? activeCategories[0];

  const [name, setName] = useState(product?.name ?? '');
  const [categoryId, setCategoryId] = useState(String(product?.categoryId ?? firstCategory?.id ?? ''));
  const [type, setType] = useState<ProductType>(product?.type ?? 'MADE');
  // Presyo bawat size; blangko = hindi ibinebenta sa size na iyon
  const [prices, setPrices] = useState<Partial<Record<ProductSize, string>>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Larawan: tinatanggal ang background sa browser bago i-preview at i-save
  const [imagePreview, setImagePreview] = useState<string | null>(product?.imageUrl ?? null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removingBg, setRemovingBg] = useState(false);
  const [bgProgress, setBgProgress] = useState<number | null>(null);
  const [imageError, setImageError] = useState('');

  useEffect(() => {
    return () => {
      if (imageFile && imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imageFile, imagePreview]);

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    setImageError('');
    setRemovingBg(true);
    setBgProgress(0);
    try {
      const { removeBackground } = await import('@imgly/background-removal');
      const blob = await removeBackground(picked, {
        // Mas maliit na model para mas mabilis ang unang download sa browser
        model: 'isnet_quint8',
        progress: (_key, current, total) => setBgProgress(total ? Math.round((current / total) * 100) : null),
      });
      const file = new File([blob], `${picked.name.replace(/\.[^.]+$/, '')}.png`, { type: 'image/png' });
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } catch {
      setImageError('Could not remove the background. Please check your connection and try again.');
    } finally {
      setRemovingBg(false);
      setBgProgress(null);
    }
  };

  const selectedGroup = activeCategories.find((c) => c.id === Number(categoryId))?.group;
  const isDrink = selectedGroup === 'DRINKS';
  const sizes = selectedGroup ? sizesFor(selectedGroup) : [];
  // Magkaiba ang presyo ng drinks at food, kaya hindi puwedeng ilipat sa ibang uri
  const switchesKind = isEdit && selectedGroup !== undefined && isDrink !== (product.category.group === 'DRINKS');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const entered = sizes.filter((size) => prices[size]?.trim()).map((size) => ({ size, price: Number(prices[size]) }));
    if (!isEdit && isDrink && !entered.some((p) => p.size === 'HOT' || p.size === 'ICED')) {
      setError('Enter a Hot or Iced price.');
      return;
    }
    setSaving(true);
    try {
      let saved = isEdit
        ? await updateProduct(product.id, { name, categoryId: Number(categoryId), type })
        : await createProduct({ name, categoryId: Number(categoryId), type, prices: entered });
      if (imageFile) saved = await uploadProductImage(saved.id, imageFile);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the product.');
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title={isEdit ? 'Edit product' : 'New product'}
      description={
        isEdit ? 'To change the price, use Change price instead.' : 'Add a drink, rice meal or snack to the menu.'
      }
      onClose={onClose}
      width={520}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" loading={saving}>
            {isEdit ? 'Save changes' : 'Add product'}
          </Button>
        </>
      }
    >
      <form id="product-form" className={styles.form} onSubmit={handleSubmit}>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="product-name">
            Product name
          </label>
          <input
            id="product-name"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Iced Spanish Latte"
            maxLength={80}
            autoFocus
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="product-image">
            Photo
          </label>
          <div className={styles.imagePicker}>
            <div className={styles.imagePreview}>
              {imagePreview ? (
                <img src={imagePreview} alt="" />
              ) : (
                <span className={styles.imagePlaceholder}>No photo</span>
              )}
            </div>
            <label className={styles.imageButton}>
              {removingBg
                ? `Removing background${bgProgress !== null ? ` (${bgProgress}%)` : '…'}`
                : imagePreview
                  ? 'Change photo'
                  : 'Add photo'}
              <input
                id="product-image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={removingBg}
              />
            </label>
          </div>
          {imageError && <p className={styles.warning}>{imageError}</p>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="product-category">
            Category
          </label>
          <select
            id="product-category"
            className={styles.input}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
          >
            {activeCategories.length === 0 && <option value="">Add a category first</option>}
            {categoryGroupOrder.map((group) => {
              const inGroup = activeCategories.filter((c) => c.group === group);
              if (inGroup.length === 0) return null;
              return (
                <optgroup key={group} label={categoryGroupLabels[group]}>
                  {inGroup.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          {switchesKind && (
            <p className={styles.warning}>
              Drinks and food are priced differently. Choose a category of the same kind.
            </p>
          )}
        </div>

        {!isEdit && sizes.length > 0 && (
          <div className={styles.priceRow}>
            {sizes.map((size) => (
              <div key={size} className={styles.field}>
                <label className={styles.label} htmlFor={`price-${size}`}>
                  {sizeLabels[size]}
                  {sizeOunces[size] && <span className={styles.optional}> {sizeOunces[size]}</span>}
                </label>
                <input
                  id={`price-${size}`}
                  className={styles.input}
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={prices[size] ?? ''}
                  onChange={(e) => setPrices((p) => ({ ...p, [size]: e.target.value }))}
                  placeholder={isDrink ? 'None' : '0.00'}
                  required={!isDrink}
                />
              </div>
            ))}
          </div>
        )}

        <fieldset className={styles.typeGroup}>
          <legend className={styles.label}>Type</legend>
          {typeOptions.map((option) => (
            <label
              key={option.value}
              className={`${styles.typeOption} ${type === option.value ? styles.typeOptionActive : ''}`}
            >
              <input
                type="radio"
                name="product-type"
                value={option.value}
                checked={type === option.value}
                onChange={() => setType(option.value)}
              />
              <span>
                <span className={styles.typeLabel}>{option.label}</span>
                <span className={styles.typeHint}>{option.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </form>
    </Modal>
  );
}

export default ProductFormModal;
