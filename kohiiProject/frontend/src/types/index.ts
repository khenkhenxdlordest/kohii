/** Login access. Tatlo lang ang makakapag-login: owner (ADMIN), clerk at cashier */
export type Role = 'ADMIN' | 'CLERK' | 'CASHIER';

/** Posisyon ng store staff. KITCHEN sa store lang na may kitchen (Alley) */
export type StaffPosition = 'CASHIER' | 'BARISTA' | 'KITCHEN';

/** Palitan ng shift ng store staff */
export type StaffShift = 'AM' | 'PM';

/**
 * Trabaho ng isang employee. ADMIN, CLERK at CASHIER ay may login;
 * ang BARISTA at KITCHEN ay walang account.
 */
export type Job = 'ADMIN' | 'CLERK' | 'CASHIER' | 'BARISTA' | 'KITCHEN';

export interface AuthUser {
  id: number;
  username: string;
  role: Role;
  /** null para sa ADMIN at CLERK (nakikita ang lahat ng store) */
  storeId: number | null;
  position: StaffPosition | null;
  shift: StaffShift | null;
  mustChangePassword: boolean;
  profile: {
    firstName: string;
    middleName: string | null;
    lastName: string;
    contactNo: string | null;
    email: string | null;
    photoUrl: string | null;
  } | null;
  store: { code: string; name: string } | null;
}

/** Drinks lang ang puwedeng may upsize */
export type CategoryGroup = 'DRINKS' | 'RICE_MEALS' | 'SNACKS';

export interface Category {
  id: number;
  name: string;
  group: CategoryGroup;
  isActive: boolean;
  productCount: number;
}

/** MADE = ginagawa gamit ang recipe (latte); READY_MADE = binibili at binebenta (snack) */
export type ProductType = 'MADE' | 'READY_MADE';

/** REGULAR = isang presyo (snacks, rice meals). Drinks: HOT (12oz), ICED (16oz), UPSIZE (22oz) */
export type ProductSize = 'REGULAR' | 'HOT' | 'ICED' | 'UPSIZE';

export interface SizePrice {
  size: ProductSize;
  price: number;
}

export interface Product {
  id: number;
  name: string;
  categoryId: number;
  category: { id: number; name: string; group: CategoryGroup };
  type: ProductType;
  /** Nakaayos: Regular, Hot, Iced, Upsize. Ang wala rito ay hindi ibinebenta sa size na iyon */
  prices: SizePrice[];
  imageUrl: string | null;
  isActive: boolean;
}

export interface PriceHistoryEntry {
  id: number;
  size: ProductSize;
  oldPrice: number | null;
  /** null kapag tinanggal ang upsize */
  newPrice: number | null;
  reason: string | null;
  changedAt: string;
  changedBy: string;
}

export interface ProductDetail extends Product {
  priceHistory: PriceHistoryEntry[];
}

export interface Store {
  id: number;
  code: string;
  name: string;
  address: string | null;
  hasKitchen: boolean;
  isActive: boolean;
  /** Bilang ng aktibong staff bawat posisyon */
  staffCount: Record<StaffPosition, number>;
}

/** Isang tauhan sa Employees page (walang password) */
export interface Employee {
  id: number;
  /** null = walang login (barista, kitchen) */
  username: string | null;
  /** null = walang login */
  role: Role | null;
  storeId: number | null;
  /** Para sa store staff lang */
  position: StaffPosition | null;
  shift: StaffShift | null;
  isActive: boolean;
  /** true kapag bago o na-reset ang password; papalitan sa susunod na login */
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  store: { id: number; code: string; name: string; hasKitchen: boolean } | null;
  profile: {
    firstName: string;
    middleName: string | null;
    lastName: string;
    contactNo: string | null;
    email: string | null;
  } | null;
}

// ── Orders ──

/** Nirerecord lang; walang online processing (gaya ng GCash/Maya/Bank Transfer) */
export type PaymentMethod = 'CASH' | 'GCASH' | 'MAYA' | 'BANK_TRANSFER';

/** SENIOR/PWD = legal na 20% (RA 9994 / RA 10754); CUSTOM = manual na % na ipapasok ng cashier */
export type DiscountType = 'NONE' | 'SENIOR' | 'PWD' | 'CUSTOM';

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  size: ProductSize;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  id: number;
  receiptNo: string;
  storeId: number;
  cashierId: number;
  shiftId: number;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discountType: DiscountType;
  discountAmount: number;
  total: number;
  amountTendered: number | null;
  changeDue: number | null;
  referenceNo: string | null;
  createdAt: string;
  items: OrderItem[];
}

/** Row galing sa GET /orders — flat na storeCode/storeName/cashierName para madaling gamitin sa listahan/reports */
export interface OrderListItem {
  id: number;
  receiptNo: string;
  storeId: number;
  storeCode: string;
  storeName: string;
  cashierId: number;
  cashierName: string;
  shiftId: number;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discountType: DiscountType;
  discountAmount: number;
  total: number;
  amountTendered: number | null;
  changeDue: number | null;
  referenceNo: string | null;
  createdAt: string;
  itemsCount: number;
  /** Naka-populate lang kung ipinasa ang includeItems:true sa getOrders() */
  items?: OrderItem[];
}

export interface Shift {
  id: number;
  storeId: number;
  cashierId: number;
  status: 'OPEN' | 'CLOSED';
  openingCash: number;
  closingCash: number | null;
  expectedCash: number | null;
  openedAt: string;
  closedAt: string | null;
  note: string | null;
}

// ── Inventory ──

/** RAW_MATERIAL = coffee bar, MEAL = kitchen (Alley), PACKAGING = cups/lids/straw/tissue, SNACK = ready to serve */
export type InventoryItemType = 'RAW_MATERIAL' | 'MEAL' | 'PACKAGING' | 'SNACK';
export type InventoryUnit = 'G' | 'ML' | 'PCS';
export type StockStatus = 'OK' | 'LOW' | 'OUT';
export type StockInSource = 'SUPPLIER' | 'EMERGENCY';
export type WasteCause = 'SPOILED' | 'EXPIRED' | 'SPILLED' | 'DAMAGED' | 'OTHER';
export type StockMovementType = 'SALE' | 'STOCK_IN' | 'AUDIT_ADJUST' | 'WASTE' | 'VOID_RETURN' | 'WITHDRAW';

/** Lalagyan ng item, hal. Oil: Pack (1000 ML) at Bottle (500 ML) */
export interface InventoryPack {
  id: number;
  label: string;
  /** Dami sa unit ng item */
  size: number;
  isDefault: boolean;
}

export interface InventoryItem {
  id: number;
  name: string;
  type: InventoryItemType;
  unit: InventoryUnit;
  stockQty: number;
  lowStockThreshold: number;
  unitCost: number | null;
  isActive: boolean;
  packs: InventoryPack[];
  stockStatus: StockStatus;
}

export interface StockMovement {
  id: number;
  type: StockMovementType;
  /** Positive = dagdag, negative = bawas */
  qty: number;
  balanceAfter: number;
  note: string | null;
  createdAt: string;
  item: { id: number; name: string; unit: InventoryUnit };
  user: string;
  store: { code: string; name: string } | null;
  source: StockInSource | null;
  supplier: string | null;
  totalCost: number | null;
  wasteCause: WasteCause | null;
}

export interface EmergencySummary {
  since: string;
  count: number;
  totalCost: number;
}

// ── Audit log ──

export type AuditTone = 'create' | 'update' | 'remove' | 'price';

export interface AuditLogEntry {
  id: number;
  action: string;
  label: string;
  tone: AuditTone;
  entity: string;
  subject: string;
  change: string;
  actor: string;
  createdAt: string;
}
