import type {
  EmergencySummary,
  InventoryItem,
  InventoryItemType,
  InventoryUnit,
  StockInSource,
  StockMovement,
  WasteCause,
} from '../types';
import { apiRequest } from './client';

export interface PackInput {
  /** May id = i-update; walang id = bago */
  id?: number;
  label: string;
  size: number;
  isDefault: boolean;
}

export interface CreateItemInput {
  name: string;
  type: InventoryItemType;
  unit: InventoryUnit;
  lowStockThreshold: number;
  packs: PackInput[];
  initialQty?: number;
}

export interface UpdateItemInput {
  name?: string;
  type?: InventoryItemType;
  lowStockThreshold?: number;
  isActive?: boolean;
  /** Buong listahan; ang wala rito ay ide-deactivate */
  packs?: PackInput[];
}

/** Lalagyan × bilang (hal. 2 bote), o eksaktong dami sa unit (hal. 500 ML) */
export type QuantityInput = { packId: number; packCount: number; note?: string } | { qty: number; note?: string };

export type StockInInput = QuantityInput & {
  source: StockInSource;
  supplier?: string;
  /** Halagang ibinayad (placeholder para sa expenses) */
  totalCost?: number;
};

export type WasteInput = QuantityInput & { cause: WasteCause };

interface StockResult {
  item: InventoryItem;
  movementId: number;
}

export function getInventoryItems(includeInactive = false) {
  return apiRequest<InventoryItem[]>(`/inventory/items${includeInactive ? '?includeInactive=true' : ''}`);
}

export function createInventoryItem(data: CreateItemInput) {
  return apiRequest<InventoryItem>('/inventory/items', { method: 'POST', body: JSON.stringify(data) });
}

export function updateInventoryItem(id: number, data: UpdateItemInput) {
  return apiRequest<InventoryItem>(`/inventory/items/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

/** Increment: delivery o emergency purchase */
export function stockIn(id: number, data: StockInInput) {
  return apiRequest<StockResult>(`/inventory/items/${id}/stock-in`, { method: 'POST', body: JSON.stringify(data) });
}

/** Decrement: kinuha ng barista o kitchen */
export function withdrawStock(id: number, data: QuantityInput) {
  return apiRequest<StockResult>(`/inventory/items/${id}/withdraw`, { method: 'POST', body: JSON.stringify(data) });
}

/** Decrement: napanis, expired, natapon, nasira */
export function logWaste(id: number, data: WasteInput) {
  return apiRequest<StockResult>(`/inventory/items/${id}/waste`, { method: 'POST', body: JSON.stringify(data) });
}

export function getMovements(filters: { itemId?: number; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.itemId) params.set('itemId', String(filters.itemId));
  if (filters.limit) params.set('limit', String(filters.limit));
  const query = params.toString();
  return apiRequest<StockMovement[]>(`/inventory/movements${query ? `?${query}` : ''}`);
}

/** Kabuuan ng emergency purchases mula sa unang araw ng buwan */
export function getEmergencySummary() {
  return apiRequest<EmergencySummary>('/inventory/emergency-summary');
}
