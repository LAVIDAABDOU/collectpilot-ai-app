import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CreditCard, FileText, Inbox, ListChecks, Settings as SettingsIcon, ShieldCheck, Sparkles, Upload } from 'lucide-react';
import type { Invoice, LogEntry, Settings } from '@/types';
import { loadInvoices, loadLog, loadSettings, saveInvoices, saveLog, saveSettings, uid } from '@/lib/storage';
import { onCheckoutOutcome } from '@/lib/paddle';
import { seedInvoices } from '@/lib/sampleData';
import { canSendFollowUp, daysOverdue, followUpBlockReason, isHardBlocked, isOverdue, isPaid } from '@/lib/logic';
import Dashboard from '@/components/Dashboard';
import LandingPage from '@/components/LandingPage';
import ImportPage from '@/components/ImportPage';
import InvoicesTable from '@/components/InvoicesTable';
import MessageGenerator from '@/components/MessageGenerator';
import FollowUpLog from '@/components/FollowUpLog';
import SettingsPage from '@/components/SettingsPage';
import BillingPage from '@/components/BillingPage';
import LegalPage, { type LegalDoc } from '@/components/LegalPage';
import { ApproveModal, DisputeModal, PromiseModal } from '@/components/Modals';

type View = 'landing' | 'dashboard' | 'import' | 'invoices' | 'message' | 'log' | 'billing' | 'settings' | 'legal';

const LEGAL_PATHS: Record<string, LegalDoc> = { '/privacy': 'privacy', '/terms': 'terms', '/refund': 'refund' };
const LEGAL_TITLES: Record<LegalDoc, string> = { privacy: 'Privacy Policy', terms: 'Terms of Service', refund: 'Refund Policy' };

function legalFromPath(): LegalDoc | null {
  return LEGAL_PATHS[window.location.pathname] ?? null;
}

const NAV: { key: View; label: string; icon: typeof BarChart3 }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'import', label: 'Import CSV', icon: Upload },
  { key: 'invoices', label: 'Invoices', icon: FileText },
  { key: 'log', label: 'Follow-up Log', icon: ListChecks },
  { key: 'billing', label: 'Billing', icon: CreditCard },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function App() {
  const [invoices, setInvoices] = useState<Invoice[]>(() => loadInvoices(seedInvoices()));
  const [log, setLog] = useState<LogEntry[]>(() => loadLog());
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [view, setView] = useState<View>(() => (legalFromPath() ? 'legal' : 'landing'));
  const [legalDoc, setLegalDoc] = useState<LegalDoc>(() => legalFromPath() ?? 'privacy');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [promiseFor, setPromiseFor] = useState<Invoice | null>(null);
  const [disputeFor, setDisputeFor] = useState<Invoice | null>(null);
  const [approveFor, setApproveFor] = useState<Invoice | null>(null);
  const [blockedInvoice, setBlockedInvoice] = useState<Invoice | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => saveInvoices(invoices), [invoices]);
  useEffect(() => saveLog(log), [log]);
  useEffect(() => saveSettings(settings), [settings]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(
    () =>
      onCheckoutOutcome((outcome) => {
        if (outcome.kind === 'success') {
          setToast('Payment received — your subscription is being activated. Refreshing billing status…');
        } else if (outcome.kind === 'cancel') {
          setToast('Checkout closed — no charge was made.');
        } else {
          setToast(outcome.message || 'Checkout ran into a problem. Please try again.');
        }
      }),
    []
  );

  const activeInvoice = useMemo(() => invoices.find((i) => i.id === activeId) ?? null, [invoices, activeId]);
  const followUpCount = useMemo(
    () => invoices.filter((i) => isOverdue(i) && !followUpBlockReason(i)).length,
    [invoices]
  );

  useEffect(() => {
    const onPopState = () => {
      const doc = legalFromPath();
      if (doc) {
        setLegalDoc(doc);
        setView('legal');
      } else {
        setView('landing');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const openLegal = (doc: LegalDoc) => {
    setLegalDoc(doc);
    setView('legal');
    window.history.pushState({}, '', `/${doc === 'privacy' ? 'privacy' : doc}`);
    document.title = `${LEGAL_TITLES[doc]} — CollectPilot AI`;
    window.scrollTo(0, 0);
  };

  const exitLegal = () => {
    if (legalFromPath()) window.history.pushState({}, '', '/');
    setView('landing');
    document.title = 'CollectPilot AI — Stop Chasing Invoices';
  };

  const openInvoice = (invoice: Invoice) => {
    // CHECK 1 — re-read the latest data, never trust the clicked row's snapshot.
    const latest = invoices.find((i) => i.id === invoice.id) ?? invoice;
    const decision = canSendFollowUp(latest);
    if (!decision.allowed) {
      setBlockedInvoice(latest);
      addLog({
        type: 'blocked',
        invoiceId: latest.id,
        invoiceNumber: latest.invoiceNumber,
        clientName: latest.clientName,
        note: `Follow-up blocked — ${decision.reason ?? 'invoice is not eligible.'}`,
      });
      return;
    }
    setBlockedInvoice(null);
    setActiveId(latest.id);
    setView('message');
    addLog({
      type: 'draft',
      invoiceId: latest.id,
      invoiceNumber: latest.invoiceNumber,
      clientName: latest.clientName,
      note: `Draft generated for ${decision.remainingBalance.toFixed(2)} remaining.`,
    });
  };

  const addLog = (entry: Omit<LogEntry, 'id' | 'date'>): LogEntry => {
    const full: LogEntry = { ...entry, id: uid(), date: new Date().toISOString() };
    setLog((prev) => [full, ...prev]);
    return full;
  };

  const handleImport = (newInvoices: Invoice[]) => {
    if (newInvoices.length > 0) setInvoices(newInvoices);
  };

  const handleMarkSent = (invoice: Invoice) => setApproveFor(invoice);

  const confirmMarkSent = () => {
    if (!approveFor) return;
    // CHECK 2 — re-read from the current store, not the stale approveFor snapshot.
    const latest = invoices.find((i) => i.id === approveFor.id) ?? approveFor;
    const decision = canSendFollowUp(latest);
    if (!decision.allowed) {
      addLog({
        type: 'blocked',
        invoiceId: latest.id,
        invoiceNumber: latest.invoiceNumber,
        clientName: latest.clientName,
        note: `Approval rejected — ${decision.reason ?? 'invoice is no longer eligible.'} Data refresh required.`,
      });
      setApproveFor(null);
      setToast(`Approval rejected — ${decision.reason ?? 'invoice is no longer eligible.'} Please refresh the invoice data.`);
      setView('invoices');
      return;
    }
    const target = approveFor;
    setInvoices((prev) =>
      prev.map((i) =>
        i.id === target.id
          ? { ...i, remindersSent: i.remindersSent + 1, lastSentAt: new Date().toISOString() }
          : i
      )
    );
    addLog({
      type: 'sent',
      invoiceId: target.id,
      invoiceNumber: target.invoiceNumber,
      clientName: target.clientName,
      note: `Follow-up approved and marked as sent (${Math.max(daysOverdue(target.dueDate), 0)} days overdue)`,
    });
    setApproveFor(null);
    setToast(`Follow-up for ${target.clientName} approved and logged as sent.`);
    setView('invoices');
  };

  const confirmPromise = (date: string, note: string) => {
    if (!promiseFor) return;
    const target = promiseFor;
    if (!date || isNaN(new Date(`${date}T00:00:00`).getTime())) {
      setToast('Please enter a valid promise date.');
      return;
    }
    if (isPaid(target) || target.disputed) {
      setToast(
        target.disputed
          ? 'Cannot log a promise for a disputed invoice.'
          : 'Cannot log a promise for a paid invoice.'
      );
      setPromiseFor(null);
      return;
    }
    setInvoices((prev) =>
      prev.map((i) => (i.id === target.id ? { ...i, pauseUntil: date, promiseNote: note || i.promiseNote } : i))
    );
    addLog({
      type: 'promise',
      invoiceId: target.id,
      invoiceNumber: target.invoiceNumber,
      clientName: target.clientName,
      note: `Payment promised by ${date}${note ? ` — ${note}` : ''}. Reminders paused until then.`,
    });
    setPromiseFor(null);
    setToast(`Payment promise logged for ${target.clientName}. Reminders paused until ${date}.`);
  };

  const confirmDispute = (note: string) => {
    if (!disputeFor) return;
    const target = disputeFor;
    setInvoices((prev) =>
      prev.map((i) => (i.id === target.id ? { ...i, disputed: true, disputeNote: note || i.disputeNote } : i))
    );
    addLog({
      type: 'dispute',
      invoiceId: target.id,
      invoiceNumber: target.invoiceNumber,
      clientName: target.clientName,
      note: note || 'Dispute logged — reminders stopped.',
    });
    setDisputeFor(null);
    setToast(`Dispute logged for ${target.clientName}. Reminders stopped.`);
  };

  const resumeReminder = (invoice: Invoice) => {
    setInvoices((prev) =>
      prev.map((i) => (i.id === invoice.id ? { ...i, pauseUntil: null, promiseNote: null } : i))
    );
    addLog({
      type: 'cleared',
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      note: 'Payment promise cleared — reminders resumed.',
    });
    setToast(`Reminders resumed for ${invoice.clientName}.`);
  };

  const resolveDispute = (invoice: Invoice) => {
    setInvoices((prev) =>
      prev.map((i) => (i.id === invoice.id ? { ...i, disputed: false, disputeNote: null } : i))
    );
    addLog({
      type: 'cleared',
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      note: 'Dispute resolved — reminders restarted.',
    });
    setToast(`Dispute resolved for ${invoice.clientName}.`);
  };

  const handleDeleteAll = () => {
    setInvoices([]);
    setLog([]);
    setSettings({ ...settings, agencyName: 'Bright Funnel Media' });
    setActiveId(null);
    setView('dashboard');
    setToast('All data deleted. The workspace is empty.');
  };

  const body = (() => {
    switch (view) {
      case 'dashboard':
        return <Dashboard invoices={invoices} log={log} settings={settings} onOpenInvoice={openInvoice} />;
      case 'import':
        return <ImportPage onImport={handleImport} existingCount={invoices.length} />;
      case 'invoices':
        return (
          <InvoicesTable
            invoices={invoices}
            settings={settings}
            onOpenInvoice={openInvoice}
            onLogPromise={setPromiseFor}
            onLogDispute={setDisputeFor}
            blockedInvoice={blockedInvoice}
            onDismissBlocked={() => setBlockedInvoice(null)}
          />
        );
      case 'message':
        return activeInvoice ? (
          <div className="mx-auto max-w-3xl">
            <button
              onClick={() => setView('invoices')}
              className="mb-4 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              ← Back to invoices
            </button>
            {isHardBlocked(activeInvoice) || !canSendFollowUp(activeInvoice).allowed ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-900">
                      Follow-up blocked — {canSendFollowUp(activeInvoice).reason}
                    </p>
                    <p className="mt-1 text-sm text-red-700">Please refresh the invoice data and try again.</p>
                  </div>
                </div>
                <button
                  onClick={() => setView('invoices')}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                >
                  Back to Invoices
                </button>
              </div>
            ) : (
              <MessageGenerator invoice={activeInvoice} settings={settings} onMarkSent={handleMarkSent} />
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Inbox className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">Pick an invoice from the list to draft a follow-up.</p>
            <button
              onClick={() => setView('invoices')}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Go to Invoices
            </button>
          </div>
        );
      case 'log':
        return (
          <FollowUpLog
            log={log}
            invoices={invoices}
            settings={settings}
            onOpenInvoice={openInvoice}
            onResumeReminder={resumeReminder}
            onResolveDispute={resolveDispute}
          />
        );
      case 'billing':
        return <BillingPage agencyName={settings.agencyName} />;
      case 'settings':
        return <SettingsPage settings={settings} onSave={setSettings} invoices={invoices} log={log} onDeleted={handleDeleteAll} />;
    }
  })();

  if (view === 'legal') {
    return <LegalPage doc={legalDoc} onBack={exitLegal} onNavigate={openLegal} />;
  }

  if (view === 'landing') {
    return <LandingPage onEnter={() => setView('dashboard')} onOpenLegal={openLegal} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <button onClick={() => setView('dashboard')} className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="text-left">
              <span className="block text-base font-semibold tracking-tight text-slate-900">CollectPilot AI</span>
              <span className="block text-[11px] leading-tight text-slate-400">Invoice follow-up assistant</span>
            </span>
          </button>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200 sm:inline-flex">
              <ShieldCheck className="h-3.5 w-3.5" />
              Human Review Required Before Sending
            </span>
            <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 md:inline">
              Demo — data stays in your browser
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 pb-24 sm:px-6 lg:pb-32 lg:py-8">
        {/* Sidebar */}
        <nav className="sticky top-24 hidden h-fit w-52 shrink-0 flex-col gap-1 lg:flex">
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                view === key ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {key === 'invoices' && followUpCount > 0 && (
                <span className="ml-auto rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                  {followUpCount}
                </span>
              )}
            </button>
          ))}
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-500">
            <p className="font-medium text-slate-700">How it works</p>
            <p className="mt-1.5">1. Import your CSV</p>
            <p>2. Review AI drafts per invoice</p>
            <p>3. Approve &amp; mark as sent yourself</p>
          </div>
        </nav>

        {/* Main */}
        <main className="min-w-0 flex-1">
          {/* Mobile nav */}
          <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1 lg:hidden">
            {NAV.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`inline-flex min-h-[48px] shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  view === key ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {body}
        </main>
      </div>

      {/* Demo banner — extra bottom margin keeps it clear of the hosting badge */}
      <div className="border-t border-slate-200 bg-white pb-20">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <p className="text-center text-xs text-slate-400">
            Your data stays in your browser — CollectPilot AI is a standalone demo. No emails are ever sent; every
            message requires your review and approval first.
          </p>
        </div>
      </div>

      {/* Modals */}
      {promiseFor && (
        <PromiseModal invoice={promiseFor} settings={settings} onClose={() => setPromiseFor(null)} onConfirm={confirmPromise} />
      )}
      {disputeFor && (
        <DisputeModal invoice={disputeFor} settings={settings} onClose={() => setDisputeFor(null)} onConfirm={confirmDispute} />
      )}
      {approveFor && (
        <ApproveModal invoice={approveFor} settings={settings} onClose={() => setApproveFor(null)} onConfirm={confirmMarkSent} />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
          <div className="flex items-center gap-2.5 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
