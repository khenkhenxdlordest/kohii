import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { StaffPosition, StaffShift } from '../generated/prisma/client.js';
import { UsersService, employeeSelect } from '../users/users.service.js';
import { jobOf } from '../users/employee-job.js';

@Injectable()
export class StoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async findAll(includeInactive: boolean) {
    const stores = await this.prisma.store.findMany({
      where: includeInactive ? {} : { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        address: true,
        hasKitchen: true,
        isActive: true,
        users: { where: { isActive: true, position: { not: null } }, select: { position: true } },
      },
      orderBy: { id: 'asc' },
    });
    // Bilang ng aktibong staff bawat posisyon
    return stores.map(({ users, ...store }) => ({
      ...store,
      staffCount: Object.fromEntries(
        Object.values(StaffPosition).map((p) => [p, users.filter((u) => u.position === p).length]),
      ) as Record<StaffPosition, number>,
    }));
  }

  /**
   * Ide-deploy ang store staff (cashier, barista, kitchen) sa store na ito, kasama ang shift (AM/PM).
   * Hindi binabago ang trabaho; sa Employees iyon ginagawa.
   */
  async deploy(storeId: number, staff: { userId: number; shift: StaffShift | null }[], actorId: number) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Store not found.');

    const employees = await this.prisma.user.findMany({
      where: { id: { in: staff.map((s) => s.userId) } },
      select: { id: true, role: true, position: true, storeId: true, shift: true },
    });
    if (employees.length !== staff.length) throw new NotFoundException('One or more employees were not found.');
    if (employees.some((e) => e.position === null)) {
      throw new BadRequestException('Only store staff (cashier, barista, kitchen) can be deployed to a store.');
    }

    // Sinusuri ang bawat isa: aktibong store, at kitchen sa store lang na may kitchen
    const plan = await Promise.all(
      staff.map(async (s) => {
        const employee = employees.find((e) => e.id === s.userId)!;
        await this.usersService.assertStore(jobOf(employee), storeId);
        return { employee, shift: s.shift ?? employee.shift };
      }),
    );

    return this.prisma.$transaction(async (tx) => {
      for (const { employee, shift } of plan) {
        await tx.user.update({ where: { id: employee.id }, data: { storeId, shift } });
      }
      await tx.auditLog.createMany({
        data: plan.map(({ employee, shift }) => ({
          userId: actorId,
          action: 'STAFF_DEPLOY',
          entity: 'User',
          entityId: String(employee.id),
          before: { storeId: employee.storeId, shift: employee.shift },
          after: { storeId, shift },
        })),
      });
      return tx.user.findMany({ where: { id: { in: plan.map((p) => p.employee.id) } }, select: employeeSelect });
    });
  }
}
