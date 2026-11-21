import { useMemo } from 'react';
import {
  AlertOctagon,
  CalendarClock,
  FileWarning,
  HandCoins,
  Inbox,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import type { Classification, Invoice, LogEntry, Settings } from '@/types';
import { formatDate, formatMoney } from '@/lib/format';
import {
  AGE_BUCKETS,
  balanceOf,
  bucketOf,
  classificationMap,
  daysOverdue,
  isOverdue,
  isPaid,
  needsFollowUp,
  reminderPaused,
  type AgeBucket,
} from '@/lib/logic';

interface Props {
  invoices: Invoice[];
  log: LogEntry[];
  settings: Settings;
  onOpenInvoice: (invoice: Invoice) => void;
}

const BUCKET_COLORS: Record<AgeBucket, string> = {
  '1-7': 'bg-emerald-500',
  '8-15': 'bg-amber-500',
  '16-30': 'bg-orange-500',
  '30+': 'bg-red-500',
};

export default function Dashboard({ invoices, log, settings, onOpenInvoice }: Props) {
  const cur = settings.currency;
  const open = invoices.filter((i) => !isPaid(i));

  const stats = useMemo(() => {
    const overdue = open.filter(isOverdue);
    const followable = invoices.filter(needsFollowUp).filter((i) => !reminderPaused(i));
    const promises = invoices.filter((i) => i.pauseUntil !== null && !isPaid(i));
    const disputes = invoices.filter((i) => i.disputed && !isPaid(i));
    return {
      overdueCount: overdue.length,
      overdueTotal: overdue.reduce((s, i) => s + balanceOf(i), 0),
      promises: promises.length,
      promiseTotal: promises.reduce((s, i) => s + balanceOf(i), 0),
      disputes: disputes.length,
      disputeTotal: disputes.reduce((s, i) => s + balanceOf(i), 0),
      followable: followable.length,
    };
  }, [invoices, open]);

  const buckets = useMemo(() => {
    const map = new Map<AgeBucket, { count: number; total: number }>();
    AGE_BUCKETS.forEach((b) => map.set(b, { count: 0, total: 0 }));
    open.forEach((i) => {
      const b = bucketOf(Math.max(daysOverdue(i.dueDate), 0));
      if (b) {
        const entry = map.get(b)!;
        entry.count++;
        entry.total += balanceOf(i);
      }
    });
    return map;
  }, [open]);

  const maxTotal = Math.max(...AGE_BUCKETS.map((b) => buckets.get(b)!.total), 1);

  const classes = useMemo(() => classificationMap(invoices), [invoices]);
  const classCounts = useMemo(() => {
    const counts: Record<Classification, number> = { Good: 0, Risky: 0, Critical: 0 };
    for (const c of classes.values()) counts[c]++;
    return counts;
  }, [classes]);

  const recentLog = useMemo(
    () =>
      [...log]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 6),
    [log]
  );

  const priorityQueue = useMemo(
    () =>
      invoices
        .filter(needsFollowUp)
        .filter((i) => !reminderPaused(i))
        .sort((a, b) => daysOverdue(b.dueDate) - daysOverdue(a.dueDate))
        .slice(0, 5),
    [invoices]
  );

  if (invoices.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <Inbox className="mx-auto h-12 w-12 text-slate-300" />
        <h2 className="mt-4 text-lg font-semibold text-slate-900">No invoices yet</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          Import your agency's aging report to see overdue balances, payment promises, and AI-drafted follow-ups here.
        </p>
      </div>
    );
  }

  const cards = [
    {
      label: 'Overdue Invoices',
      value: String(stats.overdueCount),
      sub: `${formatMoney(stats.overdueTotal, cur)} outstanding`,
      icon: ReceiptText,
      accent: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Payment Promises',
      value: String(stats.promises),
      sub: `${formatMoney(stats.promiseTotal, cur)} paused`,
      icon: HandCoins,
      accent: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Disputes',
      value: String(stats.disputes),
      sub: `${formatMoney(stats.disputeTotal, cur)} on hold`,
      icon: FileWarning,
      accent: 'text-red-600 bg-red-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">{c.label}</p>
              <span className={`rounded-lg p-2 ${c.accent}`}>
                <c.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{c.value}</p>
            <p className="mt-1 text-sm text-slate-500">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Overdue by age</h3>
            <span className="text-xs text-slate-400">outstanding balance</span>
          </div>
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

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="font-semibold text-slate-900">Client classification</h3>
          <p className="mt-1 text-xs text-slate-400">based on each client's open invoices</p>
          <div className="mt-4 space-y-3">
            {(
              [
                ['Good', 'text-emerald-700 bg-emerald-50 ring-emerald-200'],
                ['Risky', 'text-amber-700 bg-amber-50 ring-amber-200'],
                ['Critical', 'text-red-700 bg-red-50 ring-red-200'],
              ] as [Classification, string][]
            ).map(([label, style]) => (
              <div key={label} className="flex items-center justify-between">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${style}`}>
                  {label}
                </span>
                <span className="text-sm font-semibold tabular-nums text-slate-700">{classCounts[label]}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {stats.followable} invoice{stats.followable === 1 ? '' : 's'} currently need a follow-up. Classification
            updates automatically as balances age.
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold text-slate-900">Priority follow-ups</h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
              <ShieldCheck className="h-3 w-3" />
              Review required
            </span>
          </div>
          {priorityQueue.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">Nothing needs a follow-up right now.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {priorityQueue.map((i) => (
                <li key={i.id}>
                  <button
                    onClick={() => onOpenInvoice(i)}
                    className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{i.clientName}</p>
                      <p className="text-xs text-slate-400">
                        {i.invoiceNumber} · {Math.max(daysOverdue(i.dueDate), 0)} days overdue
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums text-slate-800">
                        {formatMoney(balanceOf(i), cur)}
                      </span>
                      <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">Draft</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold text-slate-900">Recent activity</h3>
            <CalendarClock className="h-4 w-4 text-slate-300" />
          </div>
          {recentLog.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">
              Follow-ups, promises, and disputes will appear here.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentLog.map((e) => (
                <li key={e.id} className="flex items-start gap-3 px-5 py-3.5">
                  <span
                    className={`mt-0.5 rounded-lg p-1.5 ${
                      e.type === 'sent'
                        ? 'bg-blue-50 text-blue-600'
                        : e.type === 'promise'
                          ? 'bg-emerald-50 text-emerald-600'
                          : e.type === 'dispute'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {e.type === 'sent' ? (
                      <ReceiptText className="h-3.5 w-3.5" />
                    ) : e.type === 'promise' ? (
                      <HandCoins className="h-3.5 w-3.5" />
                    ) : e.type === 'dispute' ? (
                      <AlertOctagon className="h-3.5 w-3.5" />
                    ) : (
                      <CalendarClock className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800">
                      <span className="font-medium">{e.clientName}</span> · {e.invoiceNumber}
                    </p>
                    <p className="truncate text-xs text-slate-400">{e.note}</p>
                    <p className="mt-0.5 text-xs text-slate-300">{formatDate(e.date, settings.timezone)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
