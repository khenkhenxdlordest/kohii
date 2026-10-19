import type { Shift } from '../types';
import { apiRequest } from './client';

export function getActiveShift() {
  return apiRequest<Shift | null>('/shifts/active');
}

export function openShift(openingCash: number) {
  return apiRequest<Shift>('/shifts/open', { method: 'POST', body: JSON.stringify({ openingCash }) });
}

export function closeShift(id: number, data: { closingCash: number; note?: string }) {
  return apiRequest<Shift>(`/shifts/${id}/close`, { method: 'POST', body: JSON.stringify(data) });
}
