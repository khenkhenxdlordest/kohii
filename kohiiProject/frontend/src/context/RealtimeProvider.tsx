import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import { RealtimeContext } from './realtime.context';

const TOKEN_KEY = 'accessToken';

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = user ? localStorage.getItem(TOKEN_KEY) : null;
    if (!token) return;

    const next = io({ auth: { token } });
    next.on('connect', () => {
      setSocket(next);
      setConnected(true);
    });
    next.on('disconnect', () => setConnected(false));

    return () => {
      next.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [user]);

  const value = useMemo(() => ({ socket, connected }), [socket, connected]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
