import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { verifyPassword } from '../common/utils/password.js';
import type { JwtPayload } from './jwt-payload.js';

const userSelect = {
  id: true,
  username: true,
  role: true,
  storeId: true,
  position: true,
  shift: true,
  mustChangePassword: true,
  profile: { select: { firstName: true, lastName: true } },
  store: { select: { code: true, name: true } },
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { ...userSelect, passwordHash: true, isActive: true },
    });

    // Iisang mensahe para hindi malaman kung username o password ang mali
    // Owner, clerk at cashier lang ang may login; ang barista at kitchen ay walang password at role
    if (
      !user ||
      !user.isActive ||
      !user.role ||
      !user.username ||
      !user.passwordHash ||
      !(await verifyPassword(password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid username or password.');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      storeId: user.storeId,
    };
    const { passwordHash: _passwordHash, isActive: _isActive, ...safeUser } = user;

    return { accessToken: await this.jwt.signAsync(payload), user: safeUser };
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true, role: { not: null } },
      select: userSelect,
    });
    if (!user) throw new UnauthorizedException('Account not found or deactivated.');
    return user;
  }
}
