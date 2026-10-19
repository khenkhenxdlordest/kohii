import { useContext } from 'react';
import { RealtimeContext } from '../context/realtime.context';

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error('useRealtime must be used inside <RealtimeProvider>');
  return context;
}
