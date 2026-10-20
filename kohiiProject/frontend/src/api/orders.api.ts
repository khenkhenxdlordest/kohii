import type { DiscountType, KitchenQueueOrder, Order, OrderListItem, PaymentMethod, PrepStatus, ProductSize } from '../types';
import { apiRequest } from './client';

export interface CreateOrderInput {
  items: { productId: number; size: ProductSize; qty: number; remarks?: string }[];
  paymentMethod: PaymentMethod;
  discountType: DiscountType;
  discountPercent?: number;
  amountTendered?: number;
  referenceNo?: string;
}

export function createOrder(input: CreateOrderInput) {
  return apiRequest<Order>('/orders', { method: 'POST', body: JSON.stringify(input) });
}

export function getKitchenQueue() {
  return apiRequest<KitchenQueueOrder[]>('/orders/kitchen-queue');
}

export function updateItemPrepStatus(itemId: number, status: Exclude<PrepStatus, 'PENDING'>) {
  return apiRequest<{ id: number; prepStatus: PrepStatus }>(`/orders/items/${itemId}/prep-status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export interface OrderFilters {
  storeId?: number;
  cashierId?: number;
  /** YYYY-MM-DD */
  from?: string;
  /** YYYY-MM-DD */
  to?: string;
  limit?: number;
  includeItems?: boolean;
}

export function getOrders(filters: OrderFilters = {}) {
  const params = new URLSearchParams();
  if (filters.storeId) params.set('storeId', String(filters.storeId));
  if (filters.cashierId) params.set('cashierId', String(filters.cashierId));
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.includeItems) params.set('includeItems', 'true');
  const query = params.toString();
  return apiRequest<OrderListItem[]>(`/orders${query ? `?${query}` : ''}`);
}
