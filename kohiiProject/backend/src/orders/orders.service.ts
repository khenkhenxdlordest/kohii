import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DiscountType, PaymentMethod, ProductSize, ShiftStatus, StockMovementType } from '../generated/prisma/client.js';
import { RealtimeService } from '../realtime/realtime.service.js';

export interface OrderItemInput {
  productId: number;
  size: ProductSize;
  qty: number;
}

export interface CreateOrderInput {
  items: OrderItemInput[];
  paymentMethod: PaymentMethod;
  discountType: DiscountType;
  discountPercent?: number;
  amountTendered?: number;
  referenceNo?: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async create(input: CreateOrderInput, cashierId: number, storeId: number) {
    if (input.items.length === 0) throw new BadRequestException('Add at least one item.');

    const result = await this.prisma.$transaction(async (tx) => {
      const shift = await tx.shift.findFirst({ where: { cashierId, storeId, status: ShiftStatus.OPEN } });
      if (!shift) throw new BadRequestException('No open shift.');

      const productIds = [...new Set(input.items.map((i) => i.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        include: { prices: true, recipeItems: true },
      });
      const productById = new Map(products.map((p) => [p.id, p]));

      const lines = input.items.map((item) => {
        const product = productById.get(item.productId);
        if (!product || !product.isActive) throw new BadRequestException(`Product ${item.productId} is not available.`);
        const price = product.prices.find((p) => p.size === item.size);
        if (!price) throw new BadRequestException(`${product.name} is not sold in that size.`);
        if (!Number.isInteger(item.qty) || item.qty <= 0) throw new BadRequestException('Quantity must be at least 1.');
        return { product, size: item.size, qty: item.qty, unitPrice: price.price.toNumber() };
      });

      const subtotal = round2(lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0));

      const discountPercent =
        input.discountType === DiscountType.SENIOR || input.discountType === DiscountType.PWD
          ? 20
          : input.discountType === DiscountType.CUSTOM
            ? Math.min(100, Math.max(0, Number(input.discountPercent) || 0))
            : 0;
      const discountAmount = round2(subtotal * (discountPercent / 100));
      const total = round2(subtotal - discountAmount);

      const isCash = input.paymentMethod === PaymentMethod.CASH;
      let amountTendered: number | undefined;
      let changeDue: number | undefined;
      let referenceNo: string | undefined;
      if (isCash) {
        amountTendered = Number(input.amountTendered);
        if (!Number.isFinite(amountTendered) || amountTendered < total) {
          throw new BadRequestException('Amount tendered must cover the total.');
        }
        changeDue = round2(amountTendered - total);
      } else {
        referenceNo = input.referenceNo?.trim();
        if (!referenceNo) throw new BadRequestException('Reference number is required.');
      }

      const store = await tx.store.update({ where: { id: storeId }, data: { receiptCounter: { increment: 1 } } });
      const receiptNo = `${store.code}-${String(store.receiptCounter).padStart(6, '0')}`;

      const order = await tx.order.create({
        data: {
          receiptNo,
          storeId,
          cashierId,
          shiftId: shift.id,
          paymentMethod: input.paymentMethod,
          subtotal,
          discountType: input.discountType,
          discountAmount,
          total,
          amountTendered,
          changeDue,
          referenceNo,
          items: {
            create: lines.map((l) => ({
              productId: l.product.id,
              productName: l.product.name,
              size: l.size,
              qty: l.qty,
              unitPrice: l.unitPrice,
              lineTotal: round2(l.unitPrice * l.qty),
            })),
          },
        },
        include: { items: true },
      });

      // I-deduct ang stock base sa recipe (kung meron); walang recipe = walang epekto
      const affectedItemIds = new Set<number>();
      for (const line of lines) {
        for (const recipe of line.product.recipeItems) {
          const deduct = round3(recipe.qtyPerUnit.toNumber() * line.qty);
          const updated = await tx.inventoryItem.update({
            where: { id: recipe.inventoryItemId },
            data: { stockQty: { decrement: deduct } },
          });
          await tx.stockMovement.create({
            data: {
              inventoryItemId: recipe.inventoryItemId,
              type: StockMovementType.SALE,
              qty: -deduct,
              balanceAfter: updated.stockQty,
              userId: cashierId,
              storeId,
              orderId: order.id,
            },
          });
          affectedItemIds.add(recipe.inventoryItemId);
        }
      }

      const affectedItems =
        affectedItemIds.size > 0
          ? await tx.inventoryItem.findMany({ where: { id: { in: [...affectedItemIds] } } })
          : [];

      return { order, affectedItems };
    });

    const { order, affectedItems } = result;
    this.realtime.emitOrderCreated(storeId, {
      ...order,
      subtotal: order.subtotal.toNumber(),
      discountAmount: order.discountAmount.toNumber(),
      total: order.total.toNumber(),
      amountTendered: order.amountTendered?.toNumber() ?? null,
      changeDue: order.changeDue?.toNumber() ?? null,
    });

    for (const item of affectedItems) {
      const stockQty = item.stockQty.toNumber();
      const lowStockThreshold = item.lowStockThreshold.toNumber();
      const response = {
        ...item,
        stockQty,
        lowStockThreshold,
        stockStatus: stockQty <= 0 ? 'OUT' : stockQty <= lowStockThreshold ? 'LOW' : 'OK',
      };
      this.realtime.emitStockUpdated(response);
      if (response.stockStatus !== 'OK') this.realtime.emitStockLow(response);
    }

    return {
      ...order,
      subtotal: order.subtotal.toNumber(),
      discountAmount: order.discountAmount.toNumber(),
      total: order.total.toNumber(),
      amountTendered: order.amountTendered?.toNumber() ?? null,
      changeDue: order.changeDue?.toNumber() ?? null,
      items: order.items.map((i) => ({ ...i, unitPrice: i.unitPrice.toNumber(), lineTotal: i.lineTotal.toNumber() })),
    };
  }
}
