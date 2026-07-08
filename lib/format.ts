export function formatPrice(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

export function formatOrderTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatOrderDateTime(iso: string): string {
  const date = new Date(iso);
  const datePart = date.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
  });
  const timePart = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${datePart}, ${timePart}`;
}