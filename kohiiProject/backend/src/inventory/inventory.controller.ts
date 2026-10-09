import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { InventoryService, type PackInput } from './inventory.service.js';
import { AdjustStockDto, CreateInventoryItemDto, UpdateInventoryItemDto } from './dto/adjust-stock.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { AuthRequest } from '../auth/jwt-payload.js';
import { Role } from '../common/enums/role.enum.js';
import { InventoryItemType, StockInSource, StockMovementType, Unit, WasteCause } from '../generated/prisma/client.js';
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
const sources = Object.values(StockInSource);
const causes = Object.values(WasteCause);

/** null sa body = burahin ang value; undefined = huwag galawin */
const nullable = <T>(value: unknown, parse: (v: unknown) => T | undefined): T | null | undefined =>
  value === undefined ? undefined : value === null ? null : parse(value);

function parsePacks(value: unknown): PackInput[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new BadRequestException('Containers must be a list.');
  if (value.length > 10) throw new BadRequestException('Too many containers.');
  return value.map((p: Record<string, unknown>) => ({
    id: p?.id === undefined || p?.id === null ? undefined : requireId(p.id, 'Container'),
    label: requireString(p?.label, 'Container name', 30),
    size: requireQty(p?.size, 'Container size'),
    isDefault: p?.isDefault === true,
  }));
}

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

  // GET /api/inventory/emergency-summary?since=2026-10-01  (placeholder para sa expenses)
  @Get('emergency-summary')
  @Roles(Role.ADMIN, Role.CLERK)
  emergencySummary(@Query('since') since?: string) {
    const now = new Date();
    const date = since ? new Date(since) : new Date(now.getFullYear(), now.getMonth(), 1);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid date.');
    return this.inventoryService.emergencySummary(date);
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
        unitCost: optionalQty(body?.unitCost, 'Unit cost', true),
        packs: parsePacks(body?.packs),
        initialQty: optionalQty(body?.initialQty, 'Initial stock', true),
      },
      req.user.sub,
    );
  }

  // PATCH /api/inventory/items/:id (hindi kasama ang stock; gamitin ang stock-in / withdraw / waste)
  @Patch('items/:id')
  @Roles(Role.ADMIN, Role.CLERK)
  updateItem(@Param('id') id: string, @Body() body: UpdateInventoryItemDto, @Req() req: AuthRequest) {
    if (body && 'stockQty' in body) {
      throw new BadRequestException('Stock cannot be edited directly. Use stock in, withdraw or waste.');
    }
    return this.inventoryService.updateItem(
      requireId(id, 'Item'),
      {
        name: optionalString(body?.name, 'Name', 80),
        type: body?.type === undefined ? undefined : requireEnum(body.type, itemTypes, 'Type'),
        lowStockThreshold: optionalQty(body?.lowStockThreshold, 'Low stock level', true),
        unitCost: nullable(body?.unitCost, (v) => optionalQty(v, 'Unit cost', true)),
        isActive: optionalBoolean(body?.isActive, 'Status'),
        packs: body?.packs === undefined ? undefined : parsePacks(body.packs),
      },
      req.user.sub,
    );
  }

  // POST /api/inventory/items/:id/stock-in
  // { packId, packCount } o { qty }, at { source: 'SUPPLIER' | 'EMERGENCY', supplier, totalCost }
  @Post('items/:id/stock-in')
  @Roles(Role.ADMIN, Role.CLERK)
  stockIn(@Param('id') id: string, @Body() body: AdjustStockDto, @Req() req: AuthRequest) {
    return this.inventoryService.stockIn(
      requireId(id, 'Item'),
      {
        ...this.parseQuantity(body),
        source: body?.source ? requireEnum(body.source, sources, 'Source') : StockInSource.SUPPLIER,
        supplier: optionalString(body?.supplier, 'Supplier', 80),
        totalCost: optionalQty(body?.totalCost, 'Amount paid', true),
        storeId: this.storeOf(body, req),
      },
      req.user.sub,
    );
  }

  // POST /api/inventory/items/:id/withdraw  { packId, packCount } o { qty }
  // Cashier, clerk at owner lang ang may login; sila ang nagtatala ng kinuha ng barista/kitchen
  @Post('items/:id/withdraw')
  @Roles(Role.ADMIN, Role.CLERK, Role.CASHIER)
  withdraw(@Param('id') id: string, @Body() body: AdjustStockDto, @Req() req: AuthRequest) {
    return this.inventoryService.withdraw(
      requireId(id, 'Item'),
      { ...this.parseQuantity(body), storeId: this.storeOf(body, req) },
      req.user.sub,
    );
  }

  // POST /api/inventory/items/:id/waste  { packId, packCount } o { qty }, at { cause, note }
  @Post('items/:id/waste')
  @Roles(Role.ADMIN, Role.CLERK)
  waste(@Param('id') id: string, @Body() body: AdjustStockDto, @Req() req: AuthRequest) {
    return this.inventoryService.waste(
      requireId(id, 'Item'),
      { ...this.parseQuantity(body), cause: body?.cause ? requireEnum(body.cause, causes, 'Reason') : WasteCause.OTHER },
      req.user.sub,
    );
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

  private parseQuantity(body: AdjustStockDto) {
    const packId = body?.packId === undefined || body.packId === null ? undefined : requireId(body.packId, 'Container');
    return {
      packId,
      packCount: packId === undefined ? undefined : requireQty(body?.packCount, 'How many'),
      qty: packId === undefined ? requireQty(body?.qty) : undefined,
      note: optionalString(body?.note, 'Note', 200),
    };
  }

  // Ang cashier ay laging sa sariling store; ang admin/clerk ay puwedeng pumili
  private storeOf(body: AdjustStockDto, req: AuthRequest) {
    return req.user.storeId ?? (body?.storeId ? requireId(body.storeId, 'Store') : null);
  }
}
