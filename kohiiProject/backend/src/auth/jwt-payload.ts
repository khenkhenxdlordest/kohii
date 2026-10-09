import type { Request } from 'express';
import { Role } from '../common/enums/role.enum.js';

export interface JwtPayload {
  sub: number;
  username: string;
  role: Role;
  storeId: number | null;
}

export interface AuthRequest extends Request {
  user: JwtPayload;
}
