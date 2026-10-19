import { Body, Controller, ForbiddenException, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ShiftsService } from './shifts.service.js';
import { OpenShiftDto } from './dto/open-shift.dto.js';
import { CloseShiftDto } from './dto/close-shift.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { AuthRequest } from '../auth/jwt-payload.js';
import { Role } from '../common/enums/role.enum.js';
import { optionalString, requireId, requireQty } from '../common/utils/validation.js';

@Controller('shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CASHIER)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  // GET /api/shifts/active — kasalukuyang bukas na shift ng naka-login na cashier
  @Get('active')
  findActive(@Req() req: AuthRequest) {
    return this.shiftsService.findActive(req.user.sub, this.storeOf(req));
  }

  // POST /api/shifts/open  { openingCash }
  @Post('open')
  open(@Body() body: OpenShiftDto, @Req() req: AuthRequest) {
    return this.shiftsService.open({
      cashierId: req.user.sub,
      storeId: this.storeOf(req),
      openingCash: requireQty(body?.openingCash, 'Opening cash', true),
    });
  }

  // POST /api/shifts/:id/close  { closingCash, note? }
  @Post(':id/close')
  close(@Param('id') id: string, @Body() body: CloseShiftDto, @Req() req: AuthRequest) {
    return this.shiftsService.close(requireId(id, 'Shift'), {
      cashierId: req.user.sub,
      closingCash: requireQty(body?.closingCash, 'Closing cash', true),
      note: optionalString(body?.note, 'Note', 200),
    });
  }

  // Dapat laging may store ang cashier; guarded na ng @Roles(Role.CASHIER)
  private storeOf(req: AuthRequest): number {
    if (req.user.storeId === null) throw new ForbiddenException('Your account is not assigned to a store.');
    return req.user.storeId;
  }
}
