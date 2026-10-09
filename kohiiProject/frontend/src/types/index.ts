export type Role = 'ADMIN' | 'CLERK' | 'CASHIER';

export interface AuthUser {
  id: number;
  username: string;
  role: Role;
  /** null para sa ADMIN at CLERK (nakikita ang lahat ng store) */
  storeId: number | null;
  mustChangePassword: boolean;
  profile: { firstName: string; lastName: string } | null;
}
