import { createContext } from 'react';
import type { ProductSize } from '../types';

export interface CartItem {
  productId: number;
  name: string;
  size: ProductSize;
  unitPrice: number;
  qty: number;
}

export interface CartContextValue {
  items: CartItem[];
  subtotal: number;
  addItem: (item: Omit<CartItem, 'qty'>) => void;
  incrementQty: (productId: number, size: ProductSize) => void;
  decrementQty: (productId: number, size: ProductSize) => void;
  removeItem: (productId: number, size: ProductSize) => void;
  clearCart: () => void;
}

export const CartContext = createContext<CartContextValue | null>(null);
