export class CreateProductDto {
  name!: string;
  categoryId!: number;
  type!: string;
  price!: number;
  /** Wala o null = walang upsize */
  upsizePrice?: number | null;
}

export class UpdateProductDto {
  name?: string;
  categoryId?: number;
  type?: string;
  isActive?: boolean;
}

export class ChangePriceDto {
  /** REGULAR (default) o UPSIZE */
  size?: string;
  /** null para tanggalin ang upsize */
  price!: number | null;
  reason?: string;
}
