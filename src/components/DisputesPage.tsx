import { useMemo, useState } from 'react';
import { AlertOctagon, Search, X } from 'lucide-react';
import type { Invoice, LogEntry, Settings } from '@/types';
import { formatDate, formatMoney } from '@/lib/format';
import { balanceOf, daysOverdue } from '@/lib/logic';

interface Props {
  invoices: Invoice[];
  log: LogEntry[];
  settings: Settings;
  onResolveDispute: (invoice: Invoice) => void;
}

type Filter = 'all' | 'open' | 'resolved';

function disputeStatus(i: Invoice): 'open' | 'resolved' {
  return i.disputed ? 'open' : 'resolved';
}

const STATUS_STYLES = {
  open: 'bg-red-50 text-red-700 ring-red-200',
  resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

export default function DisputesPage({ invoices, log, settings, onResolveDispute }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const disputed = useMemo(
    () => invoices.filter((i) => i.disputed || (i.disputeNote && balanceOf(i) > 0)),
    [invoices]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return disputed.filter((i) => {
      if (q && !`${i.clientName} ${i.invoiceNumber} ${i.email}`.toLowerCase().includes(q)) return false;
      if (filter === 'open' && !i.disputed) return false;
      if (filter === 'resolved' && i.disputed) return false;
      return true;
    });
  }, [disputed, query, filter]);

  const selected = useMemo(
    () => invoices.find((i) => i.id === selectedId) ?? null,
    [invoices, selectedId]
  );

  const selectedHistory = useMemo(() => {
    if (!selected) return [];
    return log
      .filter((e) => e.invoiceId === selected.id && (e.type === 'dispute' || e.type === 'cleared' || e.type === 'blocked'))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [log, selected]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Disputes</h1>
        <p className="mt-1 text-sm text-slate-500">
          Disputed invoices have reminders blocked. AI follow-up generation is disabled until the dispute is resolved.
        </p>
      </div>

      {disputed.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <AlertOctagon className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            No disputes logged. Use the Dispute button on an invoice to block follow-ups.
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
            {([['all', 'All'], ['open', 'Open'], ['resolved', 'Resolved']] as [Filter, string][]).map(([key, label]) => (
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

          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <ul className="divide-y divide-slate-100">
                {filtered.map((i) => {
                  const status = disputeStatus(i);
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
                          {i.disputeNote && <p className="mt-1 truncate text-xs text-slate-500">{i.disputeNote}</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-semibold tabular-nums text-slate-900">{formatMoney(balanceOf(i), settings.currency)}</p>
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}>
                              {status === 'open' ? 'Open' : 'Resolved'}
                            </span>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
                {filtered.length === 0 && (
                  <li className="px-5 py-12 text-center text-sm text-slate-400">No disputes match these filters.</li>
                )}
              </ul>
            </div>

            <div className="lg:col-span-2">
              {selected ? (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="font-semibold text-slate-900">Dispute details</h3>
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
                      <dt className="text-slate-500">Days overdue</dt>
                      <dd className="font-medium tabular-nums text-slate-900">{Math.max(daysOverdue(selected.dueDate), 0)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Status</dt>
                      <dd>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[disputeStatus(selected)]}`}>
                          {selected.disputed ? 'Open' : 'Resolved'}
                        </span>
                      </dd>
                    </div>
                    {selected.disputeNote && (
                      <div>
                        <dt className="text-slate-500">Reason</dt>
                        <dd className="mt-1 rounded-lg bg-red-50 px-3 py-2 text-red-800">{selected.disputeNote}</dd>
                      </div>
                    )}
                  </dl>

                  {selected.disputed ? (
                    <div className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-800">
                      Cannot create follow-up for a disputed invoice. Reminders are blocked until the dispute is resolved.
                    </div>
                  ) : (
                    <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
                      Dispute resolved. This invoice is eligible for follow-ups again.
                    </div>
                  )}

                  {selected.disputed && (
                    <button
                      onClick={() => onResolveDispute(selected)}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      Resolve dispute
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
                  Select a dispute to see its details.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
