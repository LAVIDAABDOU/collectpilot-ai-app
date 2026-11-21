import { ArrowLeft, FileText, ScrollText, Undo2 } from 'lucide-react';

export type LegalDoc = 'privacy' | 'terms' | 'refund';

interface Props {
  doc: LegalDoc;
  onBack: () => void;
  onNavigate: (doc: LegalDoc) => void;
}

const META: Record<LegalDoc, { title: string; icon: typeof FileText; blurb: string }> = {
  privacy: {
    title: 'Privacy Policy',
    icon: FileText,
    blurb: 'How CollectPilot AI handles your data. In this demo, your data never leaves your browser.',
  },
  terms: {
    title: 'Terms of Service',
    icon: ScrollText,
    blurb: 'The rules for using CollectPilot AI. Nothing is sent without your review and approval.',
  },
  refund: {
    title: 'Refund Policy',
    icon: Undo2,
    blurb: 'CollectPilot AI offers a 14-day refund policy on all paid plans.',
  },
};

const DOCS: LegalDoc[] = ['privacy', 'terms', 'refund'];

export default function LegalPage({ doc, onBack, onNavigate }: Props) {
  const meta = META[doc];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <button onClick={onBack} className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <span className="text-sm font-semibold">CP</span>
            </span>
            <span className="text-base font-semibold tracking-tight text-slate-900">CollectPilot AI</span>
          </button>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <meta.icon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{meta.title}</h1>
            <p className="mt-0.5 text-sm text-slate-500">Last updated: November 18, 2026</p>
          </div>
        </div>

        {doc === 'privacy' && (
          <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-slate-700">
            <section>
              <h2 className="text-lg font-semibold text-slate-900">1. What we collect</h2>
              <p className="mt-2">
                CollectPilot AI processes the information you provide to draft invoice follow-ups: your agency name,
                client names, invoice numbers, amounts, due dates, and client email addresses. In this demo, all of
                that data stays in your own browser and is never uploaded to a server.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-900">2. How we use it</h2>
              <p className="mt-2">
                Your data is used only to generate draft follow-up messages and dashboard insights. Every message is
                a draft: nothing is ever sent to your clients without your explicit review and approval.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-900">3. What we never do</h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>We never send emails on your behalf automatically.</li>
                <li>We never sell or share your client data with third parties.</li>
                <li>We never use your invoice data to train AI models.</li>
              </ul>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-900">4. Your control</h2>
              <p className="mt-2">
                You can delete all of your data at any time from the Settings page, or simply clear your browser
                storage. Because demo data lives in your browser, deleting it is immediate and complete.
              </p>
            </section>
          </div>
        )}

        {doc === 'terms' && (
          <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-slate-700">
            <section>
              <h2 className="text-lg font-semibold text-slate-900">1. The service</h2>
              <p className="mt-2">
                CollectPilot AI is an invoice follow-up assistant. It drafts reminder messages for your overdue
                invoices and helps you track promises, disputes, and payments. You approve every message before it
                is sent.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-900">2. Plans and pricing</h2>
              <p className="mt-2">CollectPilot AI is offered on four plans:</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>Starter — $49/month</li>
                <li>Growth — $99/month</li>
                <li>Scale — $199/month</li>
                <li>Enterprise — Custom pricing, billed by agreement</li>
              </ul>
              <p className="mt-2">
                Subscriptions renew monthly until cancelled. You can cancel at any time from the Billing page.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-900">3. Acceptable use</h2>
              <p className="mt-2">
                You agree to use CollectPilot AI only to follow up on invoices you legitimately own or manage, and
                not to harass, mislead, or send unlawful communications to any person.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-900">4. Human review</h2>
              <p className="mt-2">
                AI-drafted messages are suggestions only. You are responsible for reviewing, editing, and approving
                every message before sending. CollectPilot AI is not liable for messages sent without review.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-900">5. Cancellation</h2>
              <p className="mt-2">
                You may stop using the service at any time. See our Refund Policy for eligibility for a refund
                within the first 14 days of a paid plan.
              </p>
            </section>
          </div>
        )}

        {doc === 'refund' && (
          <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-slate-700">
            <section>
              <h2 className="text-lg font-semibold text-slate-900">1. 14-day refund policy</h2>
              <p className="mt-2">
                Every paid CollectPilot AI plan — Starter ($49/month), Growth ($99/month), Scale ($199/month), and
                Enterprise (Custom) — comes with a 14-day refund policy. If you are not satisfied within the first
                14 days of your initial purchase of a plan, contact us and we will refund your payment in full.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-900">2. How to request a refund</h2>
              <p className="mt-2">
                Request a refund from the Billing page or by contacting your account manager within 14 days of the
                charge. Approved refunds are returned to the original payment method, typically within 5–10 business
                days.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-900">3. Renewals</h2>
              <p className="mt-2">
                The 14-day refund window applies to the initial purchase of each plan. Monthly renewals after the
                first 14 days can be cancelled at any time and will not be billed again.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-900">4. Demo note</h2>
              <p className="mt-2">
                This is a product demo — no payments are processed and no charges will ever appear on your account.
              </p>
            </section>
          </div>
        )}

        <div className="mt-10 flex flex-wrap gap-2 border-t border-slate-200 pt-6">
          {DOCS.filter((d) => d !== doc).map((d) => (
            <button
              key={d}
              onClick={() => onNavigate(d)}
              className="inline-flex min-h-[48px] items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              {META[d].title}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
