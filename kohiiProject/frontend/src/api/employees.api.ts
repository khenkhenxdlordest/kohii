import type { Employee, Job, StaffShift } from '../types';
import { apiRequest } from './client';

export interface CreateEmployeeInput {
  job: Job;
  /** Para sa may login lang (owner, clerk, cashier) */
  username?: string;
  /** Pansamantalang password; papalitan sa unang login */
  password?: string;
  /** Para sa cashier, barista at kitchen */
  storeId?: number | null;
  shift?: StaffShift | null;
  firstName: string;
  middleName?: string;
  lastName: string;
  contactNo?: string;
  email?: string;
}

export interface UpdateEmployeeInput {
  job?: Job;
  /** Kailangan lang kapag ginawang may login ang dating walang login (hal. barista → cashier) */
  username?: string;
  password?: string;
  storeId?: number | null;
  shift?: StaffShift | null;
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  contactNo?: string | null;
  email?: string | null;
  isActive?: boolean;
}

export function getEmployees() {
  return apiRequest<Employee[]>('/employees');
}

export function createEmployee(data: CreateEmployeeInput) {
  return apiRequest<Employee>('/employees', { method: 'POST', body: JSON.stringify(data) });
}

export function updateEmployee(id: number, data: UpdateEmployeeInput) {
  return apiRequest<Employee>(`/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

/** Maramihang deactivate/activate (selection bar) */
export function setEmployeesStatus(ids: number[], isActive: boolean) {
  return apiRequest<Employee[]>('/employees/status', { method: 'PATCH', body: JSON.stringify({ ids, isActive }) });
}

/** Para sa may login lang */
export function resetEmployeePassword(id: number, password: string) {
  return apiRequest<Employee>(`/employees/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}
