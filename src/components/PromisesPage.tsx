import { useMemo, useState } from 'react';
import { HandCoins, Search, X } from 'lucide-react';
import type { Invoice, LogEntry, Settings } from '@/types';
import { formatDate, formatMoney } from '@/lib/format';
import { balanceOf, reminderPaused, todayISO } from '@/lib/logic';

interface Props {
  invoices: Invoice[];
  log: LogEntry[];
  settings: Settings;
  onResumeReminder: (invoice: Invoice) => void;
}

type PromiseStatus = 'active' | 'expired' | 'paid';

function promiseStatus(i: Invoice): PromiseStatus {
  if (balanceOf(i) <= 0) return 'paid';
  if (i.pauseUntil && i.pauseUntil <= todayISO()) return 'expired';
  return 'active';
}

const STATUS_STYLES: Record<PromiseStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  expired: 'bg-amber-50 text-amber-700 ring-amber-200',
  paid: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const STATUS_LABELS: Record<PromiseStatus, string> = {
  active: 'Active',
  expired: 'Expired',
  paid: 'Paid',
};

type Filter = 'all' | PromiseStatus;

export default function PromisesPage({ invoices, log, settings, onResumeReminder }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const promised = useMemo(
    () => invoices.filter((i) => i.pauseUntil !== null),
    [invoices]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return promised.filter((i) => {
      if (q && !`${i.clientName} ${i.invoiceNumber} ${i.email}`.toLowerCase().includes(q)) return false;
      if (filter !== 'all' && promiseStatus(i) !== filter) return false;
      return true;
    });
  }, [promised, query, filter]);

  const selected = useMemo(
    () => invoices.find((i) => i.id === selectedId) ?? null,
    [invoices, selectedId]
  );

  const selectedHistory = useMemo(() => {
    if (!selected) return [];
    return log
      .filter((e) => e.invoiceId === selected.id && (e.type === 'promise' || e.type === 'cleared' || e.type === 'sent'))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [log, selected]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: promised.length, active: 0, expired: 0, paid: 0 };
    for (const i of promised) c[promiseStatus(i)]++;
    return c;
  }, [promised]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Payment Promises</h1>
        <p className="mt-1 text-sm text-slate-500">
          Track promised payment dates. Reminders stay paused while a promise is active and resume automatically if the date passes without payment.
        </p>
      </div>

      {promised.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <HandCoins className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            No payment promises logged yet. Use the Promise button on an invoice to pause reminders.
          </p>
        </div>
      ) : (
        <>
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
            {([['all', 'All'], ['active', 'Active'], ['expired', 'Expired'], ['paid', 'Paid']] as [Filter, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  filter === key ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
                <span className={`ml-1.5 text-xs ${filter === key ? 'text-blue-200' : 'text-slate-400'}`}>{counts[key]}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <ul className="divide-y divide-slate-100">
                {filtered.map((i) => {
                  const status = promiseStatus(i);
                  const isSel = selected?.id === i.id;
                  return (
                    <li key={i.id}>
                      <button
                        onClick={() => setSelectedId(i.id)}
                        className={`flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50 ${isSel ? 'bg-blue-50' : ''}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900">{i.clientName}</p>
                          <p className="text-xs text-slate-400">
                            {i.invoiceNumber} · {i.email || 'no email'}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Promised: <span className="font-medium text-slate-700">{formatDate(i.pauseUntil, settings.timezone)}</span>
                            {i.promiseNote ? ` · ${i.promiseNote}` : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-semibold tabular-nums text-slate-900">{formatMoney(balanceOf(i), settings.currency)}</p>
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}>
                              {STATUS_LABELS[status]}
                            </span>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
                {filtered.length === 0 && (
                  <li className="px-5 py-12 text-center text-sm text-slate-400">No promises match these filters.</li>
                )}
              </ul>
            </div>

            <div className="lg:col-span-2">
              {selected ? (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="font-semibold text-slate-900">Promise details</h3>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Customer</dt>
                      <dd className="font-medium text-slate-900">{selected.clientName}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Invoice</dt>
                      <dd className="font-medium text-slate-900">{selected.invoiceNumber}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Amount</dt>
                      <dd className="font-medium tabular-nums text-slate-900">{formatMoney(balanceOf(selected), settings.currency)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Expected payment</dt>
                      <dd className="font-medium text-slate-900">{formatDate(selected.pauseUntil, settings.timezone)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Status</dt>
                      <dd>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[promiseStatus(selected)]}`}>
                          {STATUS_LABELS[promiseStatus(selected)]}
                        </span>
                      </dd>
                    </div>
                    {selected.promiseNote && (
                      <div>
                        <dt className="text-slate-500">Note</dt>
                        <dd className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-slate-700">{selected.promiseNote}</dd>
                      </div>
                    )}
                  </dl>

                  {promiseStatus(selected) === 'expired' && (
                    <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                      Promise date has passed without payment. This invoice is eligible for follow-up again.
                    </div>
                  )}

                  {reminderPaused(selected) && (
                    <button
                      onClick={() => onResumeReminder(selected)}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      Clear promise & resume reminders
                    </button>
                  )}

                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">History</p>
                    {selectedHistory.length === 0 ? (
                      <p className="text-sm text-slate-400">No history yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {selectedHistory.map((e) => (
                          <li key={e.id} className="text-sm text-slate-600">
                            <span className="text-xs text-slate-400">{formatDate(e.date, settings.timezone)}</span>
                            <p>{e.note}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
                  Select a promise to see its details.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
