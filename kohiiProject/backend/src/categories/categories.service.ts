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
    // Kapag ginawang hindi drinks, dapat walang product na may upsize sa category na ito
    if (data.group && data.group !== CategoryGroup.DRINKS) {
      const withUpsize = await this.prisma.product.count({ where: { categoryId: id, upsizePrice: { not: null } } });
      if (withUpsize > 0) {
        throw new BadRequestException(
          `${withUpsize} product(s) in this category have an upsize price. Remove their upsize first.`,
        );
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
