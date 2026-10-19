import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ShiftStatus, type Prisma } from '../generated/prisma/client.js';
import { RealtimeService } from '../realtime/realtime.service.js';

type ShiftRow = Prisma.ShiftGetPayload<Record<string, never>>;

// Decimal → number para madaling gamitin sa frontend
const toShiftResponse = (shift: ShiftRow) => ({
  ...shift,
  openingCash: shift.openingCash.toNumber(),
  expectedCash: shift.expectedCash?.toNumber() ?? null,
  closingCash: shift.closingCash?.toNumber() ?? null,
});

export interface OpenShiftInput {
  cashierId: number;
  storeId: number;
  openingCash: number;
}

export interface CloseShiftInput {
  cashierId: number;
  closingCash: number;
  note?: string;
}

@Injectable()
export class ShiftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async findActive(cashierId: number, storeId: number) {
    const shift = await this.prisma.shift.findFirst({
      where: { cashierId, storeId, status: ShiftStatus.OPEN },
      orderBy: { openedAt: 'desc' },
    });
    return shift ? toShiftResponse(shift) : null;
  }

  async open({ cashierId, storeId, openingCash }: OpenShiftInput) {
    const existing = await this.prisma.shift.findFirst({
      where: { cashierId, storeId, status: ShiftStatus.OPEN },
    });
    if (existing) throw new BadRequestException('You already have an open shift.');

    let shift: ShiftRow;
    try {
      shift = await this.prisma.shift.create({
        data: { storeId, cashierId, openingCash },
      });
    } catch (error) {
      // Partial unique index sa DB (isang OPEN shift lang bawat cashier/store) ang huling
      // depensa laban sa dalawang sabay na "Open Shift" request na parehong nakaligtas sa
      // check sa itaas (hal. double-click). Walang katumbas na @@unique sa schema dahil
      // conditional (WHERE status = 'OPEN') ito, pero P2002 pa rin ang error code.
      if ((error as { code?: string })?.code === 'P2002') {
        throw new BadRequestException('You already have an open shift.');
      }
      throw error;
    }

    const response = toShiftResponse(shift);
    this.realtime.emitShiftChanged(storeId, response);
    return response;
  }

  async close(id: number, { cashierId, closingCash, note }: CloseShiftInput) {
    const shift = await this.prisma.shift.findUnique({ where: { id } });
    if (!shift) throw new NotFoundException('Shift not found.');
    if (shift.cashierId !== cashierId) throw new ForbiddenException('This is not your shift.');
    if (shift.status !== ShiftStatus.OPEN) throw new BadRequestException('This shift is already closed.');

    const salesTotal = await this.prisma.order.aggregate({
      where: { shiftId: id },
      _sum: { total: true },
    });
    const expectedCash = shift.openingCash.toNumber() + (salesTotal._sum.total?.toNumber() ?? 0);

    const updated = await this.prisma.shift.update({
      where: { id },
      data: { status: ShiftStatus.CLOSED, closedAt: new Date(), closingCash, expectedCash, note },
    });
    const response = toShiftResponse(updated);
    this.realtime.emitShiftChanged(shift.storeId, response);
    return response;
  }
}
