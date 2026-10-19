import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { DiscountType, ProductSize } from '../types';
import { CartContext, type CartItem } from './cart.context';

const sameLine = (item: CartItem, productId: number, size: ProductSize) =>
  item.productId === productId && item.size === size;

// Legal na discount rate (RA 9994 / RA 10754): 20% para sa Senior Citizen at PWD
const DISCOUNT_RATES: Record<Exclude<DiscountType, 'CUSTOM'>, number> = { NONE: 0, SENIOR: 20, PWD: 20 };

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>('NONE');
  const [customPercent, setCustomPercent] = useState(0);

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

  const clearCart = useCallback(() => {
    setItems([]);
    setDiscountType('NONE');
    setCustomPercent(0);
  }, []);

  const setDiscount = useCallback((type: DiscountType, percent?: number) => {
    setDiscountType(type);
    if (type === 'CUSTOM') setCustomPercent(clampPercent(percent ?? 0));
  }, []);

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0), [items]);
  const discountPercent = discountType === 'CUSTOM' ? customPercent : DISCOUNT_RATES[discountType];
  const discountAmount = useMemo(
    () => Math.round(subtotal * (discountPercent / 100) * 100) / 100,
    [subtotal, discountPercent],
  );
  const total = useMemo(() => subtotal - discountAmount, [subtotal, discountAmount]);

  const value = useMemo(
    () => ({
      items,
      subtotal,
      discountType,
      discountPercent,
      discountAmount,
      total,
      addItem,
      incrementQty,
      decrementQty,
      removeItem,
      clearCart,
      setDiscount,
    }),
    [items, subtotal, discountType, discountPercent, discountAmount, total, addItem, incrementQty, decrementQty, removeItem, clearCart, setDiscount],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
