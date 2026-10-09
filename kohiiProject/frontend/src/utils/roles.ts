import type { Job, Role, StaffPosition, StaffShift } from '../types';

export const dashboardRoutes: Record<Role, string> = {
  ADMIN: '/admin',
  CLERK: '/clerk',
  CASHIER: '/cashier',
};

export const roleLabels: Record<Role, string> = {
  ADMIN: 'Owner',
  CLERK: 'Inventory Clerk',
  CASHIER: 'Cashier',
};

export const positionLabels: Record<StaffPosition, string> = {
  CASHIER: 'Cashier',
  BARISTA: 'Barista',
  KITCHEN: 'Kitchen',
};

export const positionOrder: StaffPosition[] = ['CASHIER', 'BARISTA', 'KITCHEN'];

export const shiftLabels: Record<StaffShift, string> = {
  AM: 'AM shift',
  PM: 'PM shift',
};

export const jobOrder: Job[] = ['ADMIN', 'CLERK', 'CASHIER', 'BARISTA', 'KITCHEN'];

export const jobLabels: Record<Job, string> = {
  ADMIN: 'Owner',
  CLERK: 'Inventory Clerk',
  CASHIER: 'Cashier',
  BARISTA: 'Barista',
  KITCHEN: 'Kitchen',
};

/** Tatlo lang ang may login: owner, clerk at cashier */
export const jobHasLogin: Record<Job, boolean> = {
  ADMIN: true,
  CLERK: true,
  CASHIER: true,
  BARISTA: false,
  KITCHEN: false,
};

/** Naka-deploy sa Alley o Podium, may AM/PM shift */
export const jobIsStoreStaff: Record<Job, boolean> = {
  ADMIN: false,
  CLERK: false,
  CASHIER: true,
  BARISTA: true,
  KITCHEN: true,
};

/** Kinukuha ang trabaho mula sa role at position */
export function jobOf(person: { role: Role | null; position?: StaffPosition | null }): Job {
  if (person.role === 'ADMIN') return 'ADMIN';
  if (person.role === 'CLERK') return 'CLERK';
  return person.position ?? 'CASHIER';
}

export function jobLabel(person: { role: Role | null; position?: StaffPosition | null }) {
  return jobLabels[jobOf(person)];
}
