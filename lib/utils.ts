export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatCurrency(amount: number, currency: string = "$"): string {
  return `${currency}${amount.toFixed(2)}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
