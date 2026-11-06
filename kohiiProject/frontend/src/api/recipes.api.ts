import type { ProductRecipe } from '../types';
import { apiRequest } from './client';

export function getRecipes() {
  return apiRequest<ProductRecipe[]>('/recipes');
}

export function updateRecipe(productId: number, items: { inventoryItemId: number; qtyPerUnit: number }[]) {
  return apiRequest<ProductRecipe>(`/recipes/${productId}`, {
    method: 'PUT',
    body: JSON.stringify({ items }),
  });
}
