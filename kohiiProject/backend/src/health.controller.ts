import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    const [stores, users, products, inventoryItems] = await Promise.all([
      this.prisma.store.count(),
      this.prisma.user.count(),
      this.prisma.product.count(),
      this.prisma.inventoryItem.count(),
    ]);
    return { status: 'ok', database: 'connected', counts: { stores, users, products, inventoryItems } };
  }
}
