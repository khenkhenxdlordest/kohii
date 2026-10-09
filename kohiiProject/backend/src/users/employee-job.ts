import { Role, StaffPosition } from '../generated/prisma/client.js';

/**
 * Trabaho ng isang employee. Tatlo lang ang may login (ADMIN, CLERK, CASHIER);
 * ang BARISTA at KITCHEN ay walang account, nakalista lang para sa store at shift.
 */
export const JOBS = ['ADMIN', 'CLERK', 'CASHIER', 'BARISTA', 'KITCHEN'] as const;
export type Job = (typeof JOBS)[number];

export interface JobRule {
  role: Role | null;
  position: StaffPosition | null;
  /** May username at password (makakapag-login) */
  hasLogin: boolean;
  /** Naka-deploy sa Alley o Podium, may AM/PM shift */
  isStoreStaff: boolean;
}

export const JOB_RULES: Record<Job, JobRule> = {
  ADMIN: { role: Role.ADMIN, position: null, hasLogin: true, isStoreStaff: false },
  CLERK: { role: Role.CLERK, position: null, hasLogin: true, isStoreStaff: false },
  CASHIER: { role: Role.CASHIER, position: StaffPosition.CASHIER, hasLogin: true, isStoreStaff: true },
  BARISTA: { role: null, position: StaffPosition.BARISTA, hasLogin: false, isStoreStaff: true },
  KITCHEN: { role: null, position: StaffPosition.KITCHEN, hasLogin: false, isStoreStaff: true },
};

/** Kinukuha ang job mula sa naka-save na role at position */
export function jobOf(user: { role: Role | null; position: StaffPosition | null }): Job {
  if (user.role === Role.ADMIN) return 'ADMIN';
  if (user.role === Role.CLERK) return 'CLERK';
  return user.position ?? 'CASHIER';
}
