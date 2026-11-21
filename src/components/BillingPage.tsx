import { useState } from 'react';
import { Check, CreditCard } from 'lucide-react';
import { openPlanCheckout, type PaddlePlanName } from '@/lib/paddle';

interface Props {
  agencyName: string;
}

const PLANS = [
  {
    name: 'Starter',
    monthly: '$29',
    yearly: '$290',
    blurb: 'For solo operators getting their invoices under control.',
    features: ['50 invoices per month', 'AI follow-up emails', 'Payment tracking dashboard'],
  },
  {
    name: 'Growth',
    monthly: '$79',
    yearly: '$790',
    blurb: 'For growing teams with a steady flow of clients.',
    features: ['200 invoices per month', 'AI follow-up emails', 'Payment tracking dashboard', 'CSV import & export'],
  },
  {
    name: 'Scale',
    monthly: '$199',
    yearly: '$1,990',
    blurb: 'For established agencies managing many clients.',
    features: ['Unlimited invoices', 'AI follow-up emails', 'Payment tracking dashboard', 'CSV import & export', 'Follow-up automation rules'],
  },
  {
    name: 'Enterprise',
    monthly: 'Custom',
    yearly: 'Custom',
    blurb: 'For larger organizations with custom needs.',
    features: ['Everything in Scale', 'Custom integrations', 'Dedicated account manager', 'Priority support'],
  },
];

export default function BillingPage({ agencyName }: Props) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const periodLabel = billingPeriod === 'monthly' ? '/month' : '/year';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Billing</h1>
        <p className="mt-1 text-sm text-slate-500">
          Plans for {agencyName || 'your agency'}. Subscriptions are not active in this demo.
        </p>
      </div>

      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          {(['monthly', 'yearly'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setBillingPeriod(period)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                billingPeriod === period
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{plan.name}</h3>
            </div>
            <p className="mt-3">
              <span className="text-3xl font-semibold tracking-tight text-slate-900">{plan[billingPeriod]}</span>
              {plan[billingPeriod] !== 'Custom' && <span className="text-sm text-slate-400">{periodLabel}</span>}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{plan.blurb}</p>
            <ul className="mt-5 flex-1 space-y-2.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={
                plan.name === 'Enterprise'
                  ? undefined
                  : () => void openPlanCheckout(plan.name as PaddlePlanName, billingPeriod)
              }
              className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
              title={plan.name === 'Enterprise' ? 'Contact your account manager' : 'Opens secure Paddle checkout'}
            >
              Subscribe
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
        Need a different plan? Contact your account manager — current plan details stay on this page in the demo.
      </div>
    </div>
  );
}
