import type { AuthUser } from '../types';
import { apiRequest } from './client';

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface UpdateProfilePayload {
  firstName: string;
  middleName: string | null;
  lastName: string;
  contactNo: string | null;
  email: string | null;
}

export function login(payload: LoginPayload) {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateMe(payload: UpdateProfilePayload) {
  return apiRequest<AuthUser>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// Multipart upload; hindi gamit ang apiRequest dahil hindi JSON ang body
export async function uploadMyPhoto(file: File): Promise<AuthUser> {
  const token = localStorage.getItem('accessToken');
  const body = new FormData();
  body.append('photo', file);

  const response = await fetch('/api/auth/me/photo', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
    throw new Error(message ?? 'Could not upload the photo.');
  }
  return data as AuthUser;
}
