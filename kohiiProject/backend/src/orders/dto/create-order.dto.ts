export class OrderItemDto {
  productId!: number;
  size!: string;
  qty!: number;
}

export class CreateOrderDto {
  items!: OrderItemDto[];
  paymentMethod!: string;
  discountType!: string;
  /** Ginagamit lang kung discountType === CUSTOM */
  discountPercent?: number;
  amountTendered?: number;
  referenceNo?: string;
}
