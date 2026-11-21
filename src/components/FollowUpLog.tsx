import { useMemo, useState } from 'react';
import { AlertOctagon, CalendarClock, HandCoins, MessageSquareText, ReceiptText, ShieldAlert, X } from 'lucide-react';
import type { Invoice, LogEntry, Settings } from '@/types';
import { formatDate, formatMoney } from '@/lib/format';

interface Props {
  log: LogEntry[];
  invoices: Invoice[];
  settings: Settings;
  onOpenInvoice: (invoice: Invoice) => void;
  onResumeReminder: (invoice: Invoice) => void;
  onResolveDispute: (invoice: Invoice) => void;
}

const TYPE_META = {
  sent: { label: 'Follow-up approved & sent', icon: ReceiptText, style: 'bg-blue-50 text-blue-600' },
  promise: { label: 'Payment promise logged', icon: HandCoins, style: 'bg-emerald-50 text-emerald-600' },
  dispute: { label: 'Dispute logged', icon: AlertOctagon, style: 'bg-red-50 text-red-600' },
  cleared: { label: 'Reminders resumed', icon: MessageSquareText, style: 'bg-slate-100 text-slate-500' },
  draft: { label: 'Draft generated', icon: MessageSquareText, style: 'bg-sky-50 text-sky-600' },
  blocked: { label: 'Follow-up blocked', icon: ShieldAlert, style: 'bg-orange-50 text-orange-600' },
} as const;

export default function FollowUpLog({ log, invoices, settings, onOpenInvoice, onResumeReminder, onResolveDispute }: Props) {
  const [filter, setFilter] = useState<'all' | 'sent' | 'promise' | 'dispute' | 'draft' | 'blocked'>('all');

  const byId = useMemo(() => new Map(invoices.map((i) => [i.id, i])), [invoices]);
  const entries = useMemo(
    () => [...log].sort((a, b) => b.date.localeCompare(a.date)).filter((e) => filter === 'all' || e.type === filter),
    [log, filter]
  );

  const promised = invoices.filter((i) => i.pauseUntil !== null && i.amount - i.paidAmount > 0);
  const disputed = invoices.filter((i) => i.disputed && i.amount - i.paidAmount > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Follow-up Log</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every approved send, payment promise, and dispute — with reminders paused accordingly.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-900">
              <HandCoins className="h-4 w-4" />
              Active payment promises
            </p>
            <span className="text-2xl font-semibold text-emerald-700">{promised.length}</span>
          </div>
          {promised.length === 0 ? (
            <p className="mt-3 text-xs text-emerald-700/70">None — no reminders are currently paused by a promise.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {promised.map((i) => (
                <li key={i.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-emerald-100">
                  <div>
                    <p className="font-medium text-slate-800">{i.clientName}</p>
                    <p className="text-xs text-slate-400">
                      pause until {formatDate(i.pauseUntil, settings.timezone)}
                      {i.promiseNote ? ` · ${i.promiseNote}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => onResumeReminder(i)}
                    className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                  >
                    Resume
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-medium text-red-900">
              <AlertOctagon className="h-4 w-4" />
              Open disputes (reminders stopped)
            </p>
            <span className="text-2xl font-semibold text-red-700">{disputed.length}</span>
          </div>
          {disputed.length === 0 ? (
            <p className="mt-3 text-xs text-red-700/70">None — no invoices are in dispute.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {disputed.map((i) => (
                <li key={i.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-red-100">
                  <div>
                    <p className="font-medium text-slate-800">{i.clientName}</p>
                    <p className="max-w-[240px] truncate text-xs text-slate-400">{i.disputeNote ?? 'Dispute under review'}</p>
                  </div>
                  <button
                    onClick={() => onResolveDispute(i)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                  >
                    <X className="h-3 w-3" />
                    Resolve
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ['all', 'All'],
            ['sent', 'Sent follow-ups'],
            ['draft', 'Drafts'],
            ['promise', 'Promises'],
            ['dispute', 'Disputes'],
            ['blocked', 'Blocked'],
          ] as [typeof filter, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              filter === key ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {entries.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400">
            Nothing logged yet. Approve a follow-up or log a promise to see it here.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {entries.map((e) => {
              const meta = TYPE_META[e.type];
              const inv = byId.get(e.invoiceId);
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <span className={`rounded-lg p-2 ${meta.style}`}>
                    <meta.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {meta.label} · {e.clientName} <span className="font-normal text-slate-400">({e.invoiceNumber})</span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                      <CalendarClock className="h-3 w-3" />
                      {formatDate(e.date, settings.timezone)}
                      {e.note ? ` — ${e.note}` : ''}
                    </p>
                  </div>
                  {inv && (e.type === 'sent' || e.type === 'promise') && inv.amount - inv.paidAmount > 0 && (
                    <button
                      onClick={() => onOpenInvoice(inv)}
                      className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                    >
                      {e.type === 'sent' ? 'Follow up again' : 'View invoice'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
