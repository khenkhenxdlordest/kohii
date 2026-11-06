import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { toAuditJson } from '../common/utils/audit.js';
import type { Prisma } from '../generated/prisma/client.js';

const recipeInclude = {
  category: { select: { id: true, name: true, group: true } },
  recipeItems: {
    include: { inventoryItem: { select: { id: true, name: true, unit: true } } },
  },
} satisfies Prisma.ProductInclude;

type ProductWithRecipe = Prisma.ProductGetPayload<{ include: typeof recipeInclude }>;

const toResponse = (product: ProductWithRecipe) => ({
  id: product.id,
  name: product.name,
  category: product.category,
  recipeItems: product.recipeItems.map((r) => ({
    id: r.id,
    inventoryItemId: r.inventoryItemId,
    inventoryItemName: r.inventoryItem.name,
    unit: r.inventoryItem.unit,
    qtyPerUnit: r.qtyPerUnit.toNumber(),
  })),
});

export interface RecipeItemInput {
  inventoryItemId: number;
  qtyPerUnit: number;
}

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      include: recipeInclude,
      orderBy: { name: 'asc' },
    });
    return products.map(toResponse);
  }

  async replaceRecipe(productId: number, items: RecipeItemInput[], userId: number) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found.');

    const ids = [...new Set(items.map((i) => i.inventoryItemId))];
    if (ids.length !== items.length) throw new BadRequestException('Each ingredient can only be listed once.');

    if (ids.length > 0) {
      const found = await this.prisma.inventoryItem.findMany({ where: { id: { in: ids }, isActive: true } });
      if (found.length !== ids.length) throw new BadRequestException('One or more ingredients are invalid or inactive.');
    }

    const before = await this.prisma.recipeItem.findMany({ where: { productId } });

    await this.prisma.$transaction(async (tx) => {
      await tx.recipeItem.deleteMany({ where: { productId } });
      if (items.length > 0) {
        await tx.recipeItem.createMany({
          data: items.map((i) => ({ productId, inventoryItemId: i.inventoryItemId, qtyPerUnit: i.qtyPerUnit })),
        });
      }
      await tx.auditLog.create({
        data: {
          userId,
          action: 'RECIPE_UPDATE',
          entity: 'Product',
          entityId: String(productId),
          before: toAuditJson(before),
          after: toAuditJson(items),
        },
      });
    });

    const updated = await this.prisma.product.findUniqueOrThrow({ where: { id: productId }, include: recipeInclude });
    return toResponse(updated);
  }
}
