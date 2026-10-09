import type { InventoryItem, InventoryItemType, InventoryUnit, StockMovementType, WasteCause } from '../types';

export const itemTypeOrder: InventoryItemType[] = ['RAW_MATERIAL', 'MEAL', 'PACKAGING', 'SNACK'];

export const itemTypeLabels: Record<InventoryItemType, string> = {
  RAW_MATERIAL: 'Coffee Bar',
  MEAL: 'Kitchen',
  PACKAGING: 'Packaging',
  SNACK: 'Snacks',
};

export const unitLabels: Record<InventoryUnit, string> = {
  G: 'Grams (g)',
  ML: 'Milliliters (ml)',
  PCS: 'Pieces (pcs)',
};

export const wasteCauseLabels: Record<WasteCause, string> = {
  SPOILED: 'Spoiled',
  EXPIRED: 'Expired',
  SPILLED: 'Spilled',
  DAMAGED: 'Damaged',
  OTHER: 'Other',
};

export const movementLabels: Record<StockMovementType, string> = {
  STOCK_IN: 'Stock in',
  WITHDRAW: 'Withdraw',
  WASTE: 'Waste',
  SALE: 'Sale',
  AUDIT_ADJUST: 'Count adjustment',
  VOID_RETURN: 'Void return',
};

const number = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 });

/** 2500 G → "2.5 kg", 750 ML → "750 ml", 12 PCS → "12 pcs" */
export function formatQty(qty: number, unit: InventoryUnit) {
  const abs = Math.abs(qty);
  if (unit === 'G' && abs >= 1000) return `${number.format(qty / 1000)} kg`;
  if (unit === 'ML' && abs >= 1000) return `${number.format(qty / 1000)} L`;
  return `${number.format(qty)} ${unit === 'PCS' ? 'pcs' : unit.toLowerCase()}`;
}

/** Ilang buong pack ang katumbas, gamit ang default na lalagyan: "≈ 2 packs" */
export function packEquivalent(item: InventoryItem) {
  const pack = item.packs.find((p) => p.isDefault) ?? item.packs[0];
  if (!pack || pack.size <= 0) return null;
  const count = item.stockQty / pack.size;
  const rounded = Math.floor(count * 10) / 10;
  return `${number.format(rounded)} ${pack.label.toLowerCase()}${rounded === 1 ? '' : 's'}`;
}

/** "Pack 1 L · Bottle 500 ml" */
export function describePacks(item: InventoryItem) {
  return item.packs.map((p) => `${p.label} ${formatQty(p.size, item.unit)}`).join(' · ');
}
