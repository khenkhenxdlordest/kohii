import { createContext } from 'react';
import type { Shift } from '../types';

export interface ShiftContextValue {
  shift: Shift | null;
  loading: boolean;
  refresh: () => void;
}

export const ShiftContext = createContext<ShiftContextValue | null>(null);
