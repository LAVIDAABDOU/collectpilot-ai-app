import type { Classification, Invoice } from '@/types';

export type AgeBucket = '1-7' | '8-15' | '16-30' | '30+';

export const AGE_BUCKETS: AgeBucket[] = ['1-7', '8-15', '16-30', '30+'];

export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function daysOverdue(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  return Math.floor((today.getTime() - due.getTime()) / 86400000);
}

export function balanceOf(i: Invoice): number {
  return Math.max(i.amount - i.paidAmount, 0);
}

export function isPaid(i: Invoice): boolean {
  return balanceOf(i) <= 0;
}

export function isOverdue(i: Invoice): boolean {
  return balanceOf(i) > 0 && daysOverdue(i.dueDate) > 0;
}

export function bucketOf(days: number): AgeBucket | null {
  if (days <= 0) return null;
  if (days <= 7) return '1-7';
  if (days <= 15) return '8-15';
  if (days <= 30) return '16-30';
  return '30+';
}

export function reminderPaused(i: Invoice, today: string = todayISO()): boolean {
  if (!i.pauseUntil) return false;
  return i.pauseUntil > today;
}

/**
 * THE central business rule for follow-up drafts. Everything else delegates here.
 * Dates are local yyyy-mm-dd strings (no UTC conversion); `today` is injectable
 * so tests stay deterministic. Remaining balance is derived from amount minus
 * recorded payments — the original amount is never modified.
 */
export interface FollowUpDecision {
  allowed: boolean;
  reason: string | null;
  remainingBalance: number;
}

export function canSendFollowUp(i: Invoice, today: string = todayISO()): FollowUpDecision {
  const balance = balanceOf(i);
  const status = i.status.trim().toLowerCase();
  const blocked = (reason: string): FollowUpDecision => ({ allowed: false, reason, remainingBalance: balance });

  if (status === 'cancelled' || status === 'canceled' || status === 'void' || status === 'invalid')
    return blocked(`Invoice is ${i.status.trim()} — follow-ups are blocked.`);
  if (isPaid(i) || status === 'paid') return blocked('This invoice is fully paid — no follow-up needed.');
  if (i.disputed || status === 'disputed') return blocked('Cannot create follow-up for a disputed invoice.');
  if (balance <= 0) return blocked('This invoice has no remaining balance.');
  if (i.dueDate >= today) {
    if (status === 'overdue')
      return blocked('Invoice status is inconsistent (marked overdue but not past due) — please refresh the invoice status.');
    return blocked('Not yet due — follow-ups open after the due date passes.');
  }
  if (reminderPaused(i, today))
    return blocked(`Follow-ups are paused until the promised payment date (${i.pauseUntil}).`);

  return { allowed: true, reason: null, remainingBalance: balance };
}

export function followUpBlockReason(i: Invoice): string | null {
  return canSendFollowUp(i).reason;
}

export function needsFollowUp(i: Invoice): boolean {
  return canSendFollowUp(i).allowed;
}

/** Paid or disputed (boolean flag or raw CSV status) — drafts must never open for these. */
export function isHardBlocked(i: Invoice): boolean {
  const status = i.status.trim().toLowerCase();
  return isPaid(i) || status === 'paid' || i.disputed || status === 'disputed';
}

/** Client classification based on their open (unpaid) invoices. */
export function classifyClient(clientInvoices: Invoice[]): Classification {
  const open = clientInvoices.filter((i) => balanceOf(i) > 0);
  if (open.length === 0) return 'Good';
  if (open.some((i) => i.disputed)) return 'Critical';
  const maxDays = Math.max(...open.map((i) => Math.max(daysOverdue(i.dueDate), 0)));
  if (maxDays > 30) return 'Critical';
  if (maxDays >= 8) return 'Risky';
  return 'Good';
}

export function classificationMap(invoices: Invoice[]): Map<string, Classification> {
  const groups = new Map<string, Invoice[]>();
  for (const inv of invoices) {
    const key = inv.clientName.trim().toLowerCase();
    const list = groups.get(key);
    if (list) list.push(inv);
    else groups.set(key, [inv]);
  }
  const result = new Map<string, Classification>();
  for (const [key, list] of groups) {
    result.set(key, classifyClient(list));
  }
  return result;
}

export const CLASSIFICATION_STYLES: Record<Classification, string> = {
  Good: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Risky: 'bg-amber-50 text-amber-700 ring-amber-200',
  Critical: 'bg-red-50 text-red-700 ring-red-200',
};

export function invoiceState(i: Invoice): {
  label: string;
  className: string;
} {
  if (isPaid(i)) return { label: 'Paid', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' };
  if (i.disputed) return { label: 'Disputed', className: 'bg-red-50 text-red-700 ring-red-200' };
  if (reminderPaused(i)) return { label: 'Reminder paused', className: 'bg-sky-50 text-sky-700 ring-sky-200' };
  if (isOverdue(i)) {
    const b = bucketOf(daysOverdue(i.dueDate));
    const styles: Record<AgeBucket, string> = {
      '1-7': 'bg-amber-50 text-amber-700 ring-amber-200',
      '8-15': 'bg-orange-50 text-orange-700 ring-orange-200',
      '16-30': 'bg-red-50 text-red-700 ring-red-200',
      '30+': 'bg-red-100 text-red-800 ring-red-300',
    };
    return { label: `${b} days overdue`, className: styles[b!] };
  }
  return { label: 'Due soon', className: 'bg-slate-100 text-slate-600 ring-slate-200' };
}
