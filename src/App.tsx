import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, CreditCard, FileText, HandCoins, ListChecks, LogOut, MessageSquareText, Scale, Settings as SettingsIcon, ShieldCheck, Sparkles, Upload } from 'lucide-react';
import type { Invoice, LogEntry, Settings } from '@/types';
import { defaultSettings, loadInvoices, loadLog, loadSettings, saveInvoices, saveLog, saveSettings, uid } from '@/lib/storage';
import { onCheckoutOutcome } from '@/lib/paddle';
import { seedInvoices } from '@/lib/sampleData';
import { canSendFollowUp, daysOverdue, followUpBlockReason, isHardBlocked, isOverdue, isPaid } from '@/lib/logic';
import { fetchInvoices, fetchLog, fetchSettings, insertLog, upsertSettings, insertInvoice, updateInvoice, deleteInvoice } from '@/lib/db';
import { useAuth } from '@/components/AuthProvider';
import AuthPage from '@/components/AuthPage';
import Dashboard from '@/components/Dashboard';
import LandingPage from '@/components/LandingPage';
import ImportPage from '@/components/ImportPage';
import InvoicesTable from '@/components/InvoicesTable';
import MessageGenerator from '@/components/MessageGenerator';
import FollowUpLog from '@/components/FollowUpLog';
import SettingsPage from '@/components/SettingsPage';
import BillingPage from '@/components/BillingPage';
import LegalPage, { type LegalDoc } from '@/components/LegalPage';
import { ApproveModal, DeleteModal, DisputeModal, InvoiceFormModal, PromiseModal } from '@/components/Modals';
import PromisesPage from '@/components/PromisesPage';
import DisputesPage from '@/components/DisputesPage';
import ReportsPage from '@/components/ReportsPage';
import FollowUpsPage from '@/components/FollowUpsPage';

type View = 'landing' | 'auth' | 'dashboard' | 'import' | 'invoices' | 'message' | 'log' | 'promises' | 'disputes' | 'reports' | 'billing' | 'settings' | 'legal';

const LEGAL_PATHS: Record<string, LegalDoc> = { '/privacy': 'privacy', '/terms': 'terms', '/refund': 'refund' };
const LEGAL_TITLES: Record<LegalDoc, string> = { privacy: 'Privacy Policy', terms: 'Terms of Service', refund: 'Refund Policy' };

function legalFromPath(): LegalDoc | null {
  return LEGAL_PATHS[window.location.pathname] ?? null;
}

const NAV: { key: View; label: string; icon: typeof BarChart3 }[] = [
  { key: 'dashboard', label: 'Overview', icon: BarChart3 },
  { key: 'invoices', label: 'Invoices', icon: FileText },
  { key: 'message', label: 'AI Follow-ups', icon: MessageSquareText },
  { key: 'log', label: 'Follow-up Log', icon: ListChecks },
  { key: 'promises', label: 'Payment Promises', icon: HandCoins },
  { key: 'disputes', label: 'Disputes', icon: Scale },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
  { key: 'import', label: 'Import CSV', icon: Upload },
  { key: 'billing', label: 'Billing', icon: CreditCard },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [view, setView] = useState<View>(() => (legalFromPath() ? 'legal' : 'landing'));
  const [legalDoc, setLegalDoc] = useState<LegalDoc>(() => legalFromPath() ?? 'privacy');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [promiseFor, setPromiseFor] = useState<Invoice | null>(null);
  const [disputeFor, setDisputeFor] = useState<Invoice | null>(null);
  const [approveFor, setApproveFor] = useState<Invoice | null>(null);
  const [blockedInvoice, setBlockedInvoice] = useState<Invoice | null>(null);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteInvoiceState, setDeleteInvoiceState] = useState<Invoice | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Load data from Supabase when user signs in
  useEffect(() => {
    if (!user) {
      setInvoices([]);
      setLog([]);
      setSettings(defaultSettings);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    setDataError(null);

    (async () => {
      try {
        const [dbInvoices, dbLog, dbSettings] = await Promise.all([
          fetchInvoices(),
          fetchLog(),
          fetchSettings(),
        ]);
        setInvoices(dbInvoices);
        setLog(dbLog);
        setSettings(dbSettings ?? defaultSettings);
        setView('dashboard');
      } catch (err) {
        setDataError(err instanceof Error ? err.message : 'Failed to load data.');
      } finally {
        setDataLoading(false);
      }
    })();
  }, [user]);

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
        setView(user ? 'dashboard' : 'landing');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [user]);

  const openLegal = (doc: LegalDoc) => {
    setLegalDoc(doc);
    setView('legal');
    window.history.pushState({}, '', `/${doc === 'privacy' ? 'privacy' : doc}`);
    document.title = `${LEGAL_TITLES[doc]} — CollectPilot AI`;
    window.scrollTo(0, 0);
  };

  const exitLegal = () => {
    if (legalFromPath()) window.history.pushState({}, '', '/');
    setView(user ? 'dashboard' : 'landing');
    document.title = 'CollectPilot AI — Stop Chasing Invoices';
  };

  const addLog = useCallback(async (entry: Omit<LogEntry, 'id' | 'date'>): Promise<LogEntry> => {
    // Optimistic local update
    const localEntry: LogEntry = { ...entry, id: uid(), date: new Date().toISOString() };
    setLog((prev) => [localEntry, ...prev]);
    // Persist to Supabase
    if (user) {
      try {
        await insertLog(entry);
      } catch {
        // log error silently — optimistic state is already shown
      }
    }
    return localEntry;
  }, [user]);

  const openInvoice = (invoice: Invoice) => {
    const latest = invoices.find((i) => i.id === invoice.id) ?? invoice;
    const decision = canSendFollowUp(latest);
    if (!decision.allowed) {
      setBlockedInvoice(latest);
      void addLog({
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
    void addLog({
      type: 'draft',
      invoiceId: latest.id,
      invoiceNumber: latest.invoiceNumber,
      clientName: latest.clientName,
      note: `Draft generated for ${decision.remainingBalance.toFixed(2)} remaining.`,
    });
  };

  const handleImport = (newInvoices: Invoice[]) => {
    if (newInvoices.length === 0) return;
    if (user) {
      // Persist each invoice to Supabase
      (async () => {
        const inserted: Invoice[] = [];
        for (const inv of newInvoices) {
          try {
            const created = await insertInvoice(inv);
            inserted.push(created);
          } catch {
            inserted.push(inv);
          }
        }
        setInvoices((prev) => [...prev, ...inserted]);
      })();
    } else {
      setInvoices(newInvoices);
    }
  };

  const handleMarkSent = (invoice: Invoice) => setApproveFor(invoice);

  const confirmMarkSent = () => {
    if (!approveFor) return;
    const latest = invoices.find((i) => i.id === approveFor.id) ?? approveFor;
    const decision = canSendFollowUp(latest);
    if (!decision.allowed) {
      void addLog({
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
    if (user) {
      void updateInvoice(target.id, {
        remindersSent: target.remindersSent + 1,
        lastSentAt: new Date().toISOString(),
      });
    }
    void addLog({
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
    if (user) {
      void updateInvoice(target.id, { pauseUntil: date, promiseNote: note || target.promiseNote });
    }
    void addLog({
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
    if (user) {
      void updateInvoice(target.id, { disputed: true, disputeNote: note || target.disputeNote });
    }
    void addLog({
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
    if (user) {
      void updateInvoice(invoice.id, { pauseUntil: null, promiseNote: null });
    }
    void addLog({
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
    if (user) {
      void updateInvoice(invoice.id, { disputed: false, disputeNote: null });
    }
    void addLog({
      type: 'cleared',
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      note: 'Dispute resolved — reminders restarted.',
    });
    setToast(`Dispute resolved for ${invoice.clientName}.`);
  };

  const handleDeleteAll = () => {
    if (user) {
      // Delete all from Supabase
      (async () => {
        for (const inv of invoices) {
          try { await deleteInvoice(inv.id); } catch { /* ignore */ }
        }
      })();
    }
    setInvoices([]);
    setLog([]);
    setSettings(defaultSettings);
    setActiveId(null);
    setView('dashboard');
    setToast('All data deleted. The workspace is empty.');
  };

  const handleSaveSettings = (s: Settings) => {
    setSettings(s);
    if (user) {
      void upsertSettings(s);
    }
  };

  const handleSaveInvoice = (data: Omit<Invoice, 'id' | 'remindersSent' | 'lastSentAt' | 'pauseUntil' | 'promiseNote' | 'disputed' | 'disputeNote'>) => {
    if (editInvoice) {
      const target = editInvoice;
      setInvoices((prev) => prev.map((i) => i.id === target.id ? { ...i, ...data } : i));
      if (user) {
        void updateInvoice(target.id, data);
      }
      void addLog({
        type: 'cleared',
        invoiceId: target.id,
        invoiceNumber: data.invoiceNumber,
        clientName: data.clientName,
        note: `Invoice ${data.invoiceNumber} edited.`,
      });
      setEditInvoice(null);
      setToast(`Invoice ${data.invoiceNumber} updated.`);
    } else {
      const newInv: Invoice = {
        ...data,
        id: uid(),
        remindersSent: 0,
        lastSentAt: null,
        pauseUntil: null,
        promiseNote: null,
        disputed: false,
        disputeNote: null,
      };
      setInvoices((prev) => [...prev, newInv]);
      if (user) {
        void insertInvoice(newInv);
      }
      void addLog({
        type: 'draft',
        invoiceId: newInv.id,
        invoiceNumber: newInv.invoiceNumber,
        clientName: newInv.clientName,
        note: `Invoice ${newInv.invoiceNumber} added manually.`,
      });
      setShowAddForm(false);
      setToast(`Invoice ${data.invoiceNumber} added.`);
    }
  };

  const confirmDeleteInvoice = () => {
    if (!deleteInvoiceState) return;
    const target = deleteInvoiceState;
    setInvoices((prev) => prev.filter((i) => i.id !== target.id));
    if (user) {
      void deleteInvoice(target.id);
    }
    void addLog({
      type: 'cleared',
      invoiceId: target.id,
      invoiceNumber: target.invoiceNumber,
      clientName: target.clientName,
      note: `Invoice ${target.invoiceNumber} deleted.`,
    });
    setDeleteInvoiceState(null);
    setToast(`Invoice ${target.invoiceNumber} deleted.`);
  };

  // ── Render gates ──────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-400">
          <Sparkles className="h-5 w-5 animate-pulse" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  if (view === 'legal') {
    return <LegalPage doc={legalDoc} onBack={exitLegal} onNavigate={openLegal} />;
  }

  if (view === 'landing' && !user) {
    return <LandingPage onEnter={() => setView('auth')} onOpenLegal={openLegal} />;
  }

  if (view === 'auth' && !user) {
    return <AuthPage onBack={() => setView('landing')} />;
  }

  if (!user) {
    return <LandingPage onEnter={() => setView('auth')} onOpenLegal={openLegal} />;
  }

  const body = (() => {
    if (dataLoading) {
      return (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Sparkles className="mr-2 h-5 w-5 animate-pulse" />
          <span className="text-sm">Loading your data…</span>
        </div>
      );
    }

    if (dataError) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          <p className="font-medium">Could not load your data.</p>
          <p className="mt-1 text-red-700">{dataError}</p>
        </div>
      );
    }

    switch (view) {
      case 'dashboard':
        return (
          <>
            {invoices.length === 0 ? (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-900">
                <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600" />
                <span>Your workspace is empty. Import a CSV or add invoices to get started.</span>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
                <ShieldCheck className="h-4 w-4 shrink-0 text-amber-600" />
                <span><strong>Connected to Supabase</strong> — {invoices.length} invoices loaded from your secure workspace.</span>
              </div>
            )}
            <Dashboard invoices={invoices} log={log} settings={settings} onOpenInvoice={openInvoice} />
          </>
        );
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
            onEditInvoice={setEditInvoice}
            onDeleteInvoice={setDeleteInvoiceState}
            onAddInvoice={() => setShowAddForm(true)}
            blockedInvoice={blockedInvoice}
            onDismissBlocked={() => setBlockedInvoice(null)}
          />
        );
      case 'message':
        return activeInvoice ? (
          <div className="mx-auto max-w-3xl">
            <button
              onClick={() => { setActiveId(null); setView('message'); }}
              className="mb-4 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              ← Back to follow-ups
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
                  onClick={() => { setActiveId(null); setView('message'); }}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                >
                  Back to Follow-ups
                </button>
              </div>
            ) : (
              <MessageGenerator invoice={activeInvoice} settings={settings} onMarkSent={handleMarkSent} />
            )}
          </div>
        ) : (
          <FollowUpsPage invoices={invoices} settings={settings} onOpenInvoice={openInvoice} />
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
      case 'promises':
        return <PromisesPage invoices={invoices} log={log} settings={settings} onResumeReminder={resumeReminder} />;
      case 'disputes':
        return <DisputesPage invoices={invoices} log={log} settings={settings} onResolveDispute={resolveDispute} />;
      case 'reports':
        return <ReportsPage invoices={invoices} log={log} settings={settings} />;
      case 'billing':
        return <BillingPage agencyName={settings.agencyName} />;
      case 'settings':
        return <SettingsPage settings={settings} onSave={handleSaveSettings} invoices={invoices} log={log} onDeleted={handleDeleteAll} />;
    }
  })();

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
            {user.email && (
              <span className="hidden text-xs font-medium text-slate-500 md:inline">{user.email}</span>
            )}
            <button
              onClick={() => void signOut()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
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
              {key === 'message' && followUpCount > 0 && (
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

      {/* Footer */}
      <div className="border-t border-slate-200 bg-white pb-20">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <p className="text-center text-xs text-slate-400">
            No emails are ever sent: every message requires your review and approval first.
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
      {showAddForm && (
        <InvoiceFormModal
          invoice={null}
          settings={settings}
          onClose={() => setShowAddForm(false)}
          onSave={handleSaveInvoice}
        />
      )}
      {editInvoice && (
        <InvoiceFormModal
          invoice={editInvoice}
          settings={settings}
          onClose={() => setEditInvoice(null)}
          onSave={handleSaveInvoice}
        />
      )}
      {deleteInvoiceState && (
        <DeleteModal
          invoice={deleteInvoiceState}
          settings={settings}
          onClose={() => setDeleteInvoiceState(null)}
          onConfirm={confirmDeleteInvoice}
        />
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
