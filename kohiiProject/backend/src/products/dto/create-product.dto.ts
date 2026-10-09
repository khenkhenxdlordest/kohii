export class CreateProductDto {
  name!: string;
  categoryId!: number;
  type!: string;
  /**
   * Drinks: [{ size: 'HOT', price: 120 }, { size: 'ICED', price: 120 }, { size: 'UPSIZE', price: 140 }]
   * Rice meals at snacks: [{ size: 'REGULAR', price: 140 }]
   */
  prices!: { size: string; price: number }[];
}

export class UpdateProductDto {
  name?: string;
  categoryId?: number;
  type?: string;
  isActive?: boolean;
}

export class ChangePriceDto {
  /** REGULAR | HOT | ICED | UPSIZE */
  size!: string;
  /** null para tanggalin ang presyo ng size na ito */
  price!: number | null;
  reason?: string;
}
