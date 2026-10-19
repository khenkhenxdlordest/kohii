import type { PaymentMethod } from '../types';

import cashIcon from '../assets/icons/payment/cash.svg';
import walletIcon from '../assets/icons/payment/wallet.svg';
import bankIcon from '../assets/icons/payment/bank.svg';

export const paymentMethods: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: 'CASH', label: 'Cash', icon: cashIcon },
  { id: 'GCASH', label: 'GCash', icon: walletIcon },
  { id: 'MAYA', label: 'Maya', icon: walletIcon },
  { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: bankIcon },
];
