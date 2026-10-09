const pesoFormat = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

const dateTimeFormat = new Intl.DateTimeFormat('en-PH', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** 1250 → "₱1,250.00" */
export function formatPeso(amount: number) {
  return pesoFormat.format(amount);
}

export function formatDateTime(value: string | Date) {
  return dateTimeFormat.format(new Date(value));
}
