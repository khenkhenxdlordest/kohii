import type { Category, CategoryGroup } from '../types';
import { apiRequest } from './client';

export function getCategories(includeInactive = false) {
  return apiRequest<Category[]>(`/categories${includeInactive ? '?includeInactive=true' : ''}`);
}

export function createCategory(name: string, group: CategoryGroup) {
  return apiRequest<Category>('/categories', { method: 'POST', body: JSON.stringify({ name, group }) });
}

export function updateCategory(id: number, data: { name?: string; group?: CategoryGroup; isActive?: boolean }) {
  return apiRequest<Category>(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
