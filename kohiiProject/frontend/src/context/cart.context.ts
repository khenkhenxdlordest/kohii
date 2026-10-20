import { createContext } from 'react';
import type { CategoryGroup, DiscountType, ProductSize } from '../types';

export interface CartItem {
  productId: number;
  name: string;
  size: ProductSize;
  unitPrice: number;
  qty: number;
  /** Para malaman kung aling preset remarks chips ang ipapakita (hal. RICE_MEALS vs DRINKS) */
  categoryGroup: CategoryGroup;
  remarks?: string;
}

export interface CartContextValue {
  items: CartItem[];
  subtotal: number;
  discountType: DiscountType;
  discountPercent: number;
  discountAmount: number;
  total: number;
  addItem: (item: Omit<CartItem, 'qty'>) => void;
  incrementQty: (productId: number, size: ProductSize) => void;
  decrementQty: (productId: number, size: ProductSize) => void;
  removeItem: (productId: number, size: ProductSize) => void;
  updateRemarks: (productId: number, size: ProductSize, remarks: string) => void;
  clearCart: () => void;
  setDiscount: (type: DiscountType, customPercent?: number) => void;
}

export const CartContext = createContext<CartContextValue | null>(null);
