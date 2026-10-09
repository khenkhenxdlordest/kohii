import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CategoryGroup, ProductSize, ProductType, type Prisma } from '../generated/prisma/client.js';
import { rethrowPrismaError } from '../common/utils/prisma-errors.js';
import { toAuditJson } from '../common/utils/audit.js';

const productInclude = { category: { select: { id: true, name: true, group: true } } } as const;

const NO_UPSIZE_MESSAGE = 'Only drinks can have an upsize price. Rice meals and snacks have one price only.';

type ProductWithCategory = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

// Decimal → number para madaling gamitin sa frontend
const toResponse = ({ currentPrice, upsizePrice, ...product }: ProductWithCategory) => ({
  ...product,
  currentPrice: currentPrice.toNumber(),
  upsizePrice: upsizePrice?.toNumber() ?? null,
});

// Puwedeng magkapareho ang presyo, pero hindi puwedeng mas mura ang upsize kaysa regular
function assertUpsizeNotLower(regular: number, upsize: number) {
  if (upsize < regular) {
    throw new BadRequestException('Upsize price cannot be lower than the regular price.');
  }
}

export interface ProductFilters {
  search?: string;
  categoryId?: number;
  includeInactive: boolean;
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll({ search, categoryId, includeInactive }: ProductFilters) {
    const products = await this.prisma.product.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(categoryId ? { categoryId } : {}),
        ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
      },
      include: productInclude,
      orderBy: [{ category: { group: 'asc' } }, { category: { name: 'asc' } }, { name: 'asc' }],
    });
    return products.map(toResponse);
  }

  async findOne(id: number) {
    try {
      const product = await this.prisma.product.findUniqueOrThrow({ where: { id }, include: productInclude });
      const history = await this.prisma.productPriceHistory.findMany({
        where: { productId: id },
        orderBy: { changedAt: 'desc' },
        take: 20,
        include: { changedBy: { select: { username: true } } },
      });
      return {
        ...toResponse(product),
        priceHistory: history.map((h) => ({
          id: h.id,
          size: h.size,
          oldPrice: h.oldPrice?.toNumber() ?? null,
          newPrice: h.newPrice?.toNumber() ?? null,
          reason: h.reason,
          changedAt: h.changedAt,
          changedBy: h.changedBy.username,
        })),
      };
    } catch (error) {
      rethrowPrismaError(error, 'Product');
    }
  }

  async create(
    data: { name: string; categoryId: number; type: ProductType; price: number; upsizePrice?: number },
    userId: number,
  ) {
    const category = await this.assertCategoryActive(data.categoryId);
    if (data.upsizePrice !== undefined) {
      if (category.group !== CategoryGroup.DRINKS) throw new BadRequestException(NO_UPSIZE_MESSAGE);
      assertUpsizeNotLower(data.price, data.upsizePrice);
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            name: data.name,
            categoryId: data.categoryId,
            type: data.type,
            currentPrice: data.price,
            upsizePrice: data.upsizePrice,
          },
          include: productInclude,
        });
        await tx.productPriceHistory.createMany({
          data: [
            { productId: product.id, size: ProductSize.REGULAR, oldPrice: null, newPrice: data.price, changedById: userId, reason: 'Initial price' },
            ...(data.upsizePrice !== undefined
              ? [{ productId: product.id, size: ProductSize.UPSIZE, oldPrice: null, newPrice: data.upsizePrice, changedById: userId, reason: 'Initial price' }]
              : []),
          ],
        });
        await tx.auditLog.create({
          data: {
            userId,
            action: 'PRODUCT_CREATE',
            entity: 'Product',
            entityId: String(product.id),
            after: toAuditJson(product),
          },
        });
        return toResponse(product);
      });
    } catch (error) {
      rethrowPrismaError(error, 'Product');
    }
  }

  // Hindi kasama ang presyo dito; gamitin ang changePrice para may history
  async update(
    id: number,
    data: { name?: string; categoryId?: number; type?: ProductType; isActive?: boolean },
    userId: number,
  ) {
    const newCategory = data.categoryId ? await this.assertCategoryActive(data.categoryId) : null;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const before = await tx.product.findUniqueOrThrow({ where: { id } });
        // Bawal ilipat sa rice meals o snacks habang may upsize pa
        if (newCategory && newCategory.group !== CategoryGroup.DRINKS && before.upsizePrice !== null) {
          throw new BadRequestException('Remove the upsize price first before moving this product out of drinks.');
        }
        const product = await tx.product.update({ where: { id }, data, include: productInclude });
        await tx.auditLog.create({
          data: {
            userId,
            action: data.isActive === false ? 'PRODUCT_DEACTIVATE' : 'PRODUCT_UPDATE',
            entity: 'Product',
            entityId: String(id),
            before: toAuditJson(before),
            after: toAuditJson(product),
          },
        });
        return toResponse(product);
      });
    } catch (error) {
      rethrowPrismaError(error, 'Product');
    }
  }

  /**
   * Pinapalitan ang presyo ng isang size. Para sa UPSIZE, ang `price = null` ay pagtanggal ng upsize.
   * Bawat palit ay may ProductPriceHistory at AuditLog.
   */
  async changePrice(id: number, size: ProductSize, price: number | null, reason: string | undefined, userId: number) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const before = await tx.product.findUniqueOrThrow({ where: { id }, include: productInclude });
        if (size === ProductSize.UPSIZE && price !== null && before.category.group !== CategoryGroup.DRINKS) {
          throw new BadRequestException(NO_UPSIZE_MESSAGE);
        }
        const regular = before.currentPrice.toNumber();
        const upsize = before.upsizePrice?.toNumber() ?? null;
        const oldPrice = size === ProductSize.REGULAR ? regular : upsize;

        if (price === null && size === ProductSize.REGULAR) {
          throw new BadRequestException('Regular price is required.');
        }
        if (price === null && upsize === null) {
          throw new BadRequestException('This product has no upsize to remove.');
        }
        if (oldPrice === price) {
          throw new BadRequestException('The new price is the same as the current price.');
        }
        if (price !== null) {
          if (size === ProductSize.REGULAR && upsize !== null) assertUpsizeNotLower(price, upsize);
          if (size === ProductSize.UPSIZE) assertUpsizeNotLower(regular, price);
        }

        const product = await tx.product.update({
          where: { id },
          data: size === ProductSize.REGULAR ? { currentPrice: price! } : { upsizePrice: price },
          include: productInclude,
        });
        await tx.productPriceHistory.create({
          data: { productId: id, size, oldPrice, newPrice: price, changedById: userId, reason },
        });
        await tx.auditLog.create({
          data: {
            userId,
            action: price === null ? 'UPSIZE_REMOVE' : 'PRICE_CHANGE',
            entity: 'Product',
            entityId: String(id),
            before: { size, price: oldPrice },
            after: { size, price, reason: reason ?? null },
          },
        });
        return toResponse(product);
      });
    } catch (error) {
      rethrowPrismaError(error, 'Product');
    }
  }

  private async assertCategoryActive(categoryId: number) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category || !category.isActive) throw new BadRequestException('Please choose an active category.');
    return category;
  }
}
