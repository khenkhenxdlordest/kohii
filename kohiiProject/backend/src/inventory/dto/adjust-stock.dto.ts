export class PackDto {
  /** May id = i-update; walang id = bago */
  id?: number;
  /** Pack, Bottle, Sack, Can */
  label!: string;
  /** Dami sa unit ng item, hal. 1000 para sa 1000 ML */
  size!: number;
  isDefault?: boolean;
}

export class CreateInventoryItemDto {
  name!: string;
  type!: string;
  unit!: string;
  lowStockThreshold?: number;
  unitCost?: number;
  /** Mga lalagyan, hal. Oil: Pack (1000) at Bottle (500) */
  packs?: PackDto[];
  /** Panimulang stock; itatala bilang STOCK_IN movement */
  initialQty?: number;
}

export class UpdateInventoryItemDto {
  name?: string;
  type?: string;
  lowStockThreshold?: number;
  unitCost?: number | null;
  isActive?: boolean;
  /** Buong listahan ng lalagyan; ang wala rito ay ide-deactivate */
  packs?: PackDto[];
}

/**
 * Para sa stock in, withdraw at waste.
 * Ibigay ang `packId` + `packCount` (hal. 2 bote), o `qty` sa mismong unit (hal. 500 ML).
 */
export class AdjustStockDto {
  packId?: number;
  packCount?: number;
  qty?: number;
  note?: string;
  /** Stock in: SUPPLIER o EMERGENCY */
  source?: string;
  /** Stock in: supplier, o tindahan para sa emergency purchase */
  supplier?: string;
  /** Stock in: halagang ibinayad */
  totalCost?: number;
  /** Waste: SPOILED | EXPIRED | SPILLED | DAMAGED | OTHER */
  cause?: string;
  /** Para sa admin/clerk na walang sariling store */
  storeId?: number;
}
