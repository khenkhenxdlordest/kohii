import type { Product, ProductDetail, ProductSize, ProductType, SizePrice } from '../types';
import { apiRequest } from './client';

export interface ProductFilters {
  search?: string;
  categoryId?: number;
  includeInactive?: boolean;
}

export interface ProductInput {
  name: string;
  categoryId: number;
  type: ProductType;
  /** Drinks: HOT/ICED/UPSIZE (kailangan ng Hot o Iced). Food: isang REGULAR */
  prices: SizePrice[];
}

export function getProducts(filters: ProductFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.categoryId) params.set('categoryId', String(filters.categoryId));
  if (filters.includeInactive) params.set('includeInactive', 'true');
  const query = params.toString();
  return apiRequest<Product[]>(`/products${query ? `?${query}` : ''}`);
}

export function getProduct(id: number) {
  return apiRequest<ProductDetail>(`/products/${id}`);
}

export function createProduct(data: ProductInput) {
  return apiRequest<Product>('/products', { method: 'POST', body: JSON.stringify(data) });
}

/** Hindi kasama ang presyo; gamitin ang changeProductPrice para may history */
export function updateProduct(
  id: number,
  data: Partial<Omit<ProductInput, 'prices'>> & { isActive?: boolean },
) {
  return apiRequest<Product>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

// Multipart upload; hindi gamit ang apiRequest dahil hindi JSON ang body
export async function uploadProductImage(id: number, file: File): Promise<Product> {
  const token = localStorage.getItem('accessToken');
  const body = new FormData();
  body.append('image', file);

  const response = await fetch(`/api/products/${id}/image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
    throw new Error(message ?? 'Could not upload the image.');
  }
  return data as Product;
}

/** Itinatakda o idinadagdag ang presyo ng isang size; ang price = null ay pagtanggal */
export function changeProductPrice(id: number, size: ProductSize, price: number | null, reason?: string) {
  return apiRequest<Product>(`/products/${id}/price`, {
    method: 'PATCH',
    body: JSON.stringify({ size, price, reason }),
  });
}
