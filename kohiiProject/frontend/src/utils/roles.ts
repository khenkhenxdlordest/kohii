import type { Role } from '../types';

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
