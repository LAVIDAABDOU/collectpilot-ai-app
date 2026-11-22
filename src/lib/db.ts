import { supabase } from '@/lib/supabase';
import type { Invoice, LogEntry, Settings } from '@/types';
import { defaultSettings } from '@/lib/storage';

// ── Row types (snake_case from Postgres) ──────────────────────────────
interface InvoiceRow {
  id: string;
  user_id: string;
  client_name: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  status: string;
  email: string;
  reminders_sent: number;
  last_sent_at: string | null;
  pause_until: string | null;
  promise_note: string | null;
  disputed: boolean;
  dispute_note: string | null;
}

interface LogRow {
  id: string;
  user_id: string;
  type: string;
  invoice_id: string | null;
  invoice_number: string;
  client_name: string;
  note: string;
  created_at: string;
}

interface SettingsRow {
  id: string;
  user_id: string;
  currency: string;
  timezone: string;
  agency_name: string;
  admin_email: string;
  support_email: string;
  sender_email: string;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  plan: string;
  billing_period: string;
  status: string;
  paddle_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
}

// ── Mappers ───────────────────────────────────────────────────────────
function rowToInvoice(r: InvoiceRow): Invoice {
  return {
    id: r.id,
    clientName: r.client_name,
    invoiceNumber: r.invoice_number,
    invoiceDate: r.invoice_date,
    dueDate: r.due_date,
    amount: Number(r.amount),
    paidAmount: Number(r.paid_amount),
    status: r.status,
    email: r.email,
    remindersSent: r.reminders_sent,
    lastSentAt: r.last_sent_at,
    pauseUntil: r.pause_until,
    promiseNote: r.promise_note,
    disputed: r.disputed,
    disputeNote: r.dispute_note,
  };
}

function invoiceToRow(i: Invoice): Partial<InvoiceRow> {
  return {
    client_name: i.clientName,
    invoice_number: i.invoiceNumber,
    invoice_date: i.invoiceDate,
    due_date: i.dueDate,
    amount: i.amount,
    paid_amount: i.paidAmount,
    status: i.status,
    email: i.email,
    reminders_sent: i.remindersSent,
    last_sent_at: i.lastSentAt,
    pause_until: i.pauseUntil,
    promise_note: i.promiseNote,
    disputed: i.disputed,
    dispute_note: i.disputeNote,
  };
}

function rowToLog(r: LogRow): LogEntry {
  return {
    id: r.id,
    date: r.created_at,
    type: r.type as LogEntry['type'],
    invoiceId: r.invoice_id ?? '',
    invoiceNumber: r.invoice_number,
    clientName: r.client_name,
    note: r.note,
  };
}

function rowToSettings(r: SettingsRow): Settings {
  return {
    currency: r.currency as Settings['currency'],
    timezone: r.timezone,
    agencyName: r.agency_name,
    adminEmail: r.admin_email,
    supportEmail: r.support_email,
    senderEmail: r.sender_email,
  };
}

// ── Invoices ──────────────────────────────────────────────────────────
export async function fetchInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('due_date', { ascending: true });
  if (error) throw error;
  return (data as InvoiceRow[]).map(rowToInvoice);
}

export async function insertInvoice(i: Invoice): Promise<Invoice> {
  const row = { ...invoiceToRow(i) };
  const { data, error } = await supabase
    .from('invoices')
    .insert(row)
    .select('*')
    .single();
  if (error) throw error;
  return rowToInvoice(data as InvoiceRow);
}

export async function updateInvoice(id: string, patch: Partial<Invoice>): Promise<void> {
  const row: Partial<InvoiceRow> = {};
  if (patch.clientName !== undefined) row.client_name = patch.clientName;
  if (patch.invoiceNumber !== undefined) row.invoice_number = patch.invoiceNumber;
  if (patch.invoiceDate !== undefined) row.invoice_date = patch.invoiceDate;
  if (patch.dueDate !== undefined) row.due_date = patch.dueDate;
  if (patch.amount !== undefined) row.amount = patch.amount;
  if (patch.paidAmount !== undefined) row.paid_amount = patch.paidAmount;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.email !== undefined) row.email = patch.email;
  if (patch.remindersSent !== undefined) row.reminders_sent = patch.remindersSent;
  if (patch.lastSentAt !== undefined) row.last_sent_at = patch.lastSentAt;
  if (patch.pauseUntil !== undefined) row.pause_until = patch.pauseUntil;
  if (patch.promiseNote !== undefined) row.promise_note = patch.promiseNote;
  if (patch.disputed !== undefined) row.disputed = patch.disputed;
  if (patch.disputeNote !== undefined) row.dispute_note = patch.disputeNote;
  const { error } = await supabase.from('invoices').update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) throw error;
}

// ── Log ───────────────────────────────────────────────────────────────
export async function fetchLog(): Promise<LogEntry[]> {
  const { data, error } = await supabase
    .from('log_entries')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as LogRow[]).map(rowToLog);
}

export async function insertLog(entry: Omit<LogEntry, 'id' | 'date'>): Promise<LogEntry> {
  const { data, error } = await supabase
    .from('log_entries')
    .insert({
      type: entry.type,
      invoice_id: entry.invoiceId || null,
      invoice_number: entry.invoiceNumber,
      client_name: entry.clientName,
      note: entry.note,
    })
    .select('*')
    .single();
  if (error) throw error;
  return rowToLog(data as LogRow);
}

// ── Settings ──────────────────────────────────────────────────────────
export async function fetchSettings(): Promise<Settings | null> {
  const { data, error } = await supabase
    .from('agency_settings')
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToSettings(data as SettingsRow);
}

export async function upsertSettings(settings: Settings): Promise<void> {
  const { error } = await supabase.from('agency_settings').upsert({
    currency: settings.currency,
    timezone: settings.timezone,
    agency_name: settings.agencyName,
    admin_email: settings.adminEmail,
    support_email: settings.supportEmail,
    sender_email: settings.senderEmail,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

// ── Subscription ──────────────────────────────────────────────────────
export interface Subscription {
  plan: string;
  billingPeriod: 'monthly' | 'yearly';
  status: string;
  paddleSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
}

export async function fetchSubscription(): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const r = data as SubscriptionRow;
  return {
    plan: r.plan,
    billingPeriod: r.billing_period as 'monthly' | 'yearly',
    status: r.status,
    paddleSubscriptionId: r.paddle_subscription_id,
    currentPeriodStart: r.current_period_start,
    currentPeriodEnd: r.current_period_end,
    canceledAt: r.canceled_at,
  };
}

export async function upsertSubscription(sub: Partial<Subscription>): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (sub.plan !== undefined) row.plan = sub.plan;
  if (sub.billingPeriod !== undefined) row.billing_period = sub.billingPeriod;
  if (sub.status !== undefined) row.status = sub.status;
  if (sub.paddleSubscriptionId !== undefined) row.paddle_subscription_id = sub.paddleSubscriptionId;
  if (sub.currentPeriodStart !== undefined) row.current_period_start = sub.currentPeriodStart;
  if (sub.currentPeriodEnd !== undefined) row.current_period_end = sub.currentPeriodEnd;
  if (sub.canceledAt !== undefined) row.canceled_at = sub.canceledAt;
  const { error } = await supabase.from('subscriptions').upsert(row, { onConflict: 'user_id' });
  if (error) throw error;
}

export { defaultSettings };
