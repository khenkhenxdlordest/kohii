// Pansamantalang datos habang wala pang POS at /api/dashboard (Phase 3 at 6).
// Seeded sa petsa ngayon kaya nagbabago ito araw-araw pero pareho sa buong araw,
// kaya parang "live" na ang dashboard. Papalitan na lang ng totoong API endpoint dito.
import type { Product } from '../types';

export interface ShiftSales {
  shift: 'AM' | 'PM';
  sales: number;
  orders: number;
}

export interface StoreSales {
  sales: number;
  orders: number;
  shifts: ShiftSales[];
}

export interface TopProduct {
  id: number;
  name: string;
  category: string;
  qtySold: number;
  revenue: number;
}

function hashString(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (Math.imul(31, h) + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// mulberry32: maliit at mabilis na seeded PRNG, sapat na para sa mock data
function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** YYYY-MM-DD ngayon, at ang nakaraang araw kapag offsetDays = -1 (para sa "vs. yesterday") */
function todaySeed(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return hashString(date.toISOString().slice(0, 10));
}

const STORE_RANGES: Record<string, { sales: [number, number]; avgOrder: [number, number] }> = {
  ALY: { sales: [6200, 9400], avgOrder: [135, 165] },
  PDM: { sales: [3600, 5600], avgOrder: [130, 160] },
};

function randRange(rand: () => number, [min, max]: [number, number]) {
  return min + rand() * (max - min);
}

/** Totoong sales ng isang store sa isang araw (seeded); offsetDays = -1 para sa kahapon */
export function getStoreSales(storeCode: string, offsetDays = 0): StoreSales {
  const range = STORE_RANGES[storeCode] ?? STORE_RANGES.PDM;
  const rand = mulberry32(todaySeed(offsetDays) ^ hashString(storeCode));

  const sales = Math.round(randRange(rand, range.sales));
  const avgOrder = randRange(rand, range.avgOrder);
  const orders = Math.max(1, Math.round(sales / avgOrder));

  // ~50-65% sa AM, natitira sa PM
  const amShare = 0.5 + rand() * 0.15;
  const amSales = Math.round(sales * amShare);
  const amOrders = Math.round(orders * amShare);

  return {
    sales,
    orders,
    shifts: [
      { shift: 'AM', sales: amSales, orders: amOrders },
      { shift: 'PM', sales: sales - amSales, orders: orders - amOrders },
    ],
  };
}

export const STORE_CODES = Object.keys(STORE_RANGES);

/** Kabuuan ng lahat ng store, kasama ang % pagbabago laban sa kahapon */
export function getDashboardSummary() {
  const today = STORE_CODES.map((code) => getStoreSales(code));
  const yesterday = STORE_CODES.map((code) => getStoreSales(code, -1));

  const sumSales = (list: StoreSales[]) => list.reduce((total, s) => total + s.sales, 0);
  const sumOrders = (list: StoreSales[]) => list.reduce((total, s) => total + s.orders, 0);

  const salesToday = sumSales(today);
  const ordersToday = sumOrders(today);
  const salesYesterday = sumSales(yesterday);
  const ordersYesterday = sumOrders(yesterday);

  const pctChange = (now: number, before: number) =>
    before === 0 ? 0 : Math.round(((now - before) / before) * 1000) / 10;

  return {
    salesToday,
    ordersToday,
    salesChange: pctChange(salesToday, salesYesterday),
    ordersChange: pctChange(ordersToday, ordersYesterday),
  };
}

/** Pinipili ang pinakamabentang produkto ngayong araw (seeded); nangangailangan ng totoong listahan ng produkto */
export function getTopProducts(products: Product[], limit = 5): TopProduct[] {
  const active = products.filter((p) => p.isActive);
  if (active.length === 0) return [];

  const rand = mulberry32(todaySeed());
  // Fisher-Yates gamit ang seeded rand, para pareho ang pagkakasunod-sunod sa buong araw
  const shuffled = [...active];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, limit).map((product) => {
    const qtySold = Math.round(randRange(rand, [8, 42]));
    const price = product.prices[0]?.price ?? 0;
    return {
      id: product.id,
      name: product.name,
      category: product.category.name,
      qtySold,
      revenue: Math.round(qtySold * price),
    };
  });
}

// ── Product performance (units sold, revenue, trend; Phase 6 report not built yet) ──

export interface ProductPerformance {
  id: number;
  unitsSold: number;
  revenue: number;
  /** % pagbabago laban sa nakaraang buwan */
  trend: number;
}

export function getProductPerformance(products: Product[]): ProductPerformance[] {
  return products
    .filter((p) => p.isActive)
    .map((product) => {
      const rand = mulberry32(todaySeed() ^ hashString(String(product.id)));
      const price = product.prices[0]?.price ?? 0;
      const unitsSold = Math.round(randRange(rand, [20, 220]));
      const prevUnits = Math.max(1, Math.round(unitsSold * (0.8 + rand() * 0.4)));
      const trend = Math.round(((unitsSold - prevUnits) / prevUnits) * 1000) / 10;

      return { id: product.id, unitsSold, revenue: Math.round(unitsSold * price), trend };
    });
}

// ── Sales report (individual order rows; Phase 3 POS not built yet) ──

const STORE_NAMES: Record<string, string> = { ALY: 'Alley', PDM: 'Podium' };

export interface MockSaleRow {
  id: string;
  dateTime: string;
  storeCode: string;
  storeName: string;
  cashier: string;
  itemsCount: number;
  paymentMethod: 'Cash' | 'GCash';
  discount: 'None' | 'Senior/PWD';
  total: number;
}

/** Listahan ng mga sale sa nakaraang `days` araw, bawat store; ginagamit ang totoong pangalan ng cashier kung meron */
export function getMockSales(cashierNames: string[], days = 10): MockSaleRow[] {
  const rows: MockSaleRow[] = [];

  for (let offset = 0; offset < days; offset += 1) {
    for (const code of STORE_CODES) {
      const { orders } = getStoreSales(code, -offset);
      const rand = mulberry32(todaySeed(-offset) ^ hashString(code) ^ 0x9e3779b9);
      const day = new Date();
      day.setDate(day.getDate() - offset);

      for (let i = 0; i < orders; i += 1) {
        const dateTime = new Date(day);
        dateTime.setHours(7 + Math.floor(rand() * 11), Math.floor(rand() * 60), 0, 0);
        const cashier = cashierNames.length ? cashierNames[Math.floor(rand() * cashierNames.length)] : 'Cashier';

        rows.push({
          id: `${code}-${offset}-${i}`,
          dateTime: dateTime.toISOString(),
          storeCode: code,
          storeName: STORE_NAMES[code] ?? code,
          cashier,
          itemsCount: 1 + Math.floor(rand() * 4),
          paymentMethod: rand() < 0.65 ? 'Cash' : 'GCash',
          discount: rand() < 0.08 ? 'Senior/PWD' : 'None',
          total: Math.round(randRange(rand, [90, 320])),
        });
      }
    }
  }

  return rows.sort((a, b) => b.dateTime.localeCompare(a.dateTime));
}
