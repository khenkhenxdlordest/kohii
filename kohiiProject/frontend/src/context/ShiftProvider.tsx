import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getActiveShift } from '../api/shifts.api';
import { useRealtime } from '../hooks/useRealtime';
import type { Shift } from '../types';
import { ShiftContext } from './shift.context';

export function ShiftProvider({ children }: { children: ReactNode }) {
  const { socket } = useRealtime();
  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    getActiveShift()
      .then((active) => {
        if (!ignore) setShift(active);
      })
      .catch(() => {
        if (!ignore) setShift(null);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => setReloadKey((k) => k + 1);
    socket.on('shift:changed', refresh);
    return () => {
      socket.off('shift:changed', refresh);
    };
  }, [socket]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  const value = useMemo(() => ({ shift, loading, refresh }), [shift, loading, refresh]);

  return <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>;
}
