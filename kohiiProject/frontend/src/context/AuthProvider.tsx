import { useCallback, useMemo, useState, type ReactNode } from 'react';
import * as authApi from '../api/auth.api';
import type { AuthUser } from '../types';
import { AuthContext } from './auth.context';

const TOKEN_KEY = 'accessToken';
const USER_KEY = 'authUser';

function readStoredUser(): AuthUser | null {
  try {
    if (!localStorage.getItem(TOKEN_KEY)) return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser);

  const login = useCallback(async (payload: authApi.LoginPayload) => {
    const { accessToken, user } = await authApi.login(payload);
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const updateUser = useCallback((next: AuthUser) => {
    localStorage.setItem(USER_KEY, JSON.stringify(next));
    setUser(next);
  }, []);

  const value = useMemo(
    () => ({ user, login, logout, setUser: updateUser }),
    [user, login, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
