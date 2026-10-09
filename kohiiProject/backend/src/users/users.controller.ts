import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { BulkStatusDto, CreateEmployeeDto, ResetPasswordDto, UpdateEmployeeDto } from './dto/create-user.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { AuthRequest } from '../auth/jwt-payload.js';
import { Role } from '../common/enums/role.enum.js';
import { StaffShift } from '../generated/prisma/client.js';
import { JOBS } from './employee-job.js';
import { nullable, optionalBoolean, optionalString, requireEnum, requireId, requireString } from '../common/utils/validation.js';

const shifts = Object.values(StaffShift);

function optionalUsername(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  const username = requireString(value, 'Username', 30).toLowerCase();
  if (!/^[a-z0-9._]{3,30}$/.test(username)) {
    throw new BadRequestException('Username must be 3-30 characters: letters, numbers, dot or underscore only.');
  }
  return username;
}

function optionalPassword(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || value.length < 6) {
    throw new BadRequestException('Password must be at least 6 characters.');
  }
  if (value.length > 72) throw new BadRequestException('Password is too long.');
  return value;
}

function optionalEmail(value: unknown) {
  const email = optionalString(value, 'Email', 100);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('Please enter a valid email.');
  return email?.toLowerCase();
}

// Employees: lahat ng tauhan. Owner, clerk at cashier lang ang may login; ang barista at kitchen ay wala.
// Owner (ADMIN) lang ang may access.
@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /api/employees
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // POST /api/employees
  @Post()
  create(@Body() body: CreateEmployeeDto, @Req() req: AuthRequest) {
    return this.usersService.create(
      {
        job: requireEnum(body?.job, JOBS, 'Job'),
        username: optionalUsername(body?.username),
        password: optionalPassword(body?.password),
        storeId: body?.storeId ? requireId(body.storeId, 'Store') : null,
        shift: body?.shift ? requireEnum(body.shift, shifts, 'Shift') : null,
        firstName: requireString(body?.firstName, 'First name', 50),
        middleName: optionalString(body?.middleName, 'Middle name', 50),
        lastName: requireString(body?.lastName, 'Last name', 50),
        contactNo: optionalString(body?.contactNo, 'Contact number', 20),
        email: optionalEmail(body?.email),
      },
      req.user.sub,
    );
  }

  // PATCH /api/employees/status  { ids: [1, 2], isActive: false }
  @Patch('status')
  setStatus(@Body() body: BulkStatusDto, @Req() req: AuthRequest) {
    if (!Array.isArray(body?.ids) || body.ids.length === 0) throw new BadRequestException('Select at least one employee.');
    const isActive = optionalBoolean(body?.isActive, 'Status');
    if (isActive === undefined) throw new BadRequestException('Status is required.');
    const ids = [...new Set(body.ids.map((id) => requireId(id, 'Employee')))];
    return this.usersService.setStatus(ids, isActive, req.user.sub);
  }

  // PATCH /api/employees/:id
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateEmployeeDto, @Req() req: AuthRequest) {
    return this.usersService.update(
      requireId(id, 'Employee'),
      {
        job: body?.job === undefined ? undefined : requireEnum(body.job, JOBS, 'Job'),
        username: optionalUsername(body?.username),
        password: optionalPassword(body?.password),
        storeId: nullable(body?.storeId, (v) => requireId(v, 'Store')),
        shift: nullable(body?.shift, (v) => requireEnum(v, shifts, 'Shift')),
        firstName: optionalString(body?.firstName, 'First name', 50),
        middleName: nullable(body?.middleName, (v) => optionalString(v, 'Middle name', 50)),
        lastName: optionalString(body?.lastName, 'Last name', 50),
        contactNo: nullable(body?.contactNo, (v) => optionalString(v, 'Contact number', 20)),
        email: nullable(body?.email, optionalEmail),
        isActive: optionalBoolean(body?.isActive, 'Status'),
      },
      req.user.sub,
    );
  }

  // POST /api/employees/:id/reset-password  { password }  (para sa may login lang)
  @Post(':id/reset-password')
  resetPassword(@Param('id') id: string, @Body() body: ResetPasswordDto, @Req() req: AuthRequest) {
    const password = optionalPassword(body?.password);
    if (!password) throw new BadRequestException('Password is required.');
    return this.usersService.resetPassword(requireId(id, 'Employee'), password, req.user.sub);
  }
}
