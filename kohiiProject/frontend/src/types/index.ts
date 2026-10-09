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
  profile: { firstName: string; lastName: string } | null;
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

export type ProductSize = 'REGULAR' | 'UPSIZE';

export interface Product {
  id: number;
  name: string;
  categoryId: number;
  category: { id: number; name: string; group: CategoryGroup };
  type: ProductType;
  /** Presyo ng Regular */
  currentPrice: number;
  /** null = walang upsize (snacks, meals); iba-iba bawat inumin */
  upsizePrice: number | null;
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
