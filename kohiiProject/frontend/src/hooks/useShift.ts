import { useContext } from 'react';
import { ShiftContext } from '../context/shift.context';

export function useShift() {
  const context = useContext(ShiftContext);
  if (!context) throw new Error('useShift must be used inside <ShiftProvider>');
  return context;
}
