import type { CategoryGroup, Product, ProductSize } from '../types';

/** Mga size ng drinks ayon sa menu: Hot (12oz), Iced (16oz), Upsize (22oz) */
export const drinkSizes: ProductSize[] = ['HOT', 'ICED', 'UPSIZE'];

export const sizeLabels: Record<ProductSize, string> = {
  REGULAR: 'Price',
  HOT: 'Hot',
  ICED: 'Iced',
  UPSIZE: 'Upsize',
};

export const sizeOunces: Record<ProductSize, string | null> = {
  REGULAR: null,
  HOT: '12oz',
  ICED: '16oz',
  UPSIZE: '22oz',
};

/** Mga size na puwede sa isang grupo: drinks = Hot/Iced/Upsize, food = isang presyo */
export const sizesFor = (group: CategoryGroup): ProductSize[] => (group === 'DRINKS' ? drinkSizes : ['REGULAR']);

/** Presyo ng isang size, o null kapag hindi ibinebenta sa size na iyon */
export const priceOf = (product: Product, size: ProductSize) =>
  product.prices.find((p) => p.size === size)?.price ?? null;
