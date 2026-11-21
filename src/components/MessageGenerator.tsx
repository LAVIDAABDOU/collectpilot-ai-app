import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Eye,
  Send,
  ShieldCheck,
} from 'lucide-react';
import type { Invoice, Settings } from '@/types';
import { formatDate, formatMoney } from '@/lib/format';
import {
  bucketOf,
  daysOverdue,
  followUpBlockReason,
  invoiceState,
  reminderPaused,
  type AgeBucket,
} from '@/lib/logic';
import { DisputeBlockError, generateMessage, TONES, type Tone } from '@/lib/messages';

interface Props {
  invoice: Invoice;
  settings: Settings;
  onMarkSent: (invoice: Invoice) => void;
}

const BUCKET_LABEL: Record<AgeBucket, string> = {
  '1-7': '1–7 days overdue',
  '8-15': '8–15 days overdue',
  '16-30': '16–30 days overdue',
  '30+': '30+ days overdue',
};

export default function MessageGenerator({ invoice, settings, onMarkSent }: Props) {
  const days = Math.max(daysOverdue(invoice.dueDate), 0);
  const bucket = (bucketOf(days) ?? '1-7') as AgeBucket;
  const [tone, setTone] = useState<Tone>(bucket === '1-7' ? 'Friendly' : 'Professional');
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const balance = invoice.amount - invoice.paidAmount;
  const blockReason = followUpBlockReason(invoice);
  const message = useMemo((): string => {
    try {
      return generateMessage(bucket, tone, {
        client: invoice.clientName,
        agency: settings.agencyName || 'Our Agency',
        invoice: invoice.invoiceNumber,
        balance: formatMoney(balance, settings.currency),
        days,
        dueDate: formatDate(invoice.dueDate, settings.timezone),
        disputeBlockReason: blockReason,
      });
    } catch (err) {
      if (err instanceof DisputeBlockError) return err.message;
      throw err;
    }
  }, [bucket, tone, invoice, settings, balance, days, blockReason]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = message;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  const state = invoiceState(invoice);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{invoice.clientName}</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Invoice {invoice.invoiceNumber} · Balance {formatMoney(balance, settings.currency)} · Due {formatDate(invoice.dueDate, settings.timezone)}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${state.className}`}>
          {state.label}
        </span>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <p className="text-sm font-medium text-amber-900">
          Human Review Required Before Sending
          <span className="block font-normal text-amber-800">
            CollectPilot AI drafts the message — it never sends anything. Review the draft, then approve to mark it as sent.
          </span>
        </p>
      </div>

      {blockReason && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm font-medium text-red-900">{blockReason}</p>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">
          Draft style adjusts automatically with age
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
            <Clock className="h-3 w-3" />
            {BUCKET_LABEL[bucket]}
          </span>
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(BUCKET_LABEL) as AgeBucket[]).map((b) => (
            <div
              key={b}
              className={`rounded-lg border px-3 py-2 text-xs ${
                b === bucket
                  ? 'border-blue-300 bg-blue-50 text-blue-800 font-medium'
                  : 'border-slate-200 bg-white text-slate-500'
              }`}
            >
              {BUCKET_LABEL[b]}
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Tone</label>
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          {TONES.map((t) => (
            <button
              key={t}
              onClick={() => setTone(t)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                tone === t ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            AI-drafted email · {invoice.email || 'no email on file'}
          </span>
          <button
            onClick={() => setShowPreview((s) => !s)}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            <Eye className="h-3.5 w-3.5" />
            {showPreview ? 'Hide preview' : 'Preview as email'}
          </button>
        </div>
        <textarea
          value={message}
          onChange={() => undefined}
          readOnly
          rows={14}
          className="w-full resize-y rounded-b-xl bg-white px-4 py-3 font-mono text-sm leading-relaxed text-slate-800 outline-none"
        />
      </div>

      {showPreview && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Email preview</p>
          <p className="text-sm text-slate-800">
            <span className="font-semibold">To:</span> {invoice.clientName} {invoice.email ? `<${invoice.email}>` : ''}
          </p>
          <p className="text-sm text-slate-800">
            <span className="font-semibold">Subject:</span> Invoice {invoice.invoiceNumber} — {bucket === '30+' ? 'Final Notice' : `Payment Reminder (${days} days overdue)`}
          </p>
          <div className="mt-3 whitespace-pre-wrap rounded-lg bg-white p-4 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-100">
            {message}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy message'}
        </button>
        <button
          onClick={() => onMarkSent(invoice)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <Send className="h-4 w-4" />
          Approve &amp; Mark as Sent
          <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
        </button>
      </div>

      {reminderPaused(invoice) && (        <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          <AlertTriangle className="h-4 w-4" />
          Reminders for this invoice are paused until {formatDate(invoice.pauseUntil, settings.timezone)} (logged payment promise).
        </div>
      )}
    </div>
  );
}
