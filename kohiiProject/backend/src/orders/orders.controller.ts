import { BadRequestException, Body, Controller, ForbiddenException, Post, Req, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { AuthRequest } from '../auth/jwt-payload.js';
import { Role } from '../common/enums/role.enum.js';
import { DiscountType, PaymentMethod, ProductSize } from '../generated/prisma/client.js';
import { optionalQty, optionalString, requireEnum, requireId, requireQty } from '../common/utils/validation.js';

const paymentMethods = Object.values(PaymentMethod);
const discountTypes = Object.values(DiscountType);
const productSizes = Object.values(ProductSize);

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CASHIER)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // POST /api/orders
  @Post()
  create(@Body() body: CreateOrderDto, @Req() req: AuthRequest) {
    if (!Array.isArray(body?.items) || body.items.length === 0) {
      throw new BadRequestException('Add at least one item.');
    }
    return this.ordersService.create(
      {
        items: body.items.map((item) => ({
          productId: requireId(item?.productId, 'Product'),
          size: requireEnum(item?.size, productSizes, 'Size'),
          qty: requireQty(item?.qty, 'Quantity'),
        })),
        paymentMethod: requireEnum(body?.paymentMethod, paymentMethods, 'Payment method'),
        discountType: requireEnum(body?.discountType, discountTypes, 'Discount type'),
        discountPercent: optionalQty(body?.discountPercent, 'Discount percent', true),
        amountTendered: optionalQty(body?.amountTendered, 'Amount tendered', true),
        referenceNo: optionalString(body?.referenceNo, 'Reference number', 60),
      },
      req.user.sub,
      this.storeOf(req),
    );
  }

  // Dapat laging may store ang cashier; guarded na ng @Roles(Role.CASHIER)
  private storeOf(req: AuthRequest): number {
    if (req.user.storeId === null) throw new ForbiddenException('Your account is not assigned to a store.');
    return req.user.storeId;
  }
}
