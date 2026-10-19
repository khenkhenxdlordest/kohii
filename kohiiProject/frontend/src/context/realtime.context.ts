import { createContext } from 'react';
import type { Socket } from 'socket.io-client';

export interface RealtimeContextValue {
  socket: Socket | null;
  connected: boolean;
}

export const RealtimeContext = createContext<RealtimeContextValue | null>(null);
