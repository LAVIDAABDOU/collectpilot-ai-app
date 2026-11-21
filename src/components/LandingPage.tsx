import { BarChart3, Check, FileText, Mail, ShieldCheck, Sparkles, Upload } from 'lucide-react';
import { openPlanCheckout, type PaddlePlanName } from '@/lib/paddle';

interface Props {
  onEnter: () => void;
  onOpenLegal: (doc: 'privacy' | 'terms' | 'refund') => void;
}

const PLANS = [
  {
    name: 'Starter',
    price: 29,
    blurb: 'For small agencies getting started with collections.',
    features: ['50 invoices', 'AI follow-up emails', 'Dashboard'],
    popular: false,
  },
  {
    name: 'Growth',
    price: 79,
    blurb: 'For growing agencies with a steady invoice flow.',
    features: ['200 invoices', 'AI follow-up emails', 'Dashboard', 'CSV Import'],
    popular: true,
  },
  {
    name: 'Scale',
    price: 199,
    blurb: 'For established agencies that want it all.',
    features: ['Unlimited invoices', 'Everything in Growth', 'Priority Support'],
    popular: false,
  },
];

const PROOF = [
  { icon: Mail, label: 'AI-drafted follow-ups' },
  { icon: ShieldCheck, label: 'Human review before anything sends' },
  { icon: BarChart3, label: 'Live overdue dashboard' },
  { icon: Upload, label: 'Works with your CSV exports' },
];

export default function LandingPage({ onEnter, onOpenLegal }: Props) {
  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-900 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="text-base font-semibold tracking-tight text-slate-900">CollectPilot AI</span>
          </div>
          <button
            onClick={onEnter}
            className="rounded-lg bg-blue-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-800"
          >
            Login
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1 text-xs font-medium text-blue-800 ring-1 ring-inset ring-blue-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Every email is reviewed by you before it sends
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Stop Chasing Invoices.
            <span className="block text-blue-900">Get Paid Faster.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-500">
            AI writes polite follow-up emails for your overdue invoices automatically.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={onEnter}
              className="w-full rounded-lg bg-blue-900 px-8 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-800 sm:w-auto"
            >
              Start Free Trial
            </button>
            <button
              onClick={onEnter}
              className="w-full rounded-lg border border-slate-300 bg-white px-8 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
            >
              See the Dashboard
            </button>
          </div>

          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {PROOF.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-4 text-center"
              >
                <Icon className="h-4 w-4 text-blue-900" />
                <span className="text-xs leading-tight text-slate-600">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-slate-100 bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <span className="inline-flex rounded-full bg-white px-3.5 py-1 text-xs font-medium uppercase tracking-wide text-slate-500 ring-1 ring-inset ring-slate-200">
              Proposed Pricing
            </span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Simple plans that pay for themselves
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500">
              One recovered invoice usually covers the month. Pick a plan and start with a free trial.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl bg-white p-7 shadow-sm ${
                  plan.popular
                    ? 'ring-2 ring-blue-900 lg:-translate-y-2 lg:shadow-lg'
                    : 'border border-slate-200'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-900 px-3.5 py-1 text-xs font-semibold text-white shadow-sm">
                    MOST POPULAR
                  </span>
                )}
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{plan.name}</h3>
                <p className="mt-3">
                  <span className="text-4xl font-semibold tracking-tight text-slate-900">${plan.price}</span>
                  <span className="text-sm text-slate-400">/month</span>
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{plan.blurb}</p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-900" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => void openPlanCheckout(plan.name as PaddlePlanName, 'monthly')}
                  className={`mt-7 w-full rounded-lg px-4 py-3 text-sm font-medium shadow-sm transition-colors ${
                    plan.popular
                      ? 'bg-blue-900 text-white hover:bg-blue-800'
                      : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  Start Free Trial
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom trust line */}
      <footer className="bg-blue-950 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center sm:px-6">
          <div className="flex items-center gap-2 text-blue-200">
            <FileText className="h-4 w-4" />
            <span className="text-sm font-medium">Trusted by small businesses in the US</span>
          </div>
          <p className="text-xs text-blue-300/70">
            CollectPilot AI drafts every message — nothing is ever sent without your review and approval.
          </p>
          <nav className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label="Legal">
            {[
              ['privacy', 'Privacy Policy'],
              ['terms', 'Terms of Service'],
              ['refund', 'Refund Policy'],
            ].map(([path, label]) => (
              <a
                key={path}
                href={`/${path}`}
                onClick={(e) => {
                  e.preventDefault();
                  onOpenLegal(path as 'privacy' | 'terms' | 'refund');
                }}
                className="inline-flex min-h-[48px] items-center text-xs font-medium text-blue-200 underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
