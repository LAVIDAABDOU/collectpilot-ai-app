export interface Invoice {
  id: string;
  clientName: string;
  invoiceNumber: string;
  invoiceDate: string; // yyyy-mm-dd
  dueDate: string; // yyyy-mm-dd
  amount: number;
  paidAmount: number;
  status: string; // raw status from CSV
  email: string;
  remindersSent: number;
  lastSentAt: string | null; // ISO datetime
  pauseUntil: string | null; // yyyy-mm-dd, from a logged payment promise
  promiseNote: string | null;
  disputed: boolean;
  disputeNote: string | null;
}

export type LogType = 'sent' | 'promise' | 'dispute' | 'cleared' | 'draft' | 'blocked';

export interface LogEntry {
  id: string;
  date: string; // ISO datetime
  type: LogType;
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  note: string;
}

export interface Settings {
  currency: 'USD' | 'EUR' | 'MAD';
  timezone: string;
  agencyName: string;
  adminEmail: string;
  supportEmail: string;
  senderEmail: string;
}

export type Classification = 'Good' | 'Risky' | 'Critical';
