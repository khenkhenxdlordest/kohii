import { createContext } from 'react';
import type { LoginPayload } from '../api/auth.api';
import type { AuthUser } from '../types';

export interface AuthContextValue {
  user: AuthUser | null;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
