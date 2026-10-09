import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { ChangePriceDto, CreateProductDto, UpdateProductDto } from './dto/create-product.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { AuthRequest } from '../auth/jwt-payload.js';
import { Role } from '../common/enums/role.enum.js';
import { ProductSize, ProductType } from '../generated/prisma/client.js';
import {
  optionalBoolean,
  optionalString,
  requireEnum,
  requireId,
  requirePrice,
  requireString,
} from '../common/utils/validation.js';

const productTypes = Object.values(ProductType);
const productSizes = Object.values(ProductSize);

function parsePrices(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) throw new BadRequestException('Enter at least one price.');
  return value.map((p: Record<string, unknown>) => ({
    size: requireEnum(p?.size, productSizes, 'Size'),
    price: requirePrice(p?.price),
  }));
}

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // GET /api/products?search=latte&categoryId=1&includeInactive=true
  @Get()
  findAll(
    @Req() req: AuthRequest,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.productsService.findAll({
      search: search?.trim() || undefined,
      categoryId: categoryId ? requireId(categoryId, 'Category') : undefined,
      // Admin lang ang nakakakita ng naka-deactivate
      includeInactive: includeInactive === 'true' && req.user.role === Role.ADMIN,
    });
  }

  // GET /api/products/:id (kasama ang price history)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(requireId(id, 'Product'));
  }

  // POST /api/products
  @Post()
  @Roles(Role.ADMIN)
  create(@Body() body: CreateProductDto, @Req() req: AuthRequest) {
    return this.productsService.create(
      {
        name: requireString(body?.name, 'Name', 80),
        categoryId: requireId(body?.categoryId, 'Category'),
        type: requireEnum(body?.type, productTypes, 'Type'),
        prices: parsePrices(body?.prices),
      },
      req.user.sub,
    );
  }

  // PATCH /api/products/:id
  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() body: UpdateProductDto, @Req() req: AuthRequest) {
    return this.productsService.update(
      requireId(id, 'Product'),
      {
        name: optionalString(body?.name, 'Name', 80),
        categoryId: body?.categoryId === undefined ? undefined : requireId(body.categoryId, 'Category'),
        type: body?.type === undefined ? undefined : requireEnum(body.type, productTypes, 'Type'),
        isActive: optionalBoolean(body?.isActive, 'Status'),
      },
      req.user.sub,
    );
  }

  // PATCH /api/products/:id/price  { size: 'REGULAR' | 'HOT' | 'ICED' | 'UPSIZE', price, reason }
  // Para tanggalin ang presyo ng isang size: { size: 'UPSIZE', price: null }
  @Patch(':id/price')
  @Roles(Role.ADMIN)
  changePrice(@Param('id') id: string, @Body() body: ChangePriceDto, @Req() req: AuthRequest) {
    const size = requireEnum(body?.size, productSizes, 'Size');
    return this.productsService.changePrice(
      requireId(id, 'Product'),
      size,
      body?.price === null ? null : requirePrice(body?.price),
      optionalString(body?.reason, 'Reason', 200),
      req.user.sub,
    );
  }
}
