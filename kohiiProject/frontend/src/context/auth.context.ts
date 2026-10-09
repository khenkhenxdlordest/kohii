import { createContext } from 'react';
import type { LoginPayload } from '../api/auth.api';
import type { AuthUser } from '../types';

export interface AuthContextValue {
  user: AuthUser | null;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  logout: () => void;
  /** I-update ang user sa context at localStorage, hal. pagkatapos mag-edit ng profile */
  setUser: (user: AuthUser) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
