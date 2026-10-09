import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  InventoryItemType,
  StockMovementType,
  Unit,
  type InventoryItem,
  type Prisma,
} from '../generated/prisma/client.js';
import { rethrowPrismaError } from '../common/utils/prisma-errors.js';
import { toAuditJson } from '../common/utils/audit.js';

// Decimal → number para madaling gamitin sa frontend
const toItemResponse = (item: InventoryItem) => {
  const stockQty = item.stockQty.toNumber();
  const lowStockThreshold = item.lowStockThreshold.toNumber();
  const packSize = item.packSize?.toNumber() ?? null;
  return {
    ...item,
    stockQty,
    lowStockThreshold,
    packSize,
    unitCost: item.unitCost?.toNumber() ?? null,
    /** Ilang buong pack ang natitira, kung may packSize */
    packsOnHand: packSize ? Math.floor(stockQty / packSize) : null,
    stockStatus: stockQty <= 0 ? 'OUT' : stockQty <= lowStockThreshold ? 'LOW' : 'OK',
  };
};

export interface ItemFilters {
  type?: InventoryItemType;
  search?: string;
  lowStockOnly: boolean;
  includeInactive: boolean;
}

export interface CreateItemInput {
  name: string;
  type: InventoryItemType;
  unit: Unit;
  lowStockThreshold: number;
  packSize?: number;
  packLabel?: string;
  unitCost?: number;
  initialQty?: number;
}

export interface UpdateItemInput {
  name?: string;
  type?: InventoryItemType;
  lowStockThreshold?: number;
  packSize?: number | null;
  packLabel?: string | null;
  unitCost?: number | null;
  isActive?: boolean;
}

export interface AdjustInput {
  qty?: number;
  packs?: number;
  note?: string;
  supplier?: string;
  storeId: number | null;
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findItems({ type, search, lowStockOnly, includeInactive }: ItemFilters) {
    const items = await this.prisma.inventoryItem.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(type ? { type } : {}),
        ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
    const result = items.map(toItemResponse);
    // Hindi direktang maikukumpara ng Prisma ang dalawang column, kaya dito na sinasala
    return lowStockOnly ? result.filter((i) => i.stockStatus !== 'OK') : result;
  }

  async findItem(id: number) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Inventory item not found.');
    return toItemResponse(item);
  }

  async createItem(data: CreateItemInput, userId: number) {
    const { initialQty, ...fields } = data;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const item = await tx.inventoryItem.create({ data: { ...fields, stockQty: initialQty ?? 0 } });
        if (initialQty) {
          await tx.stockMovement.create({
            data: {
              inventoryItemId: item.id,
              type: StockMovementType.STOCK_IN,
              qty: initialQty,
              balanceAfter: initialQty,
              userId,
              note: 'Initial stock',
            },
          });
        }
        await tx.auditLog.create({
          data: { userId, action: 'INVENTORY_ITEM_CREATE', entity: 'InventoryItem', entityId: String(item.id), after: toAuditJson(item) },
        });
        return toItemResponse(item);
      });
    } catch (error) {
      rethrowPrismaError(error, 'Inventory item');
    }
  }

  // Hindi kasama ang stockQty; dumadaan lang ito sa stockIn / withdraw para may movement
  async updateItem(id: number, data: UpdateItemInput, userId: number) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const before = await tx.inventoryItem.findUniqueOrThrow({ where: { id } });
        const item = await tx.inventoryItem.update({ where: { id }, data });
        await tx.auditLog.create({
          data: {
            userId,
            action: data.isActive === false ? 'INVENTORY_ITEM_DEACTIVATE' : 'INVENTORY_ITEM_UPDATE',
            entity: 'InventoryItem',
            entityId: String(id),
            before: toAuditJson(before),
            after: toAuditJson(item),
          },
        });
        return toItemResponse(item);
      });
    } catch (error) {
      rethrowPrismaError(error, 'Inventory item');
    }
  }

  /** Increment: dumating na delivery o dagdag na stock */
  async stockIn(id: number, input: AdjustInput, userId: number) {
    const item = await this.getActiveItem(id);
    const qty = this.resolveQty(item, input);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.inventoryItem.update({ where: { id }, data: { stockQty: { increment: qty } } });
      const stockIn = await tx.stockIn.create({
        data: {
          clerkId: userId,
          supplier: input.supplier,
          note: input.note,
          items: { create: { inventoryItemId: id, qty } },
        },
      });
      const movement = await tx.stockMovement.create({
        data: {
          inventoryItemId: id,
          type: StockMovementType.STOCK_IN,
          qty,
          balanceAfter: updated.stockQty,
          userId,
          storeId: input.storeId,
          stockInId: stockIn.id,
          note: this.describe(item, qty, input),
        },
      });
      return { item: toItemResponse(updated), movementId: movement.id };
    });
  }

  /** Decrement: kumuha ang barista ng isang pack/pouch mula sa storage */
  async withdraw(id: number, input: AdjustInput, userId: number) {
    const item = await this.getActiveItem(id);
    const qty = this.resolveQty(item, input);

    return this.prisma.$transaction(async (tx) => {
      // Atomic: babawasan lang kung sapat ang stock, para hindi mag-negative kahit sabay ang dalawang kuha
      const { count } = await tx.inventoryItem.updateMany({
        where: { id, stockQty: { gte: qty } },
        data: { stockQty: { decrement: qty } },
      });
      if (count === 0) {
        throw new BadRequestException(
          `Not enough stock. Only ${item.stockQty.toNumber()} ${item.unit} of ${item.name} left.`,
        );
      }
      const updated = await tx.inventoryItem.findUniqueOrThrow({ where: { id } });
      const movement = await tx.stockMovement.create({
        data: {
          inventoryItemId: id,
          type: StockMovementType.WITHDRAW,
          // Negative ang qty para sa bawas, para madaling i-total sa reports
          qty: -qty,
          balanceAfter: updated.stockQty,
          userId,
          storeId: input.storeId,
          note: this.describe(item, qty, input),
        },
      });
      return { item: toItemResponse(updated), movementId: movement.id };
    });
  }

  async findMovements(filters: { itemId?: number; type?: StockMovementType; storeId?: number; limit: number }) {
    const where: Prisma.StockMovementWhereInput = {
      ...(filters.itemId ? { inventoryItemId: filters.itemId } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.storeId ? { storeId: filters.storeId } : {}),
    };
    const movements = await this.prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit,
      include: {
        inventoryItem: { select: { id: true, name: true, unit: true } },
        user: { select: { username: true } },
        store: { select: { code: true, name: true } },
      },
    });
    return movements.map((m) => ({
      id: m.id,
      type: m.type,
      qty: m.qty.toNumber(),
      balanceAfter: m.balanceAfter.toNumber(),
      note: m.note,
      createdAt: m.createdAt,
      item: m.inventoryItem,
      user: m.user.username,
      store: m.store,
    }));
  }

  private async getActiveItem(id: number) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Inventory item not found.');
    if (!item.isActive) throw new BadRequestException(`${item.name} is inactive.`);
    return item;
  }

  /** packs × packSize, o ang qty mismo */
  private resolveQty(item: InventoryItem, input: AdjustInput) {
    if (input.packs !== undefined) {
      if (!item.packSize) {
        throw new BadRequestException(`${item.name} has no pack size. Enter the quantity in ${item.unit} instead.`);
      }
      return Math.round(input.packs * item.packSize.toNumber() * 1000) / 1000;
    }
    if (input.qty === undefined) throw new BadRequestException('Enter a quantity or number of packs.');
    return input.qty;
  }

  private describe(item: InventoryItem, qty: number, input: AdjustInput) {
    const amount =
      input.packs !== undefined
        ? `${input.packs} ${item.packLabel ?? 'pack'}(s) = ${qty} ${item.unit}`
        : `${qty} ${item.unit}`;
    return input.note ? `${amount}. ${input.note}` : amount;
  }
}
