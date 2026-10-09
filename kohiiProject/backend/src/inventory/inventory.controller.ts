import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service.js';
import { AdjustStockDto, CreateInventoryItemDto, UpdateInventoryItemDto } from './dto/adjust-stock.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { AuthRequest } from '../auth/jwt-payload.js';
import { Role } from '../common/enums/role.enum.js';
import { InventoryItemType, StockMovementType, Unit } from '../generated/prisma/client.js';
import {
  optionalBoolean,
  optionalQty,
  optionalString,
  requireEnum,
  requireId,
  requireQty,
  requireString,
} from '../common/utils/validation.js';

const itemTypes = Object.values(InventoryItemType);
const units = Object.values(Unit);
const movementTypes = Object.values(StockMovementType);

/** null sa body = burahin ang value; undefined = huwag galawin */
const nullable = <T>(value: unknown, parse: (v: unknown) => T | undefined): T | null | undefined =>
  value === null ? null : parse(value);

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // GET /api/inventory/items?type=RAW_MATERIAL&search=milk&lowStock=true&includeInactive=true
  @Get('items')
  findItems(
    @Req() req: AuthRequest,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('lowStock') lowStock?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.inventoryService.findItems({
      type: type ? requireEnum(type, itemTypes, 'Type') : undefined,
      search: search?.trim() || undefined,
      lowStockOnly: lowStock === 'true',
      includeInactive: includeInactive === 'true' && req.user.role !== Role.CASHIER,
    });
  }

  // GET /api/inventory/low-stock (mababa o ubos na)
  @Get('low-stock')
  findLowStock() {
    return this.inventoryService.findItems({ lowStockOnly: true, includeInactive: false });
  }

  // GET /api/inventory/items/:id
  @Get('items/:id')
  findItem(@Param('id') id: string) {
    return this.inventoryService.findItem(requireId(id, 'Item'));
  }

  // POST /api/inventory/items
  @Post('items')
  @Roles(Role.ADMIN, Role.CLERK)
  createItem(@Body() body: CreateInventoryItemDto, @Req() req: AuthRequest) {
    return this.inventoryService.createItem(
      {
        name: requireString(body?.name, 'Name', 80),
        type: requireEnum(body?.type, itemTypes, 'Type'),
        unit: requireEnum(body?.unit, units, 'Unit'),
        lowStockThreshold: optionalQty(body?.lowStockThreshold, 'Low stock level', true) ?? 0,
        packSize: optionalQty(body?.packSize, 'Pack size'),
        packLabel: optionalString(body?.packLabel, 'Pack label', 30),
        unitCost: optionalQty(body?.unitCost, 'Unit cost', true),
        initialQty: optionalQty(body?.initialQty, 'Initial stock', true),
      },
      req.user.sub,
    );
  }

  // PATCH /api/inventory/items/:id (hindi kasama ang stock; gamitin ang stock-in / withdraw)
  @Patch('items/:id')
  @Roles(Role.ADMIN, Role.CLERK)
  updateItem(@Param('id') id: string, @Body() body: UpdateInventoryItemDto, @Req() req: AuthRequest) {
    if (body && 'stockQty' in body) {
      throw new BadRequestException('Stock cannot be edited directly. Use stock in or withdraw.');
    }
    return this.inventoryService.updateItem(
      requireId(id, 'Item'),
      {
        name: optionalString(body?.name, 'Name', 80),
        type: body?.type === undefined ? undefined : requireEnum(body.type, itemTypes, 'Type'),
        lowStockThreshold: optionalQty(body?.lowStockThreshold, 'Low stock level', true),
        packSize: nullable(body?.packSize, (v) => optionalQty(v, 'Pack size')),
        packLabel: nullable(body?.packLabel, (v) => optionalString(v, 'Pack label', 30)),
        unitCost: nullable(body?.unitCost, (v) => optionalQty(v, 'Unit cost', true)),
        isActive: optionalBoolean(body?.isActive, 'Status'),
      },
      req.user.sub,
    );
  }

  // POST /api/inventory/items/:id/stock-in  { packs: 2 } o { qty: 500 }  → increment
  @Post('items/:id/stock-in')
  @Roles(Role.ADMIN, Role.CLERK)
  stockIn(@Param('id') id: string, @Body() body: AdjustStockDto, @Req() req: AuthRequest) {
    return this.inventoryService.stockIn(requireId(id, 'Item'), this.parseAdjust(body, req), req.user.sub);
  }

  // POST /api/inventory/items/:id/withdraw  { packs: 1 } o { qty: 1000 }  → decrement
  // TODO: kumpirmahin sa store kung sino ang kumukuha (barista/cashier, clerk, o pareho)
  @Post('items/:id/withdraw')
  @Roles(Role.ADMIN, Role.CLERK, Role.CASHIER)
  withdraw(@Param('id') id: string, @Body() body: AdjustStockDto, @Req() req: AuthRequest) {
    return this.inventoryService.withdraw(requireId(id, 'Item'), this.parseAdjust(body, req), req.user.sub);
  }

  // GET /api/inventory/movements?itemId=1&type=WITHDRAW&storeId=1&limit=50
  @Get('movements')
  @Roles(Role.ADMIN, Role.CLERK)
  findMovements(
    @Query('itemId') itemId?: string,
    @Query('type') type?: string,
    @Query('storeId') storeId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.findMovements({
      itemId: itemId ? requireId(itemId, 'Item') : undefined,
      type: type ? requireEnum(type, movementTypes, 'Type') : undefined,
      storeId: storeId ? requireId(storeId, 'Store') : undefined,
      limit: Math.min(Math.max(Number(limit) || 50, 1), 200),
    });
  }

  private parseAdjust(body: AdjustStockDto, req: AuthRequest) {
    const packs = optionalQty(body?.packs, 'Packs');
    const qty = packs === undefined ? requireQty(body?.qty) : undefined;
    return {
      packs,
      qty,
      note: optionalString(body?.note, 'Note', 200),
      supplier: optionalString(body?.supplier, 'Supplier', 80),
      // Ang cashier ay laging sa sariling store; ang admin/clerk ay puwedeng pumili
      storeId: req.user.storeId ?? (body?.storeId ? requireId(body.storeId, 'Store') : null),
    };
  }
}
