import type { DiscountType, Order, PaymentMethod, ProductSize } from '../types';
import { apiRequest } from './client';

export interface CreateOrderInput {
  items: { productId: number; size: ProductSize; qty: number }[];
  paymentMethod: PaymentMethod;
  discountType: DiscountType;
  discountPercent?: number;
  amountTendered?: number;
  referenceNo?: string;
}

export function createOrder(input: CreateOrderInput) {
  return apiRequest<Order>('/orders', { method: 'POST', body: JSON.stringify(input) });
}
