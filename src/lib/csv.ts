import type { Invoice } from '@/types';
import { balanceOf, classificationMap, daysOverdue } from '@/lib/logic';
import { uid } from '@/lib/storage';

/** Robust enough CSV parser: handles quoted fields, escaped quotes, CRLF. */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

const HEADER_MAP: Record<string, string> = {
  'client name': 'clientName',
  client: 'clientName',
  customer: 'clientName',
  'customer name': 'clientName',
  'invoice number': 'invoiceNumber',
  'invoice #': 'invoiceNumber',
  invoice: 'invoiceNumber',
  'invoice no': 'invoiceNumber',
  number: 'invoiceNumber',
  'invoice date': 'invoiceDate',
  'date issued': 'invoiceDate',
  issued: 'invoiceDate',
  'due date': 'dueDate',
  due: 'dueDate',
  amount: 'amount',
  total: 'amount',
  'invoice amount': 'amount',
  'amount due': 'amount',
  'paid amount': 'paidAmount',
  paid: 'paidAmount',
  'amount paid': 'paidAmount',
  status: 'status',
  email: 'email',
  'client email': 'email',
  'e-mail': 'email',
  'contact email': 'email',
};

/** Accepts yyyy-mm-dd, mm/dd/yyyy, mm/dd/yy, or month dd, yyyy. */
function parseDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
    const month = m[1];
    const day = m[2];
    if (+month < 1 || +month > 12 || +day < 1 || +day > 31) return null;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return `${parsed.getFullYear()}-${mm}-${dd}`;
  }
  return null;
}

function parseNumber(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const negative = /^\(.*\)$/.test(s);
  const cleaned = s.replace(/[^0-9.,-]/g, '').replace(/,(?=\d{3}\b)/g, '');
  const n = parseFloat(cleaned);
  if (isNaN(n)) return null;
  return negative ? -n : n;
}

export interface ParseResult {
  invoices: Invoice[];
  errors: string[];
  duplicates: number;
  headers: string[];
}

export function parseInvoices(text: string, existing: Invoice[]): ParseResult {
  const rows = parseCSV(text);
  const errors: string[] = [];
  const invoices: Invoice[] = [];
  if (rows.length === 0) return { invoices, errors: ['The file appears to be empty.'], duplicates: 0, headers: [] };

  const headers = rows[0].map((h) => h.trim());
  const mapped = headers.map((h) => HEADER_MAP[h.toLowerCase()] ?? null);
  if (!mapped.includes('clientName') || !mapped.includes('invoiceNumber') || !mapped.includes('dueDate') || !mapped.includes('amount')) {
    return {
      invoices,
      errors: [
        'Missing required columns. The file needs at least: Client Name, Invoice Number, Due Date, Amount.',
        `Found columns: ${headers.join(', ')}`,
      ],
      duplicates: 0,
      headers,
    };
  }

  const existingKeys = new Set(existing.map((i) => `${i.clientName.trim().toLowerCase()}|${i.invoiceNumber.trim().toLowerCase()}`));
  let duplicates = 0;

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const rec: Record<string, string> = {};
    mapped.forEach((field, idx) => {
      if (field) rec[field] = (cells[idx] ?? '').trim();
    });

    const rowLabel = `Row ${r + 1}`;
    if (!rec.clientName && !rec.invoiceNumber) continue; // blank line
    if (!rec.clientName) errors.push(`${rowLabel}: missing Client Name — skipped.`);
    if (!rec.invoiceNumber) errors.push(`${rowLabel}: missing Invoice Number — skipped.`);
    const dueDate = parseDate(rec.dueDate ?? '');
    if (!dueDate) errors.push(`${rowLabel}: unreadable Due Date "${rec.dueDate ?? ''}" — skipped.`);
    const amount = parseNumber(rec.amount ?? '');
    if (amount === null || amount < 0) errors.push(`${rowLabel}: unreadable Amount "${rec.amount ?? ''}" — skipped.`);
    if (!rec.clientName || !rec.invoiceNumber || !dueDate || amount === null || amount < 0) continue;

    const paidAmount = parseNumber(rec.paidAmount ?? '') ?? 0;
    const invoiceDate = parseDate(rec.invoiceDate ?? '') ?? dueDate;
    const key = `${rec.clientName.toLowerCase()}|${rec.invoiceNumber.toLowerCase()}`;
    if (existingKeys.has(key) || invoices.some((i) => `${i.clientName.toLowerCase()}|${i.invoiceNumber.toLowerCase()}` === key)) {
      duplicates++;
      continue;
    }
    existingKeys.add(key);

    invoices.push({
      id: uid(),
      clientName: rec.clientName,
      invoiceNumber: rec.invoiceNumber,
      invoiceDate,
      dueDate,
      amount,
      paidAmount,
      status: rec.status || '',
      email: rec.email || '',
      remindersSent: 0,
      lastSentAt: null,
      pauseUntil: null,
      promiseNote: null,
      disputed: false,
      disputeNote: null,
    });
  }

  return { invoices, errors, duplicates, headers };
}

function csvEscape(v: string | number): string {
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportInvoicesCSV(invoices: Invoice[]): string {
  const classes = classificationMap(invoices);
  const header = [
    'Client Name',
    'Invoice Number',
    'Invoice Date',
    'Due Date',
    'Amount',
    'Paid Amount',
    'Balance',
    'Days Overdue',
    'Status',
    'Client Classification',
    'Email',
    'Reminders Sent',
    'Reminder Paused Until',
    'Disputed',
  ];
  const lines = invoices.map((i) => {
    const bal = balanceOf(i);
    const days = bal > 0 ? Math.max(daysOverdue(i.dueDate), 0) : 0;
    return [
      i.clientName,
      i.invoiceNumber,
      i.invoiceDate,
      i.dueDate,
      i.amount.toFixed(2),
      i.paidAmount.toFixed(2),
      bal.toFixed(2),
      days,
      bal <= 0 ? 'Paid' : i.status || 'Open',
      classes.get(i.clientName.trim().toLowerCase()) ?? 'Good',
      i.email,
      i.remindersSent,
      i.pauseUntil ?? '',
      i.disputed ? 'Yes' : 'No',
    ]
      .map(csvEscape)
      .join(',');
  });
  return [header.join(','), ...lines].join('\n');
}

export function downloadCSV(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
