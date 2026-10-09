import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { StoresService } from './stores.service.js';
import { DeployStaffDto } from './dto/deploy-staff.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { AuthRequest } from '../auth/jwt-payload.js';
import { Role } from '../common/enums/role.enum.js';
import { StaffShift } from '../generated/prisma/client.js';
import { requireEnum, requireId } from '../common/utils/validation.js';

const shifts = Object.values(StaffShift);

@Controller('stores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  // GET /api/stores?includeInactive=true  (kasama ang bilang ng staff bawat posisyon)
  @Get()
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.storesService.findAll(includeInactive === 'true');
  }

  // POST /api/stores/:id/deploy  { staff: [{ userId: 3, shift: 'AM' }] }
  @Post(':id/deploy')
  @Roles(Role.ADMIN)
  deploy(@Param('id') id: string, @Body() body: DeployStaffDto, @Req() req: AuthRequest) {
    if (!Array.isArray(body?.staff) || body.staff.length === 0) {
      throw new BadRequestException('Choose at least one staff member to deploy.');
    }
    const staff = body.staff.map((s) => ({
      userId: requireId(s?.userId, 'Staff'),
      shift: s?.shift ? requireEnum(s.shift, shifts, 'Shift') : null,
    }));
    if (new Set(staff.map((s) => s.userId)).size !== staff.length) {
      throw new BadRequestException('A staff member was listed twice.');
    }
    return this.storesService.deploy(requireId(id, 'Store'), staff, req.user.sub);
  }
}
