import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../common/enums/role.enum.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { AuthRequest } from '../jwt-payload.js';

// Dapat nakalagay pagkatapos ng JwtAuthGuard: @UseGuards(JwtAuthGuard, RolesGuard)
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;

    const { user } = context.switchToHttp().getRequest<AuthRequest>();
    if (!roles.includes(user.role)) {
      throw new ForbiddenException('You are not allowed to do this.');
    }
    return true;
  }
}
