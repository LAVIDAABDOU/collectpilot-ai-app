import { useMemo } from 'react';
import { Download, TrendingUp } from 'lucide-react';
import type { Invoice, LogEntry, Settings } from '@/types';
import { formatDate, formatMoney } from '@/lib/format';
import {
  AGE_BUCKETS,
  balanceOf,
  bucketOf,
  classificationMap,
  daysOverdue,
  isOverdue,
  isPaid,
  reminderPaused,
  type AgeBucket,
} from '@/lib/logic';
import { downloadCSV, exportInvoicesCSV } from '@/lib/csv';

interface Props {
  invoices: Invoice[];
  log: LogEntry[];
  settings: Settings;
}

const BUCKET_COLORS: Record<AgeBucket, string> = {
  '1-7': 'bg-emerald-500',
  '8-15': 'bg-amber-500',
  '16-30': 'bg-orange-500',
  '30+': 'bg-red-500',
};

export default function ReportsPage({ invoices, log, settings }: Props) {
  const cur = settings.currency;

  const summary = useMemo(() => {
    const total = invoices.length;
    const open = invoices.filter((i) => !isPaid(i));
    const overdue = open.filter(isOverdue);
    const paid = invoices.filter(isPaid);
    const promised = invoices.filter((i) => i.pauseUntil !== null && !isPaid(i));
    const disputed = invoices.filter((i) => i.disputed && !isPaid(i));
    const outstandingTotal = open.reduce((s, i) => s + balanceOf(i), 0);
    const overdueTotal = overdue.reduce((s, i) => s + balanceOf(i), 0);
    const paidTotal = paid.reduce((s, i) => s + i.paidAmount, 0);
    const promisedTotal = promised.reduce((s, i) => s + balanceOf(i), 0);
    const disputedTotal = disputed.reduce((s, i) => s + balanceOf(i), 0);
    return {
      total,
      openCount: open.length,
      overdueCount: overdue.length,
      paidCount: paid.length,
      promisedCount: promised.length,
      disputedCount: disputed.length,
      outstandingTotal,
      overdueTotal,
      paidTotal,
      promisedTotal,
      disputedTotal,
    };
  }, [invoices]);

  const buckets = useMemo(() => {
    const map = new Map<AgeBucket, { count: number; total: number }>();
    AGE_BUCKETS.forEach((b) => map.set(b, { count: 0, total: 0 }));
    invoices.forEach((i) => {
      if (isPaid(i)) return;
      const b = bucketOf(Math.max(daysOverdue(i.dueDate), 0));
      if (b) {
        const entry = map.get(b)!;
        entry.count++;
        entry.total += balanceOf(i);
      }
    });
    return map;
  }, [invoices]);

  const maxTotal = Math.max(...AGE_BUCKETS.map((b) => buckets.get(b)!.total), 1);

  const classes = useMemo(() => classificationMap(invoices), [invoices]);
  const clientSummary = useMemo(() => {
    const groups = new Map<string, { count: number; balance: number; overdue: number; disputed: boolean }>();
    for (const inv of invoices) {
      const key = inv.clientName.trim();
      const entry = groups.get(key) ?? { count: 0, balance: 0, overdue: 0, disputed: false };
      entry.count++;
      if (!isPaid(inv)) entry.balance += balanceOf(inv);
      if (isOverdue(inv)) entry.overdue += balanceOf(inv);
      if (inv.disputed) entry.disputed = true;
      groups.set(key, entry);
    }
    return [...groups.entries()]
      .map(([name, data]) => ({ name, ...data, classification: classes.get(name.trim().toLowerCase()) ?? 'Good' }))
      .sort((a, b) => b.balance - a.balance);
  }, [invoices, classes]);

  const sentCount = useMemo(() => log.filter((e) => e.type === 'sent').length, [log]);
  const blockedCount = useMemo(() => log.filter((e) => e.type === 'blocked').length, [log]);

  if (invoices.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <TrendingUp className="mx-auto h-12 w-12 text-slate-300" />
        <h2 className="mt-4 text-lg font-semibold text-slate-900">No data to report</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          Import invoices to see aging analysis, client breakdowns, and collection metrics.
        </p>
      </div>
    );
  }

  const metrics = [
    { label: 'Total invoices', value: String(summary.total), sub: `${summary.openCount} open · ${summary.paidCount} paid` },
    { label: 'Outstanding balance', value: formatMoney(summary.outstandingTotal, cur), sub: `${summary.openCount} unpaid invoices` },
    { label: 'Overdue balance', value: formatMoney(summary.overdueTotal, cur), sub: `${summary.overdueCount} overdue` },
    { label: 'Collected', value: formatMoney(summary.paidTotal, cur), sub: `${summary.paidCount} fully paid` },
    { label: 'Promised', value: formatMoney(summary.promisedTotal, cur), sub: `${summary.promisedCount} active promises` },
    { label: 'Disputed', value: formatMoney(summary.disputedTotal, cur), sub: `${summary.disputedCount} in dispute` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">Aging analysis, client risk breakdown, and collection activity.</p>
        </div>
        <button
          onClick={() => downloadCSV(`collectpilot-report-${new Date().toISOString().slice(0, 10)}.csv`, exportInvoicesCSV(invoices))}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{m.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{m.value}</p>
            <p className="mt-1 text-xs text-slate-400">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900">Aging breakdown</h3>
          <p className="mt-1 text-xs text-slate-400">outstanding balance by days overdue</p>
          <div className="mt-6 space-y-4">
            {AGE_BUCKETS.map((b) => {
              const { count, total } = buckets.get(b)!;
              const pct = Math.round((total / maxTotal) * 100);
              return (
                <div key={b}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">
                      {b} days <span className="font-normal text-slate-400">({count})</span>
                    </span>
                    <span className="tabular-nums text-slate-600">{formatMoney(total, cur)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${BUCKET_COLORS[b]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900">Collection activity</h3>
          <p className="mt-1 text-xs text-slate-400">from the follow-up log</p>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3">
              <span className="text-sm font-medium text-blue-900">Follow-ups approved & sent</span>
              <span className="text-xl font-semibold text-blue-700">{sentCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-orange-50 px-4 py-3">
              <span className="text-sm font-medium text-orange-900">Follow-ups blocked (safety rules)</span>
              <span className="text-xl font-semibold text-orange-700">{blockedCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3">
              <span className="text-sm font-medium text-emerald-900">Payment promises logged</span>
              <span className="text-xl font-semibold text-emerald-700">{summary.promisedCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3">
              <span className="text-sm font-medium text-red-900">Disputes open</span>
              <span className="text-xl font-semibold text-red-700">{summary.disputedCount}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold text-slate-900">Client breakdown</h3>
          <p className="mt-0.5 text-xs text-slate-400">per-client balance, overdue amount, and risk classification</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 text-center font-medium">Invoices</th>
                <th className="px-5 py-3 text-right font-medium">Outstanding</th>
                <th className="px-5 py-3 text-right font-medium">Overdue</th>
                <th className="px-5 py-3 text-center font-medium">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clientSummary.map((c) => (
                <tr key={c.name} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{c.name}</td>
                  <td className="px-5 py-3 text-center text-slate-600">{c.count}</td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-900">{formatMoney(c.balance, cur)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-600">{formatMoney(c.overdue, cur)}</td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                        c.classification === 'Good'
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : c.classification === 'Risky'
                            ? 'bg-amber-50 text-amber-700 ring-amber-200'
                            : 'bg-red-50 text-red-700 ring-red-200'
                      }`}
                    >
                      {c.classification}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
