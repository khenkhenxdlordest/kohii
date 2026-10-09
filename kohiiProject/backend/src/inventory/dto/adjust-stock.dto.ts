export class CreateInventoryItemDto {
  name!: string;
  type!: string;
  unit!: string;
  lowStockThreshold?: number;
  packSize?: number;
  packLabel?: string;
  unitCost?: number;
  /** Panimulang stock; itatala bilang STOCK_IN movement */
  initialQty?: number;
}

export class UpdateInventoryItemDto {
  name?: string;
  type?: string;
  lowStockThreshold?: number;
  packSize?: number | null;
  packLabel?: string | null;
  unitCost?: number | null;
  isActive?: boolean;
}

/**
 * Para sa stock in (+) at withdraw (-).
 * Ibigay ang `packs` (hal. 2 pouch) kung may packSize ang item, o `qty` sa mismong unit (hal. 500 ML).
 */
export class AdjustStockDto {
  qty?: number;
  packs?: number;
  note?: string;
  /** Para sa stock in lang */
  supplier?: string;
  /** Para sa admin/clerk na walang sariling store; kung saang branch napunta ang kinuha */
  storeId?: number;
}
