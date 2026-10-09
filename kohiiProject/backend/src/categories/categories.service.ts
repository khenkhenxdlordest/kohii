import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CategoryGroup } from '../generated/prisma/client.js';
import { rethrowPrismaError } from '../common/utils/prisma-errors.js';
import { toAuditJson } from '../common/utils/audit.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(includeInactive: boolean) {
    const categories = await this.prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ group: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
    return categories.map(({ _count, ...category }) => ({ ...category, productCount: _count.products }));
  }

  async create(data: { name: string; group: CategoryGroup }, userId: number) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const category = await tx.category.create({ data });
        await tx.auditLog.create({
          data: {
            userId,
            action: 'CATEGORY_CREATE',
            entity: 'Category',
            entityId: String(category.id),
            after: toAuditJson(category),
          },
        });
        return category;
      });
    } catch (error) {
      rethrowPrismaError(error, 'Category');
    }
  }

  async update(id: number, data: { name?: string; group?: CategoryGroup; isActive?: boolean }, userId: number) {
    // Magkaiba ang presyo ng drinks (Hot/Iced/Upsize) at ng food (isang presyo),
    // kaya hindi puwedeng ilipat ng grupo ang category na may laman na
    if (data.group) {
      const current = await this.prisma.category.findUnique({ where: { id } });
      const switchesKind =
        current && (current.group === CategoryGroup.DRINKS) !== (data.group === CategoryGroup.DRINKS);
      if (switchesKind) {
        const count = await this.prisma.product.count({ where: { categoryId: id } });
        if (count > 0) {
          throw new BadRequestException(
            `This category has ${count} product(s). Drinks and food are priced differently, so it cannot switch between them.`,
          );
        }
      }
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const before = await tx.category.findUniqueOrThrow({ where: { id } });
        const category = await tx.category.update({ where: { id }, data });
        await tx.auditLog.create({
          data: {
            userId,
            action: data.isActive === false ? 'CATEGORY_DEACTIVATE' : 'CATEGORY_UPDATE',
            entity: 'Category',
            entityId: String(id),
            before: toAuditJson(before),
            after: toAuditJson(category),
          },
        });
        return category;
      });
    } catch (error) {
      rethrowPrismaError(error, 'Category');
    }
  }
}
