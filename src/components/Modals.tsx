import { useState } from 'react';
import { AlertOctagon, HandCoins, ShieldCheck } from 'lucide-react';
import type { Invoice, Settings } from '@/types';
import { formatDate, formatMoney } from '@/lib/format';
import { daysOverdue } from '@/lib/logic';

interface BaseProps {
  invoice: Invoice;
  settings: Settings;
  onClose: () => void;
}

export function PromiseModal({ invoice, settings, onClose, onConfirm }: BaseProps & { onConfirm: (date: string, note: string) => void }) {
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const valid = date !== '' && !isNaN(new Date(`${date}T00:00:00`).getTime());

  return (
    <ModalShell
      title="Log Payment Promise"
      icon={<HandCoins className="h-5 w-5 text-emerald-600" />}
      onClose={onClose}
    >
      <p className="text-sm text-slate-600">
        Client: <span className="font-medium text-slate-900">{invoice.clientName}</span> · Invoice {invoice.invoiceNumber} ·{' '}
        {formatMoney(invoice.amount - invoice.paidAmount, settings.currency)} outstanding.
      </p>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Promised payment date *</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Note (optional)</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Client said payment runs Friday"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </label>
      <div className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
        <HandCoins className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Reminders for this invoice will be paused until {date ? formatDate(date, settings.timezone) : 'that date'}.
      </div>
      <ModalActions
        onCancel={onClose}
        onConfirm={() => onConfirm(date, note.trim())}
        confirmLabel="Log promise"
        disabled={!valid}
        confirmClass="bg-emerald-600 hover:bg-emerald-700"
      />
    </ModalShell>
  );
}

export function DisputeModal({ invoice, settings, onClose, onConfirm }: BaseProps & { onConfirm: (note: string) => void }) {
  const [note, setNote] = useState('');

  return (
    <ModalShell
      title="Log Dispute"
      icon={<AlertOctagon className="h-5 w-5 text-red-600" />}
      onClose={onClose}
    >
      <p className="text-sm text-slate-600">
        Client: <span className="font-medium text-slate-900">{invoice.clientName}</span> · Invoice {invoice.invoiceNumber} ·{' '}
        {formatMoney(invoice.amount - invoice.paidAmount, settings.currency)} outstanding ·{' '}
        {Math.max(daysOverdue(invoice.dueDate), 0)} days overdue.
      </p>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Reason / details</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="e.g. Client contests the second deliverable milestone"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </label>
      <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-800">
        <AlertOctagon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        All reminders for this invoice stop while the dispute is open. You can resolve it later from the Follow-up Log.
      </div>
      <ModalActions
        onCancel={onClose}
        onConfirm={() => onConfirm(note.trim())}
        confirmLabel="Log dispute"
        confirmClass="bg-red-600 hover:bg-red-700"
      />
    </ModalShell>
  );
}

export function ApproveModal({ invoice, settings, onClose, onConfirm }: BaseProps & { onConfirm: () => void }) {
  return (
    <ModalShell
      title="Approve & Mark as Sent"
      icon={<ShieldCheck className="h-5 w-5 text-blue-600" />}
      onClose={onClose}
    >
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Human Review Required Before Sending — nothing was sent automatically. Approving records the follow-up as sent
        by you.
      </div>
      <p className="text-sm text-slate-600">
        Confirm the follow-up for <span className="font-medium text-slate-900">{invoice.clientName}</span> (invoice{' '}
        {invoice.invoiceNumber}, {formatMoney(invoice.amount - invoice.paidAmount, settings.currency)}) as sent on{' '}
        {formatDate(new Date().toISOString(), settings.timezone)}?
      </p>
      <ModalActions onCancel={onClose} onConfirm={onConfirm} confirmLabel="Approve & mark sent" confirmClass="bg-blue-600 hover:bg-blue-700" />
    </ModalShell>
  );
}

function ModalShell({ title, icon, children, onClose }: { title: string; icon: React.ReactNode; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold text-slate-900">
            {icon}
            {title}
          </h3>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            ✕
          </button>
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({
  onCancel,
  onConfirm,
  confirmLabel,
  disabled,
  confirmClass,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  disabled?: boolean;
  confirmClass: string;
}) {
  return (
    <div className="flex justify-end gap-3 pt-1">
      <button
        onClick={onCancel}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        disabled={disabled}
        className={`rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40 ${confirmClass}`}
      >
        {confirmLabel}
      </button>
    </div>
  );
}
