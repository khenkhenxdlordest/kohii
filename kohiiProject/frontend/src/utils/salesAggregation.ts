// Totoong pagsusuma lang mula sa GET /orders — walang random/seeded na datos (di tulad ng dating mockDashboard.ts)
import type { OrderListItem } from '../types';

/**
 * Local calendar date (hindi UTC) bilang YYYY-MM-DD — kailangan ito para sa "today"/date-range
 * na ipinapadala sa GET /orders, dahil local time rin ang ginagamit ng backend sa pag-parse ng
 * from/to. Ang `date.toISOString().slice(0,10)` ay UTC-based, kaya mali pag di magkapareho ang
 * UTC date at local date (hal. madaling araw sa PHT), nagiging maling window ang query.
 */
export function toLocalIso(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Local calendar date (YYYY-MM-DD) ng isang order's `createdAt` (UTC ISO string mula sa backend).
 * Dating `iso.slice(0, 10)` lang ito — UTC date, kaya mali ang paghahambing laban sa local na
 * "today"/date-range (hal. order na ginawa 1AM PHT ay naka-slice bilang kahapon pa sa UTC).
 */
export function dateOf(iso: string) {
  return toLocalIso(new Date(iso));
}

export interface DaySummary {
  /** YYYY-MM-DD */
  day: string;
  orders: number;
  total: number;
}

/** Kinakabuuan ang orders bawat araw, pataas na ayos (para sa chart) */
export function sumByDay(orders: OrderListItem[]): DaySummary[] {
  const byDay = new Map<string, { orders: number; total: number }>();
  for (const o of orders) {
    const day = dateOf(o.createdAt);
    const entry = byDay.get(day) ?? { orders: 0, total: 0 };
    entry.orders += 1;
    entry.total += o.total;
    byDay.set(day, entry);
  }
  return [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, v]) => ({ day, ...v }));
}

export interface ShiftSummary {
  shift: 'AM' | 'PM';
  orders: number;
  sales: number;
}

/** AM = bago mag-12nn, PM = mula 12nn — batay sa oras ng order */
export function sumByShift(orders: OrderListItem[]): ShiftSummary[] {
  const am = { shift: 'AM' as const, orders: 0, sales: 0 };
  const pm = { shift: 'PM' as const, orders: 0, sales: 0 };
  for (const o of orders) {
    const bucket = new Date(o.createdAt).getHours() < 12 ? am : pm;
    bucket.orders += 1;
    bucket.sales += o.total;
  }
  return [am, pm];
}

export function discountLabel(order: Pick<OrderListItem, 'discountType'>) {
  if (order.discountType === 'NONE') return 'None';
  if (order.discountType === 'SENIOR') return 'Senior';
  if (order.discountType === 'PWD') return 'PWD';
  return 'Custom';
}

export function sumTotals(orders: OrderListItem[]) {
  return { count: orders.length, total: orders.reduce((sum, o) => sum + o.total, 0) };
}

export interface StoreSalesSummary {
  sales: number;
  orders: number;
  shifts: ShiftSummary[];
}

/** Para sa isang store/araw na set ng orders (i-filter muna ang caller bago ipasa dito) */
export function storeSalesSummary(orders: OrderListItem[]): StoreSalesSummary {
  const totals = sumTotals(orders);
  return { sales: totals.total, orders: totals.count, shifts: sumByShift(orders) };
}

export interface ProductSales {
  productId: number;
  name: string;
  qty: number;
  revenue: number;
}

/** Kailangang naka-fetch ang orders gamit ang { includeItems: true } */
export function productSales(orders: OrderListItem[]): ProductSales[] {
  const byProduct = new Map<number, ProductSales>();
  for (const o of orders) {
    for (const item of o.items ?? []) {
      const entry = byProduct.get(item.productId) ?? { productId: item.productId, name: item.productName, qty: 0, revenue: 0 };
      entry.qty += item.qty;
      entry.revenue += item.lineTotal;
      byProduct.set(item.productId, entry);
    }
  }
  return [...byProduct.values()];
}

/** % pagbabago mula sa `before` papunta sa `now` */
export function pctChange(now: number, before: number) {
  if (before === 0) return 0;
  return Math.round(((now - before) / before) * 1000) / 10;
}
