import { useState } from 'react';
import { Database, Download, Save, ShieldCheck, Trash2 } from 'lucide-react';
import type { Invoice, LogEntry, Settings as SettingsType } from '@/types';
import { TIMEZONES } from '@/lib/format';
import { exportInvoicesCSV, downloadCSV } from '@/lib/csv';
import { clearAllData } from '@/lib/storage';

interface Props {
  settings: SettingsType;
  onSave: (s: SettingsType) => void;
  invoices: Invoice[];
  log: LogEntry[];
  onDeleted: () => void;
}

export default function SettingsPage({ settings, onSave, invoices, log, onDeleted }: Props) {
  const [draft, setDraft] = useState<SettingsType>(settings);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  const handleSave = () => {
    onSave(draft);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const handleDeleteAll = () => {
    clearAllData();
    onDeleted();
    setConfirmDelete(false);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Branding, currency, and data controls for your demo workspace.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-slate-900">Agency &amp; locale</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Agency Name</span>
            <input
              value={draft.agencyName}
              onChange={(e) => setDraft({ ...draft, agencyName: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Currency</span>
            <select
              value={draft.currency}
              onChange={(e) => setDraft({ ...draft, currency: e.target.value as SettingsType['currency'] })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="MAD">MAD — Moroccan Dirham</option>
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Timezone</span>
            <select
              value={draft.timezone}
              onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={!dirty}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save className="h-4 w-4" />
            {saved ? 'Saved' : 'Save settings'}
          </button>
          {dirty && <span className="text-xs text-slate-400">You have unsaved changes</span>}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-slate-900">Contact emails</h3>
        <p className="mt-1 text-sm text-slate-500">Saved with your other settings. No emails are sent by CollectPilot.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Admin Email</span>
            <input
              type="email"
              value={draft.adminEmail}
              onChange={(e) => setDraft({ ...draft, adminEmail: e.target.value })}
              placeholder="Reserved for future administrator notifications"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Support Email</span>
            <input
              type="email"
              value={draft.supportEmail}
              onChange={(e) => setDraft({ ...draft, supportEmail: e.target.value })}
              placeholder="Customer-facing support contact"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Sender / Reply-to Email</span>
            <input
              type="email"
              value={draft.senderEmail}
              onChange={(e) => setDraft({ ...draft, senderEmail: e.target.value })}
              placeholder="Reserved for a future email integration"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          CollectPilot does not send emails. AI drafts require human review. Copying or approving a draft does not send an email.
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-slate-900">Export data</h3>
        <p className="mt-1 text-sm text-slate-500">
          Download your invoices (with balances, days overdue, and classifications) as a CSV file.
        </p>
        <button
          onClick={() => downloadCSV(`collectpilot-export-${new Date().toISOString().slice(0, 10)}.csv`, exportInvoicesCSV(invoices))}
          disabled={invoices.length === 0}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-4 w-4" />
          Export to CSV ({invoices.length})
        </button>
      </div>

      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h3 className="flex items-center gap-2 font-semibold text-red-900">
          <Database className="h-4 w-4" />
          Delete all data
        </h3>
        <p className="mt-1 text-sm text-red-800">
          Removes all {invoices.length} invoices, {log.length} log entries, and settings from this browser. This cannot be
          undone.
        </p>
        {confirmDelete ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-red-900">Are you sure?</span>
            <button
              onClick={handleDeleteAll}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4" />
              Yes, delete everything
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-medium text-red-700 shadow-sm transition-colors hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
            Delete All Data
          </button>
        )}
      </div>
    </div>
  );
}
