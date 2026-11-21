export const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (New York)' },
  { value: 'America/Chicago', label: 'Central (Chicago)' },
  { value: 'America/Denver', label: 'Mountain (Denver)' },
  { value: 'America/Los_Angeles', label: 'Pacific (Los Angeles)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Africa/Casablanca', label: 'Casablanca' },
  { value: 'UTC', label: 'UTC' },
];

export function formatMoney(n: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(n);
}

export function formatDate(iso: string | null | undefined, timezone: string): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(iso.length > 10 ? iso : iso + 'T12:00:00Z'));
  } catch {
    return iso;
  }
}
