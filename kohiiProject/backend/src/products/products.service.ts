import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CategoryGroup, ProductSize, ProductType, type Prisma } from '../generated/prisma/client.js';
import { rethrowPrismaError } from '../common/utils/prisma-errors.js';
import { toAuditJson } from '../common/utils/audit.js';

/** Drinks: Hot (12oz), Iced (16oz), Upsize (22oz). Iba pa: isang presyo (REGULAR). */
export const DRINK_SIZES: ProductSize[] = [ProductSize.HOT, ProductSize.ICED, ProductSize.UPSIZE];
const SIZE_ORDER: ProductSize[] = [ProductSize.REGULAR, ...DRINK_SIZES];

const productInclude = {
  category: { select: { id: true, name: true, group: true } },
  prices: { select: { size: true, price: true } },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

export interface SizePrice {
  size: ProductSize;
  price: number;
}

// Decimal → number, at nakaayos ang presyo: Regular, Hot, Iced, Upsize
const toResponse = ({ prices, ...product }: ProductWithRelations) => ({
  ...product,
  prices: prices
    .map((p) => ({ size: p.size, price: p.price.toNumber() }))
    .sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size)),
});

/**
 * Patakaran sa presyo:
 * - Drinks: Hot, Iced o Upsize lang; kailangan ng Hot o Iced. Hindi puwedeng mas mura ang Upsize kaysa Iced.
 * - Rice meals at snacks: isang presyo lang (REGULAR).
 */
function assertPrices(group: CategoryGroup, prices: SizePrice[]) {
  const sizes = prices.map((p) => p.size);
  if (new Set(sizes).size !== sizes.length) throw new BadRequestException('Each size can only have one price.');

  if (group !== CategoryGroup.DRINKS) {
    if (prices.length !== 1 || sizes[0] !== ProductSize.REGULAR) {
      throw new BadRequestException('Rice meals and snacks have one price only.');
    }
    return;
  }
  if (sizes.includes(ProductSize.REGULAR)) {
    throw new BadRequestException('Drinks are priced as Hot, Iced or Upsize.');
  }
  if (!sizes.includes(ProductSize.HOT) && !sizes.includes(ProductSize.ICED)) {
    throw new BadRequestException('A drink needs a Hot or Iced price.');
  }
  const iced = prices.find((p) => p.size === ProductSize.ICED)?.price;
  const upsize = prices.find((p) => p.size === ProductSize.UPSIZE)?.price;
  if (iced !== undefined && upsize !== undefined && upsize < iced) {
    throw new BadRequestException('Upsize price cannot be lower than the Iced price.');
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
        take: 30,
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
          changedBy: h.changedBy.username ?? 'Unknown',
        })),
      };
    } catch (error) {
      rethrowPrismaError(error, 'Product');
    }
  }

  async create(data: { name: string; categoryId: number; type: ProductType; prices: SizePrice[] }, userId: number) {
    const category = await this.assertCategoryActive(data.categoryId);
    assertPrices(category.group, data.prices);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: { name: data.name, categoryId: data.categoryId, type: data.type, prices: { create: data.prices } },
          include: productInclude,
        });
        await tx.productPriceHistory.createMany({
          data: data.prices.map((p) => ({
            productId: product.id,
            size: p.size,
            oldPrice: null,
            newPrice: p.price,
            changedById: userId,
            reason: 'Initial price',
          })),
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
    data: { name?: string; categoryId?: number; type?: ProductType; isActive?: boolean; imageUrl?: string },
    userId: number,
  ) {
    const newCategory = data.categoryId ? await this.assertCategoryActive(data.categoryId) : null;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const before = await tx.product.findUniqueOrThrow({ where: { id }, include: productInclude });
        // Magkaiba ang presyo ng drinks (Hot/Iced/Upsize) at ng iba (isang presyo), kaya hindi puwedeng maglipat
        const wasDrink = before.category.group === CategoryGroup.DRINKS;
        if (newCategory && (newCategory.group === CategoryGroup.DRINKS) !== wasDrink) {
          throw new BadRequestException(
            'Drinks and food are priced differently. Move it within the same menu group, or add it as a new product.',
          );
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
   * Itinatakda, idinadagdag o tinatanggal (price = null) ang presyo ng isang size.
   * Bawat palit ay may ProductPriceHistory at AuditLog.
   */
  async changePrice(id: number, size: ProductSize, price: number | null, reason: string | undefined, userId: number) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const before = await tx.product.findUniqueOrThrow({ where: { id }, include: productInclude });
        const current = before.prices.map((p) => ({ size: p.size, price: p.price.toNumber() }));
        const oldPrice = current.find((p) => p.size === size)?.price ?? null;

        if (price === null && oldPrice === null) throw new BadRequestException('This size has no price to remove.');
        if (oldPrice === price) throw new BadRequestException('The new price is the same as the current price.');

        // Sinusuri ang magiging listahan ng presyo pagkatapos ng palit
        const next =
          price === null
            ? current.filter((p) => p.size !== size)
            : [...current.filter((p) => p.size !== size), { size, price }];
        assertPrices(before.category.group, next);

        if (price === null) {
          await tx.productPrice.delete({ where: { productId_size: { productId: id, size } } });
        } else {
          await tx.productPrice.upsert({
            where: { productId_size: { productId: id, size } },
            update: { price },
            create: { productId: id, size, price },
          });
        }
        await tx.productPriceHistory.create({
          data: { productId: id, size, oldPrice, newPrice: price, changedById: userId, reason },
        });
        await tx.auditLog.create({
          data: {
            userId,
            action: price === null ? 'PRICE_REMOVE' : oldPrice === null ? 'PRICE_ADD' : 'PRICE_CHANGE',
            entity: 'Product',
            entityId: String(id),
            before: { size, price: oldPrice },
            after: { size, price, reason: reason ?? null },
          },
        });
        return toResponse(await tx.product.findUniqueOrThrow({ where: { id }, include: productInclude }));
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
