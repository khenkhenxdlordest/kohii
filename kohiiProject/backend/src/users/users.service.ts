import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { StaffShift } from '../generated/prisma/client.js';
import { hashPassword } from '../common/utils/password.js';
import { toAuditJson } from '../common/utils/audit.js';
import { JOB_RULES, jobOf, type Job } from './employee-job.js';

// Hindi kailanman isinasama ang passwordHash sa response
export const employeeSelect = {
  id: true,
  username: true,
  role: true,
  storeId: true,
  position: true,
  shift: true,
  isActive: true,
  mustChangePassword: true,
  lastLoginAt: true,
  createdAt: true,
  store: { select: { id: true, code: true, name: true, hasKitchen: true } },
  profile: { select: { firstName: true, middleName: true, lastName: true, contactNo: true, email: true } },
} as const;

interface Profile {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  contactNo?: string | null;
  email?: string | null;
}

export interface CreateEmployeeInput extends Profile {
  job: Job;
  /** Para sa may login lang (owner, clerk, cashier) */
  username?: string;
  password?: string;
  /** Para sa store staff (cashier, barista, kitchen) */
  storeId?: number | null;
  shift?: StaffShift | null;
}

export interface UpdateEmployeeInput extends Partial<Profile> {
  job?: Job;
  /** Kailangan kapag ginawang may login ang dating walang login (hal. barista → cashier) */
  username?: string;
  password?: string;
  storeId?: number | null;
  shift?: StaffShift | null;
  isActive?: boolean;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: employeeSelect,
      orderBy: [{ isActive: 'desc' }, { role: 'asc' }, { position: 'asc' }, { id: 'asc' }],
    });
  }

  async create(input: CreateEmployeeInput, actorId: number) {
    const rule = JOB_RULES[input.job];
    if (rule.hasLogin && (!input.username || !input.password)) {
      throw new BadRequestException('Username and password are required for this job.');
    }
    const storeId = rule.isStoreStaff ? await this.assertStore(input.job, input.storeId ?? null) : null;
    const { firstName, middleName, lastName, contactNo, email } = input;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const employee = await tx.user.create({
          data: {
            role: rule.role,
            position: rule.position,
            storeId,
            shift: rule.isStoreStaff ? (input.shift ?? null) : null,
            username: rule.hasLogin ? input.username : null,
            passwordHash: rule.hasLogin ? await hashPassword(input.password!) : null,
            mustChangePassword: rule.hasLogin,
            profile: { create: { firstName, middleName, lastName, contactNo, email } },
          },
          select: employeeSelect,
        });
        await tx.auditLog.create({
          data: {
            userId: actorId,
            action: 'EMPLOYEE_CREATE',
            entity: 'User',
            entityId: String(employee.id),
            after: toAuditJson(employee),
          },
        });
        return employee;
      });
    } catch (error) {
      this.rethrowUnique(error);
    }
  }

  async update(id: number, input: UpdateEmployeeInput, actorId: number) {
    const before = await this.prisma.user.findUnique({
      where: { id },
      select: { ...employeeSelect, passwordHash: true },
    });
    if (!before) throw new NotFoundException('Employee not found.');
    const { passwordHash: oldHash, ...beforeSafe } = before;

    const oldJob = jobOf(before);
    const job = input.job ?? oldJob;
    const rule = JOB_RULES[job];

    if (id === actorId) {
      if (input.isActive === false) throw new BadRequestException('You cannot deactivate your own account.');
      if (job !== oldJob) throw new BadRequestException('You cannot change your own job.');
    }

    // Walang login dati pero magkakaroon na (hal. barista → cashier): kailangan ng username at password
    const gainsLogin = rule.hasLogin && !oldHash;
    if (gainsLogin && (!input.username || !input.password)) {
      throw new BadRequestException('Set a username and password, because this job can log in.');
    }

    const storeId = rule.isStoreStaff
      ? await this.assertStore(job, input.storeId !== undefined ? input.storeId : before.storeId)
      : null;
    const shift = rule.isStoreStaff ? (input.shift !== undefined ? input.shift : before.shift) : null;

    const { firstName, middleName, lastName, contactNo, email, isActive } = input;
    const profile = { firstName, middleName, lastName, contactNo, email };
    const hasProfileChange = Object.values(profile).some((v) => v !== undefined);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const employee = await tx.user.update({
          where: { id },
          data: {
            role: rule.role,
            position: rule.position,
            storeId,
            shift,
            isActive,
            // Kapag ginawang walang login (hal. cashier → barista), tinatanggal ang username at password
            ...(rule.hasLogin
              ? gainsLogin
                ? { username: input.username, passwordHash: await hashPassword(input.password!), mustChangePassword: true }
                : {}
              : { username: null, passwordHash: null, mustChangePassword: false }),
            ...(hasProfileChange
              ? {
                  profile: {
                    upsert: {
                      create: { firstName: firstName ?? '', lastName: lastName ?? '', middleName, contactNo, email },
                      update: profile,
                    },
                  },
                }
              : {}),
          },
          select: employeeSelect,
        });
        await tx.auditLog.create({
          data: {
            userId: actorId,
            action:
              isActive === false
                ? 'EMPLOYEE_DEACTIVATE'
                : isActive === true
                  ? 'EMPLOYEE_ACTIVATE'
                  : job !== oldJob
                    ? 'EMPLOYEE_JOB_CHANGE'
                    : 'EMPLOYEE_UPDATE',
            entity: 'User',
            entityId: String(id),
            before: toAuditJson(beforeSafe),
            after: toAuditJson(employee),
          },
        });
        return employee;
      });
    } catch (error) {
      this.rethrowUnique(error);
    }
  }

  /** Para sa maramihang deactivate/activate mula sa selection bar */
  async setStatus(ids: number[], isActive: boolean, actorId: number) {
    if (!isActive && ids.includes(actorId)) {
      throw new BadRequestException('You cannot deactivate your own account.');
    }
    return this.prisma.$transaction(async (tx) => {
      const targets = await tx.user.findMany({ where: { id: { in: ids } }, select: { id: true, isActive: true } });
      if (targets.length !== ids.length) throw new NotFoundException('One or more employees were not found.');
      await tx.user.updateMany({ where: { id: { in: ids } }, data: { isActive } });
      await tx.auditLog.createMany({
        data: targets.map((t) => ({
          userId: actorId,
          action: isActive ? 'EMPLOYEE_ACTIVATE' : 'EMPLOYEE_DEACTIVATE',
          entity: 'User',
          entityId: String(t.id),
          before: { isActive: t.isActive },
          after: { isActive },
        })),
      });
      return tx.user.findMany({ where: { id: { in: ids } }, select: employeeSelect });
    });
  }

  /** Ang owner ang nagse-set ng pansamantalang password; papalitan ito sa susunod na login */
  async resetPassword(id: number, password: string, actorId: number) {
    const target = await this.prisma.user.findUnique({ where: { id }, select: { id: true, username: true } });
    if (!target) throw new NotFoundException('Employee not found.');
    if (!target.username) throw new BadRequestException('This employee has no login account.');
    return this.prisma.$transaction(async (tx) => {
      const employee = await tx.user.update({
        where: { id },
        data: { passwordHash: await hashPassword(password), mustChangePassword: true },
        select: employeeSelect,
      });
      // Hindi itinatala ang password mismo, kung sino lang at kailan
      await tx.auditLog.create({
        data: { userId: actorId, action: 'EMPLOYEE_PASSWORD_RESET', entity: 'User', entityId: String(id) },
      });
      return employee;
    });
  }

  /**
   * Store staff: kailangan ng aktibong store. Kitchen ay sa store lang na may kitchen (Alley).
   * Ibinabalik ang storeId na ise-save.
   */
  async assertStore(job: Job, storeId: number | null): Promise<number> {
    if (!storeId) throw new BadRequestException('Please choose the store for this employee.');
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store || !store.isActive) throw new BadRequestException('Please choose an active store.');
    if (job === 'KITCHEN' && !store.hasKitchen) {
      throw new BadRequestException(`${store.name} has no kitchen. Kitchen staff can only work in a store with a kitchen.`);
    }
    return storeId;
  }

  private rethrowUnique(error: unknown): never {
    const e = error as { code?: string; meta?: { target?: string[] | string } };
    if (e?.code === 'P2002') {
      const target = String(e.meta?.target ?? '');
      throw new ConflictException(
        target.includes('email') ? 'This email is already used by another employee.' : 'This username is already taken.',
      );
    }
    if (e?.code === 'P2025') throw new NotFoundException('Employee not found.');
    throw error;
  }
}
