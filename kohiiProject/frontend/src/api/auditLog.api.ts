import type { AuditLogEntry } from '../types';
import { apiRequest } from './client';

export function getAuditLog(limit = 20) {
  return apiRequest<AuditLogEntry[]>(`/audit-log?limit=${limit}`);
}
