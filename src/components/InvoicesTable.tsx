import { useMemo, useState } from 'react';
import { Ban, Download, MessageSquareText, Search, X } from 'lucide-react';
import type { Classification, Invoice, Settings } from '@/types';
import { formatDate, formatMoney } from '@/lib/format';
import {
  CLASSIFICATION_STYLES,
  balanceOf,
  canSendFollowUp,
  classificationMap,
  daysOverdue,
  invoiceState,
  isHardBlocked,
  isOverdue,
  isPaid,
  needsFollowUp,
} from '@/lib/logic';
import { downloadCSV, exportInvoicesCSV } from '@/lib/csv';

interface Props {
  invoices: Invoice[];
  settings: Settings;
  onOpenInvoice: (invoice: Invoice) => void;
  onLogPromise: (invoice: Invoice) => void;
  onLogDispute: (invoice: Invoice) => void;
  blockedInvoice: Invoice | null;
  onDismissBlocked: () => void;
}

type StatusFilter = 'all' | 'overdue' | 'open' | 'paid' | 'disputed' | 'promised';
type ClassFilter = 'all' | Classification;

const STATUS_TABS: [StatusFilter, string][] = [
  ['all', 'All'],
  ['overdue', 'Overdue'],
  ['open', 'Open'],
  ['paid', 'Paid'],
  ['promised', 'Promise logged'],
  ['disputed', 'Disputed'],
];

export default function InvoicesTable({ invoices, settings, onOpenInvoice, onLogPromise, onLogDispute, blockedInvoice, onDismissBlocked }: Props) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [classFilter, setClassFilter] = useState<ClassFilter>('all');
  const [sortKey, setSortKey] = useState<'dueDate' | 'amount' | 'client'>('dueDate');
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  const classes = useMemo(() => classificationMap(invoices), [invoices]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = invoices.filter((i) => {
      if (q && !`${i.clientName} ${i.invoiceNumber} ${i.email}`.toLowerCase().includes(q)) return false;
      if (classFilter !== 'all' && classes.get(i.clientName.trim().toLowerCase()) !== classFilter) return false;
      switch (status) {
        case 'overdue':
          return isOverdue(i);
        case 'open':
          return !isPaid(i);
        case 'paid':
          return isPaid(i);
        case 'disputed':
          return i.disputed;
        case 'promised':
          return i.pauseUntil !== null;
        default:
          return true;
      }
    });
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'dueDate') cmp = a.dueDate.localeCompare(b.dueDate);
      else if (sortKey === 'amount') cmp = balanceOf(a) - balanceOf(b);
      else cmp = a.clientName.localeCompare(b.clientName);
      return cmp * sortDir;
    });
    return list;
  }, [invoices, query, status, classFilter, classes, sortKey, sortDir]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(1);
    }
  };

  const hasFilters = query !== '' || status !== 'all' || classFilter !== 'all';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Invoices</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {filtered.length} of {invoices.length} invoices
          </p>
        </div>
        <button
          onClick={() => downloadCSV(`collectpilot-invoices-${new Date().toISOString().slice(0, 10)}.csv`, exportInvoicesCSV(invoices))}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
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
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value as ClassFilter)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All clients</option>
          <option value="Good">Good clients</option>
          <option value="Risky">Risky clients</option>
          <option value="Critical">Critical clients</option>
        </select>
        {hasFilters && (
          <button
            onClick={() => {
              setQuery('');
              setStatus('all');
              setClassFilter('all');
            }}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm text-slate-500 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>

      {blockedInvoice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span>
            Follow-up blocked — invoice is{' '}
            {blockedInvoice.disputed || blockedInvoice.status.trim().toLowerCase() === 'disputed'
              ? 'disputed'
              : 'paid'}
            .
          </span>
          <button
            onClick={onDismissBlocked}
            className="rounded-md px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {STATUS_TABS.map(([key, label]) => {
          const count =
            key === 'all'
              ? invoices.length
              : invoices.filter((i) =>
                  key === 'overdue'
                    ? isOverdue(i)
                    : key === 'open'
                      ? !isPaid(i)
                      : key === 'paid'
                        ? isPaid(i)
                        : key === 'disputed'
                          ? i.disputed
                          : i.pauseUntil !== null
                ).length;
          return (
            <button
              key={key}
              onClick={() => setStatus(key)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                status === key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label}
              <span className={`ml-1.5 text-xs ${status === key ? 'text-blue-200' : 'text-slate-400'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <th
                onClick={() => toggleSort('client')}
                className="cursor-pointer px-4 py-3 font-medium hover:text-slate-700"
              >
                Client {sortKey === 'client' && (sortDir === 1 ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 font-medium">Invoice</th>
              <th
                onClick={() => toggleSort('dueDate')}
                className="cursor-pointer px-4 py-3 font-medium hover:text-slate-700"
              >
                Due {sortKey === 'dueDate' && (sortDir === 1 ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-right font-medium">Balance</th>
              <th className="px-4 py-3 text-center font-medium">Days Overdue</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Promise</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((i) => {
              const bal = balanceOf(i);
              const days = bal > 0 ? Math.max(daysOverdue(i.dueDate), 0) : 0;
              const state = invoiceState(i);
              const cls = classes.get(i.clientName.trim().toLowerCase()) ?? 'Good';
              return (
                <tr key={i.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{i.clientName}</p>
                    {i.email && <p className="text-xs text-slate-400">{i.email}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{i.invoiceNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(i.dueDate, settings.timezone)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                    {formatMoney(bal, settings.currency)}
                  </td>
                  <td className={`px-4 py-3 text-center font-medium tabular-nums ${days > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                    {days}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${state.className}`}>
                      {state.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {i.pauseUntil ? (
                      <div>
                        <p className="font-medium">{formatDate(i.pauseUntil, settings.timezone)}</p>
                        {i.promiseNote && <p className="text-xs text-slate-400">{i.promiseNote}</p>}
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${CLASSIFICATION_STYLES[cls]}`}>
                      {cls}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {bal > 0 && !i.disputed && (
                        <>
                          <button
                            onClick={() => onLogPromise(i)}
                            title="Log payment promise"
                            className="rounded-md px-2 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50"
                          >
                            Promise
                          </button>
                          <button
                            onClick={() => onLogDispute(i)}
                            title="Log dispute"
                            className="rounded-md px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                          >
                            Dispute
                          </button>
                        </>
                      )}
                      {bal > 0 && !i.disputed && (
                        <button
                          onClick={() => onOpenInvoice(i)}
                          title="Draft follow-up"
                          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                            needsFollowUp(i)
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'text-blue-700 hover:bg-blue-50'
                          }`}
                        >
                          <MessageSquareText className="h-3.5 w-3.5" />
                          Draft
                        </button>
                      )}
                      {isHardBlocked(i) && (
                        <span
                          title={`Blocked: ${canSendFollowUp(i).reason ?? 'not eligible'}`}
                          className="inline-flex cursor-not-allowed items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-400"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Blocked
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-400">
                  No invoices match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
