import { SetMetadata } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum.js';

export const ROLES_KEY = 'roles';

// Gamit: @Roles(Role.ADMIN) sa controller o method, kasama ng JwtAuthGuard + RolesGuard
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
