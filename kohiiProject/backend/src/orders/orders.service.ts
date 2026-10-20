import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CategoryGroup,
  DiscountType,
  PaymentMethod,
  PrepStatus,
  ProductSize,
  ShiftStatus,
  StockMovementType,
} from '../generated/prisma/client.js';
import { RealtimeService } from '../realtime/realtime.service.js';

export interface OrderItemInput {
  productId: number;
  size: ProductSize;
  qty: number;
  remarks?: string;
}

export interface CreateOrderInput {
  items: OrderItemInput[];
  paymentMethod: PaymentMethod;
  discountType: DiscountType;
  discountPercent?: number;
  amountTendered?: number;
  referenceNo?: string;
}

export interface FindOrdersFilters {
  storeId?: number;
  cashierId?: number;
  from?: string;
  to?: string;
  limit: number;
  includeItems: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async findAll(filters: FindOrdersFilters) {
    const createdAt: { gte?: Date; lte?: Date } = {};
    if (filters.from) createdAt.gte = new Date(`${filters.from}T00:00:00`);
    if (filters.to) createdAt.lte = new Date(`${filters.to}T23:59:59.999`);

    const orders = await this.prisma.order.findMany({
      where: {
        ...(filters.storeId ? { storeId: filters.storeId } : {}),
        ...(filters.cashierId ? { cashierId: filters.cashierId } : {}),
        ...(filters.from || filters.to ? { createdAt } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit,
      include: {
        store: { select: { code: true, name: true } },
        cashier: { select: { profile: { select: { firstName: true, lastName: true } } } },
        items: true,
      },
    });

    return orders.map((o) => ({
      id: o.id,
      receiptNo: o.receiptNo,
      storeId: o.storeId,
      storeCode: o.store.code,
      storeName: o.store.name,
      cashierId: o.cashierId,
      cashierName: o.cashier.profile ? `${o.cashier.profile.firstName} ${o.cashier.profile.lastName}` : 'Cashier',
      shiftId: o.shiftId,
      paymentMethod: o.paymentMethod,
      subtotal: o.subtotal.toNumber(),
      discountType: o.discountType,
      discountAmount: o.discountAmount.toNumber(),
      total: o.total.toNumber(),
      amountTendered: o.amountTendered?.toNumber() ?? null,
      changeDue: o.changeDue?.toNumber() ?? null,
      referenceNo: o.referenceNo,
      createdAt: o.createdAt,
      itemsCount: o.items.reduce((sum, i) => sum + i.qty, 0),
      items: filters.includeItems
        ? o.items.map((i) => ({
            id: i.id,
            productId: i.productId,
            productName: i.productName,
            size: i.size,
            qty: i.qty,
            unitPrice: i.unitPrice.toNumber(),
            lineTotal: i.lineTotal.toNumber(),
            remarks: i.remarks,
            prepStatus: i.prepStatus,
          }))
        : undefined,
    }));
  }

  async create(input: CreateOrderInput, cashierId: number, storeId: number) {
    if (input.items.length === 0) throw new BadRequestException('Add at least one item.');

    const result = await this.prisma.$transaction(async (tx) => {
      const shift = await tx.shift.findFirst({ where: { cashierId, storeId, status: ShiftStatus.OPEN } });
      if (!shift) throw new BadRequestException('No open shift.');

      const productIds = [...new Set(input.items.map((i) => i.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        include: { prices: true, recipeItems: true, category: true },
      });
      const productById = new Map(products.map((p) => [p.id, p]));

      const lines = input.items.map((item) => {
        const product = productById.get(item.productId);
        if (!product || !product.isActive) throw new BadRequestException(`Product ${item.productId} is not available.`);
        const price = product.prices.find((p) => p.size === item.size);
        if (!price) throw new BadRequestException(`${product.name} is not sold in that size.`);
        if (!Number.isInteger(item.qty) || item.qty <= 0) throw new BadRequestException('Quantity must be at least 1.');
        return { product, size: item.size, qty: item.qty, unitPrice: price.price.toNumber(), remarks: item.remarks };
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
              remarks: l.remarks ?? null,
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

      const mealProductIds = new Set(
        lines.filter((l) => l.product.category.group === CategoryGroup.RICE_MEALS).map((l) => l.product.id),
      );

      return { order, affectedItems, mealProductIds };
    });

    const { order, affectedItems, mealProductIds } = result;
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

    const mealItems = order.items.filter((i) => mealProductIds.has(i.productId));
    if (mealItems.length > 0) {
      // Iisang kitchen (Alley) ang naghahanda ng meals ng dalawang store, kaya global ang event
      this.realtime.emitKitchenOrderNew({
        orderId: order.id,
        receiptNo: order.receiptNo,
        storeId,
        createdAt: order.createdAt,
        items: mealItems.map((i) => ({
          id: i.id,
          productName: i.productName,
          size: i.size,
          qty: i.qty,
          remarks: i.remarks,
          prepStatus: i.prepStatus,
        })),
      });
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

  // GET /orders/kitchen-queue — iisang kitchen (Alley) ang naghahanda para sa dalawang store,
  // kaya global ang queue: lahat ng order (kahit saang store) na may RICE_MEALS item na hindi pa DELIVERED
  async findKitchenQueue() {
    const orders = await this.prisma.order.findMany({
      where: {
        items: { some: { product: { category: { group: CategoryGroup.RICE_MEALS } }, prepStatus: { not: PrepStatus.DELIVERED } } },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        store: { select: { code: true } },
        items: { include: { product: { include: { category: true } } } },
      },
    });

    return orders.map((o) => ({
      orderId: o.id,
      receiptNo: o.receiptNo,
      storeCode: o.store.code,
      createdAt: o.createdAt,
      items: o.items
        .filter((i) => i.product.category.group === CategoryGroup.RICE_MEALS && i.prepStatus !== PrepStatus.DELIVERED)
        .map((i) => ({
          id: i.id,
          productName: i.productName,
          size: i.size,
          qty: i.qty,
          remarks: i.remarks,
          prepStatus: i.prepStatus,
        })),
    }));
  }

  // PATCH /orders/items/:itemId/prep-status
  async updateItemPrepStatus(itemId: number, status: PrepStatus) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: itemId },
      include: { order: { select: { storeId: true, receiptNo: true } } },
    });
    if (!item) throw new NotFoundException('Order item not found.');

    const updated = await this.prisma.orderItem.update({ where: { id: itemId }, data: { prepStatus: status } });

    // Global para sa Kitchen Queue page (sino man ang nakabukas), pero may storeId
    // para ma-filter ng cashier-side notification kung aling store dapat makakita
    this.realtime.emitPrepStatusChanged({
      orderId: item.orderId,
      itemId: updated.id,
      productName: item.productName,
      prepStatus: updated.prepStatus,
      storeId: item.order.storeId,
      receiptNo: item.order.receiptNo,
    });

    return { id: updated.id, prepStatus: updated.prepStatus };
  }
}
