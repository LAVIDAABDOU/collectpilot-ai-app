import { useMemo, useState } from 'react';
import { Inbox, MessageSquareText, Search, ShieldCheck, X } from 'lucide-react';
import type { Invoice, Settings } from '@/types';
import { formatDate, formatMoney } from '@/lib/format';
import {
  balanceOf,
  canSendFollowUp,
  daysOverdue,
  followUpBlockReason,
  invoiceState,
  isHardBlocked,
  reminderPaused,
} from '@/lib/logic';

interface Props {
  invoices: Invoice[];
  settings: Settings;
  onOpenInvoice: (invoice: Invoice) => void;
}

export default function FollowUpsPage({ invoices, settings, onOpenInvoice }: Props) {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'eligible' | 'blocked' | 'all'>('eligible');

  const cur = settings.currency;

  const lists = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (i: Invoice) => !q || `${i.clientName} ${i.invoiceNumber} ${i.email}`.toLowerCase().includes(q);

    const eligible = invoices
      .filter((i) => canSendFollowUp(i).allowed && matches(i))
      .sort((a, b) => daysOverdue(b.dueDate) - daysOverdue(a.dueDate));

    const blocked = invoices
      .filter((i) => {
        const d = canSendFollowUp(i);
        return !d.allowed && !isHardBlocked(i) === false && balanceOf(i) > 0 && matches(i);
      })
      .sort((a, b) => daysOverdue(b.dueDate) - daysOverdue(a.dueDate));

    const hardBlocked = invoices.filter((i) => isHardBlocked(i) && matches(i));

    return { eligible, blocked: [...blocked, ...hardBlocked], all: invoices.filter(matches) };
  }, [invoices, query]);

  const current = lists[tab];

  const tabs: [typeof tab, string, number][] = [
    ['eligible', 'Needs follow-up', lists.eligible.length],
    ['blocked', 'Blocked', lists.blocked.length],
    ['all', 'All', lists.all.length],
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">AI Follow-ups</h1>
        <p className="mt-1 text-sm text-slate-500">
          Draft friendly, professional, or firm follow-up messages for overdue invoices.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <p className="text-sm font-medium text-amber-900">
          Human Review Required
          <span className="block font-normal text-amber-800">
            No emails are ever sent: every message requires your review and approval first.
          </span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search client, invoice #, or email…"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        {query && (
          <button
            onClick={() => setQuery('')}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm text-slate-500 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tabs.map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === key ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {label}
            <span className={`ml-1.5 text-xs ${tab === key ? 'text-blue-200' : 'text-slate-400'}`}>{count}</span>
          </button>
        ))}
      </div>

      {current.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Inbox className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            {tab === 'eligible'
              ? 'Nothing needs a follow-up right now.'
              : 'No invoices in this view.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {current.map((i) => {
            const decision = canSendFollowUp(i);
            const state = invoiceState(i);
            const days = Math.max(daysOverdue(i.dueDate), 0);
            return (
              <div key={i.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{i.clientName}</p>
                    <p className="text-xs text-slate-400">
                      {i.invoiceNumber} · Due {formatDate(i.dueDate, settings.timezone)}
                    </p>
                  </div>
                  <span className={`shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${state.className}`}>
                    {state.label}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold tabular-nums text-slate-900">{formatMoney(balanceOf(i), cur)}</p>
                    <p className="text-xs text-slate-400">
                      {days > 0 ? `${days} days overdue` : 'Not yet overdue'}
                      {reminderPaused(i) ? ' · Paused' : ''}
                      {i.remindersSent > 0 ? ` · ${i.remindersSent} sent` : ''}
                    </p>
                  </div>
                  {decision.allowed ? (
                    <button
                      onClick={() => onOpenInvoice(i)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
                    >
                      <MessageSquareText className="h-4 w-4" />
                      Draft
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-500">
                      Blocked
                    </span>
                  )}
                </div>
                {!decision.allowed && (
                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
                    {decision.reason ?? 'Not eligible for follow-up.'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
