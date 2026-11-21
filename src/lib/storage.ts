import type { Invoice, LogEntry, Settings } from '@/types';

const KEYS = {
  invoices: 'collectpilot.invoices.v1',
  log: 'collectpilot.log.v1',
  settings: 'collectpilot.settings.v1',
};

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export const defaultSettings: Settings = {
  currency: 'USD',
  timezone: 'America/New_York',
  agencyName: 'Bright Funnel Media',
  adminEmail: '',
  supportEmail: '',
  senderEmail: '',
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable — demo keeps running in memory
  }
}

export function loadInvoices(fallback: Invoice[]): Invoice[] {
  const saved = read<unknown>(KEYS.invoices, null);
  if (!Array.isArray(saved) || saved.length === 0) return fallback;
  return saved as Invoice[];
}

export function saveInvoices(value: unknown): void {
  write(KEYS.invoices, value);
}

export function loadLog(): LogEntry[] {
  return read<LogEntry[]>(KEYS.log, []);
}

export function saveLog(value: LogEntry[]): void {
  write(KEYS.log, value);
}

export function loadSettings(): Settings {
  return { ...defaultSettings, ...read<Partial<Settings>>(KEYS.settings, {}) };
}

export function saveSettings(value: Settings): void {
  write(KEYS.settings, value);
}

export function clearAllData(): void {
  Object.values(KEYS).forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      // ignore
    }
  });
}
