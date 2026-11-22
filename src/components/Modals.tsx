import { useState } from 'react';
import { AlertOctagon, HandCoins, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
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
        All reminders for this invoice stop while the dispute is open. You can resolve it later from the Disputes page.
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

export function DeleteModal({ invoice, settings, onClose, onConfirm }: BaseProps & { onConfirm: () => void }) {
  return (
    <ModalShell
      title="Delete Invoice"
      icon={<Trash2 className="h-5 w-5 text-red-600" />}
      onClose={onClose}
    >
      <p className="text-sm text-slate-600">
        Are you sure you want to delete invoice{' '}
        <span className="font-medium text-slate-900">{invoice.invoiceNumber}</span> for{' '}
        <span className="font-medium text-slate-900">{invoice.clientName}</span> (
        {formatMoney(invoice.amount - invoice.paidAmount, settings.currency)} outstanding)?
      </p>
      <p className="text-xs text-slate-400">This action cannot be undone.</p>
      <ModalActions
        onCancel={onClose}
        onConfirm={onConfirm}
        confirmLabel="Delete invoice"
        confirmClass="bg-red-600 hover:bg-red-700"
      />
    </ModalShell>
  );
}

function emptyInvoiceDraft(): Partial<Invoice> {
  return {
    clientName: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    amount: 0,
    paidAmount: 0,
    status: 'Open',
    email: '',
  };
}

export function InvoiceFormModal({
  invoice,
  settings,
  onClose,
  onSave,
}: {
  invoice: Invoice | null;
  settings: Settings;
  onClose: () => void;
  onSave: (data: Omit<Invoice, 'id' | 'remindersSent' | 'lastSentAt' | 'pauseUntil' | 'promiseNote' | 'disputed' | 'disputeNote'>) => void;
}) {
  const isEdit = invoice !== null;
  const [draft, setDraft] = useState<Partial<Invoice>>(invoice ? { ...invoice } : emptyInvoiceDraft());
  const [errors, setErrors] = useState<string[]>([]);

  const update = (field: keyof Invoice, value: string | number) => {
    setDraft((d) => ({ ...d, [field]: value }));
  };

  const handleSave = () => {
    const errs: string[] = [];
    if (!draft.clientName?.trim()) errs.push('Client name is required.');
    if (!draft.invoiceNumber?.trim()) errs.push('Invoice number is required.');
    if (!draft.dueDate?.trim()) errs.push('Due date is required.');
    if (draft.amount === undefined || draft.amount < 0) errs.push('Amount must be 0 or greater.');
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    onSave({
      clientName: draft.clientName!.trim(),
      invoiceNumber: draft.invoiceNumber!.trim(),
      invoiceDate: draft.invoiceDate || draft.dueDate!,
      dueDate: draft.dueDate!,
      amount: Number(draft.amount) || 0,
      paidAmount: Number(draft.paidAmount) || 0,
      status: draft.status || 'Open',
      email: draft.email || '',
    });
  };

  return (
    <ModalShell
      title={isEdit ? 'Edit Invoice' : 'Add Invoice'}
      icon={isEdit ? <Pencil className="h-5 w-5 text-blue-600" /> : <Plus className="h-5 w-5 text-blue-600" />}
      onClose={onClose}
    >
      {errors.length > 0 && (
        <div className="rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-800">
          <ul className="list-disc space-y-0.5 pl-4">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Client Name *</span>
          <input
            value={draft.clientName ?? ''}
            onChange={(e) => update('clientName', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Invoice Number *</span>
          <input
            value={draft.invoiceNumber ?? ''}
            onChange={(e) => update('invoiceNumber', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Invoice Date</span>
          <input
            type="date"
            value={draft.invoiceDate ?? ''}
            onChange={(e) => update('invoiceDate', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Due Date *</span>
          <input
            type="date"
            value={draft.dueDate ?? ''}
            onChange={(e) => update('dueDate', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Amount *</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={draft.amount ?? 0}
            onChange={(e) => update('amount', parseFloat(e.target.value) || 0)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Paid Amount</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={draft.paidAmount ?? 0}
            onChange={(e) => update('paidAmount', parseFloat(e.target.value) || 0)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Status</span>
          <select
            value={draft.status ?? 'Open'}
            onChange={(e) => update('status', e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="Open">Open</option>
            <option value="Overdue">Overdue</option>
            <option value="Partial">Partial</option>
            <option value="Paid">Paid</option>
            <option value="Disputed">Disputed</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            value={draft.email ?? ''}
            onChange={(e) => update('email', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>
      <ModalActions
        onCancel={onClose}
        onConfirm={handleSave}
        confirmLabel={isEdit ? 'Save changes' : 'Add invoice'}
        confirmClass="bg-blue-600 hover:bg-blue-700"
      />
    </ModalShell>
  );
}

function ModalShell({ title, icon, children, onClose }: { title: string; icon: React.ReactNode; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
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
