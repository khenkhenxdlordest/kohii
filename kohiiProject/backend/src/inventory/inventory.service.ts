import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  InventoryItemType,
  StockInSource,
  StockMovementType,
  Unit,
  WasteCause,
  type Prisma,
} from '../generated/prisma/client.js';
import { rethrowPrismaError } from '../common/utils/prisma-errors.js';
import { toAuditJson } from '../common/utils/audit.js';

const itemInclude = {
  packs: { where: { isActive: true }, orderBy: [{ isDefault: 'desc' as const }, { size: 'asc' as const }] },
} satisfies Prisma.InventoryItemInclude;

type ItemWithPacks = Prisma.InventoryItemGetPayload<{ include: typeof itemInclude }>;
type Pack = ItemWithPacks['packs'][number];

const round3 = (n: number) => Math.round(n * 1000) / 1000;

// Decimal → number para madaling gamitin sa frontend
const toItemResponse = (item: ItemWithPacks) => {
  const stockQty = item.stockQty.toNumber();
  const lowStockThreshold = item.lowStockThreshold.toNumber();
  return {
    ...item,
    stockQty,
    lowStockThreshold,
    unitCost: item.unitCost?.toNumber() ?? null,
    packs: item.packs.map((p) => ({ id: p.id, label: p.label, size: p.size.toNumber(), isDefault: p.isDefault })),
    stockStatus: stockQty <= 0 ? 'OUT' : stockQty <= lowStockThreshold ? 'LOW' : 'OK',
  };
};

export interface PackInput {
  /** May id = i-update; walang id = bago */
  id?: number;
  label: string;
  size: number;
  isDefault: boolean;
}

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
  unitCost?: number;
  packs: PackInput[];
  initialQty?: number;
}

export interface UpdateItemInput {
  name?: string;
  type?: InventoryItemType;
  lowStockThreshold?: number;
  unitCost?: number | null;
  isActive?: boolean;
  /** Kapag ibinigay, ito na ang buong listahan; ang wala rito ay ide-deactivate */
  packs?: PackInput[];
}

/** Dami: isang lalagyan × bilang (hal. 2 bote), o eksaktong dami sa unit (hal. 500 ML) */
export interface QuantityInput {
  packId?: number;
  packCount?: number;
  qty?: number;
  note?: string;
}

export interface StockInInput extends QuantityInput {
  source: StockInSource;
  /** Supplier, o tindahan para sa emergency purchase (hal. sari-sari store) */
  supplier?: string;
  /** Halagang ibinayad (placeholder para sa expenses) */
  totalCost?: number;
  storeId: number | null;
}

export interface WithdrawInput extends QuantityInput {
  storeId: number | null;
}

export interface WasteInput extends QuantityInput {
  cause: WasteCause;
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
      include: itemInclude,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
    const result = items.map(toItemResponse);
    // Hindi direktang maikukumpara ng Prisma ang dalawang column, kaya dito na sinasala
    return lowStockOnly ? result.filter((i) => i.stockStatus !== 'OK') : result;
  }

  async findItem(id: number) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id }, include: itemInclude });
    if (!item) throw new NotFoundException('Inventory item not found.');
    return toItemResponse(item);
  }

  async createItem(data: CreateItemInput, userId: number) {
    const { initialQty, packs, ...fields } = data;
    assertPacks(packs);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.inventoryItem.create({
          data: {
            ...fields,
            stockQty: initialQty ?? 0,
            packs: { create: withOneDefault(packs).map(({ label, size, isDefault }) => ({ label, size, isDefault })) },
          },
          include: itemInclude,
        });
        if (initialQty) {
          await tx.stockMovement.create({
            data: {
              inventoryItemId: created.id,
              type: StockMovementType.STOCK_IN,
              qty: initialQty,
              balanceAfter: initialQty,
              userId,
              note: 'Initial stock',
            },
          });
        }
        await tx.auditLog.create({
          data: {
            userId,
            action: 'INVENTORY_ITEM_CREATE',
            entity: 'InventoryItem',
            entityId: String(created.id),
            after: toAuditJson(created),
          },
        });
        return toItemResponse(created);
      });
    } catch (error) {
      rethrowPrismaError(error, 'Inventory item');
    }
  }

  // Hindi kasama ang stockQty; dumadaan lang ito sa stock in / withdraw / waste para may movement
  async updateItem(id: number, data: UpdateItemInput, userId: number) {
    const { packs, ...fields } = data;
    if (packs) assertPacks(packs);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const before = await tx.inventoryItem.findUniqueOrThrow({ where: { id }, include: itemInclude });
        await tx.inventoryItem.update({ where: { id }, data: fields });

        if (packs) {
          const keep = withOneDefault(packs);
          const keptIds = keep.filter((p) => p.id).map((p) => p.id!);
          // Ide-deactivate (hindi buburahin) ang tinanggal, kasi may stock-in history na nakaturo rito
          await tx.inventoryPack.updateMany({
            where: { inventoryItemId: id, id: { notIn: keptIds }, isActive: true },
            data: { isActive: false, isDefault: false },
          });
          for (const pack of keep) {
            const values = { label: pack.label, size: pack.size, isDefault: pack.isDefault, isActive: true };
            if (pack.id) {
              await tx.inventoryPack.update({ where: { id: pack.id, inventoryItemId: id }, data: values });
            } else {
              // Kapag may dating naka-deactivate na kapareho ng label, ibinabalik ito
              await tx.inventoryPack.upsert({
                where: { inventoryItemId_label: { inventoryItemId: id, label: pack.label } },
                update: values,
                create: { ...values, inventoryItemId: id },
              });
            }
          }
        }

        const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id }, include: itemInclude });
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

  /** Increment: dumating na delivery, o emergency purchase (hal. oil mula sa sari-sari store) */
  async stockIn(id: number, input: StockInInput, userId: number) {
    const item = await this.getActiveItem(id);
    const { qty, pack } = this.resolveQty(item, input);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.inventoryItem.update({ where: { id }, data: { stockQty: { increment: qty } } });
      const stockIn = await tx.stockIn.create({
        data: {
          clerkId: userId,
          source: input.source,
          supplier: input.supplier,
          totalCost: input.totalCost,
          note: input.note,
          items: {
            create: {
              inventoryItemId: id,
              qty,
              packId: pack?.id,
              packCount: input.packCount,
              unitCost: input.totalCost !== undefined ? round3(input.totalCost / qty) : undefined,
            },
          },
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
          note: this.describe(item, qty, pack, input, input.source === StockInSource.EMERGENCY ? 'Emergency purchase' : undefined),
        },
      });
      // Binabasa sa loob ng transaction para tama ang bagong stock
      const fresh = await tx.inventoryItem.findUniqueOrThrow({ where: { id }, include: itemInclude });
      return { item: toItemResponse(fresh), movementId: movement.id };
    });
  }

  /** Decrement: kumuha ang barista o kitchen ng isang pack/bote mula sa storage */
  async withdraw(id: number, input: WithdrawInput, userId: number) {
    const item = await this.getActiveItem(id);
    const { qty, pack } = this.resolveQty(item, input);

    return this.prisma.$transaction(async (tx) => {
      const balance = await this.decrement(tx, item, qty);
      const movement = await tx.stockMovement.create({
        data: {
          inventoryItemId: id,
          type: StockMovementType.WITHDRAW,
          // Negative ang qty para sa bawas, para madaling i-total sa reports
          qty: -qty,
          balanceAfter: balance,
          userId,
          storeId: input.storeId,
          note: this.describe(item, qty, pack, input),
        },
      });
      // Binabasa sa loob ng transaction para tama ang bagong stock
      const fresh = await tx.inventoryItem.findUniqueOrThrow({ where: { id }, include: itemInclude });
      return { item: toItemResponse(fresh), movementId: movement.id };
    });
  }

  /** Decrement: nasira, napanis (hal. hindi na-ref), expired, natapon */
  async waste(id: number, input: WasteInput, userId: number) {
    const item = await this.getActiveItem(id);
    const { qty, pack } = this.resolveQty(item, input);

    return this.prisma.$transaction(async (tx) => {
      const balance = await this.decrement(tx, item, qty);
      const log = await tx.wasteLog.create({
        data: { inventoryItemId: id, qty, cause: input.cause, reason: input.note, loggedById: userId },
      });
      const movement = await tx.stockMovement.create({
        data: {
          inventoryItemId: id,
          type: StockMovementType.WASTE,
          qty: -qty,
          balanceAfter: balance,
          userId,
          wasteLogId: log.id,
          note: this.describe(item, qty, pack, input, input.cause.charAt(0) + input.cause.slice(1).toLowerCase()),
        },
      });
      // Binabasa sa loob ng transaction para tama ang bagong stock
      const fresh = await tx.inventoryItem.findUniqueOrThrow({ where: { id }, include: itemInclude });
      return { item: toItemResponse(fresh), movementId: movement.id };
    });
  }

  async findMovements(filters: { itemId?: number; type?: StockMovementType; storeId?: number; limit: number }) {
    const movements = await this.prisma.stockMovement.findMany({
      where: {
        ...(filters.itemId ? { inventoryItemId: filters.itemId } : {}),
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.storeId ? { storeId: filters.storeId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit,
      include: {
        inventoryItem: { select: { id: true, name: true, unit: true } },
        user: { select: { username: true, profile: { select: { firstName: true, lastName: true } } } },
        store: { select: { code: true, name: true } },
        stockIn: { select: { source: true, supplier: true, totalCost: true } },
        wasteLog: { select: { cause: true } },
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
      user: m.user.profile ? `${m.user.profile.firstName} ${m.user.profile.lastName}` : (m.user.username ?? 'Unknown'),
      store: m.store,
      source: m.stockIn?.source ?? null,
      supplier: m.stockIn?.supplier ?? null,
      totalCost: m.stockIn?.totalCost?.toNumber() ?? null,
      wasteCause: m.wasteLog?.cause ?? null,
    }));
  }

  /**
   * Placeholder para sa expenses: kabuuang ibinayad sa emergency purchases
   * (hal. oil mula sa sari-sari store) mula sa isang petsa.
   */
  async emergencySummary(since: Date) {
    const purchases = await this.prisma.stockIn.findMany({
      where: { source: StockInSource.EMERGENCY, receivedAt: { gte: since } },
      select: { totalCost: true },
    });
    return {
      since,
      count: purchases.length,
      totalCost: purchases.reduce((sum, p) => sum + (p.totalCost?.toNumber() ?? 0), 0),
    };
  }

  private async getActiveItem(id: number) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id }, include: itemInclude });
    if (!item) throw new NotFoundException('Inventory item not found.');
    if (!item.isActive) throw new BadRequestException(`${item.name} is inactive.`);
    return item;
  }

  /** Atomic na bawas: babawasan lang kung sapat, para hindi mag-negative kahit sabay ang kuha */
  private async decrement(tx: Prisma.TransactionClient, item: ItemWithPacks, qty: number) {
    const { count } = await tx.inventoryItem.updateMany({
      where: { id: item.id, stockQty: { gte: qty } },
      data: { stockQty: { decrement: qty } },
    });
    if (count === 0) {
      const current = await tx.inventoryItem.findUniqueOrThrow({ where: { id: item.id } });
      throw new BadRequestException(
        `Not enough stock. Only ${current.stockQty.toNumber()} ${item.unit} of ${item.name} left.`,
      );
    }
    return (await tx.inventoryItem.findUniqueOrThrow({ where: { id: item.id } })).stockQty;
  }

  /** packCount × laki ng lalagyan, o ang qty mismo */
  private resolveQty(item: ItemWithPacks, input: QuantityInput): { qty: number; pack: Pack | null } {
    if (input.packId !== undefined) {
      const pack = item.packs.find((p) => p.id === input.packId);
      if (!pack) throw new BadRequestException(`That container is not available for ${item.name}.`);
      if (!input.packCount) throw new BadRequestException('Enter how many.');
      return { qty: round3(input.packCount * pack.size.toNumber()), pack };
    }
    if (input.qty === undefined) throw new BadRequestException('Enter a quantity or choose a container.');
    return { qty: input.qty, pack: null };
  }

  private describe(item: ItemWithPacks, qty: number, pack: Pack | null, input: QuantityInput, prefix?: string) {
    const amount = pack
      ? `${input.packCount} ${pack.label.toLowerCase()}(s) = ${qty} ${item.unit}`
      : `${qty} ${item.unit}`;
    return [prefix, amount, input.note].filter(Boolean).join('. ');
  }
}

function assertPacks(packs: PackInput[]) {
  const labels = packs.map((p) => p.label.toLowerCase());
  if (new Set(labels).size !== labels.length) {
    throw new BadRequestException('Each container needs a different name (e.g. Pack and Bottle).');
  }
}

/** Isa lang ang default; kapag wala, ang una */
function withOneDefault(packs: PackInput[]): PackInput[] {
  const index = Math.max(0, packs.findIndex((p) => p.isDefault));
  return packs.map((p, i) => ({ ...p, isDefault: i === index }));
}
