import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { ProductSize } from '../types';
import { CartContext, type CartItem } from './cart.context';

const sameLine = (item: CartItem, productId: number, size: ProductSize) =>
  item.productId === productId && item.size === size;

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((item: Omit<CartItem, 'qty'>) => {
    setItems((current) => {
      const existing = current.find((i) => sameLine(i, item.productId, item.size));
      if (existing) {
        return current.map((i) => (sameLine(i, item.productId, item.size) ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...current, { ...item, qty: 1 }];
    });
  }, []);

  const incrementQty = useCallback((productId: number, size: ProductSize) => {
    setItems((current) =>
      current.map((i) => (sameLine(i, productId, size) ? { ...i, qty: i.qty + 1 } : i)),
    );
  }, []);

  const decrementQty = useCallback((productId: number, size: ProductSize) => {
    setItems((current) =>
      current
        .map((i) => (sameLine(i, productId, size) ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0),
    );
  }, []);

  const removeItem = useCallback((productId: number, size: ProductSize) => {
    setItems((current) => current.filter((i) => !sameLine(i, productId, size)));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0), [items]);

  const value = useMemo(
    () => ({ items, subtotal, addItem, incrementQty, decrementQty, removeItem, clearCart }),
    [items, subtotal, addItem, incrementQty, decrementQty, removeItem, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
