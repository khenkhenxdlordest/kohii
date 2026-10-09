import type { Employee, StaffShift, Store } from '../types';
import { apiRequest } from './client';

export function getStores(includeInactive = false) {
  return apiRequest<Store[]>(`/stores${includeInactive ? '?includeInactive=true' : ''}`);
}

/** Ide-deploy (ililipat) ang store staff sa store, kasama ang shift nila (AM/PM) */
export function deployStaff(storeId: number, staff: { userId: number; shift: StaffShift | null }[]) {
  return apiRequest<Employee[]>(`/stores/${storeId}/deploy`, {
    method: 'POST',
    body: JSON.stringify({ staff }),
  });
}
