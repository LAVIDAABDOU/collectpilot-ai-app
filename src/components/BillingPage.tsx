import { useEffect, useState } from 'react';
import { Check, CreditCard, ExternalLink, RefreshCw, ShieldCheck, TrendingDown, X } from 'lucide-react';
import { openPlanCheckout, type PaddlePlanName, type BillingPeriod } from '@/lib/paddle';
import { fetchSubscription, upsertSubscription, type Subscription } from '@/lib/db';
import { useAuth } from '@/components/AuthProvider';

interface Props {
  agencyName: string;
}

const PLANS = [
  {
    name: 'Starter' as const,
    monthly: '$29',
    yearly: '$290',
    blurb: 'For solo operators getting their invoices under control.',
    features: ['50 invoices per month', 'AI follow-up emails', 'Payment tracking dashboard'],
  },
  {
    name: 'Growth' as const,
    monthly: '$79',
    yearly: '$790',
    blurb: 'For growing teams with a steady flow of clients.',
    features: ['200 invoices per month', 'AI follow-up emails', 'Payment tracking dashboard', 'CSV import & export'],
    popular: true,
  },
  {
    name: 'Scale' as const,
    monthly: '$199',
    yearly: '$1,990',
    blurb: 'For established agencies managing many clients.',
    features: ['Unlimited invoices', 'AI follow-up emails', 'Payment tracking dashboard', 'CSV import & export', 'Follow-up automation rules'],
  },
  {
    name: 'Enterprise' as const,
    monthly: 'Custom',
    yearly: 'Custom',
    blurb: 'For larger organizations with custom needs.',
    features: ['Everything in Scale', 'Custom integrations', 'Dedicated account manager', 'Priority support'],
  },
];

const PLAN_RANK: Record<string, number> = { Starter: 0, Growth: 1, Scale: 2, Enterprise: 3 };

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  trialing: 'bg-blue-50 text-blue-700 ring-blue-200',
  past_due: 'bg-amber-50 text-amber-700 ring-amber-200',
  canceled: 'bg-slate-100 text-slate-600 ring-slate-200',
  incomplete: 'bg-slate-100 text-slate-500 ring-slate-200',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  trialing: 'Free Trial',
  past_due: 'Past Due',
  canceled: 'Canceled',
  incomplete: 'No Subscription',
};

export default function BillingPage({ agencyName }: Props) {
  const { user } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const sub = await fetchSubscription();
        setSubscription(sub);
        if (sub) setBillingPeriod(sub.billingPeriod);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load subscription.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const refreshSub = async () => {
    try {
      const sub = await fetchSubscription();
      setSubscription(sub);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription.');
    }
  };

  const handleCancel = async () => {
    if (!subscription) return;
    try {
      await upsertSubscription({
        ...subscription,
        status: 'canceled',
        canceledAt: new Date().toISOString(),
      });
      setConfirmCancel(false);
      await refreshSub();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription.');
    }
  };

  const periodLabel = billingPeriod === 'monthly' ? '/month' : '/year';
  const currentPlanName = subscription?.plan ?? null;
  const currentStatus = subscription?.status ?? 'incomplete';

  const isUpgrade = (target: string) => currentPlanName ? PLAN_RANK[target] > PLAN_RANK[currentPlanName] : true;
  const isDowngrade = (target: string) => currentPlanName ? PLAN_RANK[target] < PLAN_RANK[currentPlanName] : false;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Billing &amp; Subscription</h1>
          <p className="mt-1 text-sm text-slate-500">
            Plans for {agencyName || 'your agency'}.
          </p>
        </div>
        <button
          onClick={() => void refreshSub()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Current plan card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-slate-900">Current plan</h3>
        {loading ? (
          <p className="mt-3 text-sm text-slate-400">Loading subscription details…</p>
        ) : subscription && currentStatus !== 'incomplete' ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Plan</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{subscription.plan}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Billing</p>
                <p className="mt-1 text-lg font-semibold capitalize text-slate-900">{subscription.billingPeriod}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Status</p>
                <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-sm font-medium ring-1 ring-inset ${STATUS_STYLES[currentStatus] ?? STATUS_STYLES.incomplete}`}>
                  {STATUS_LABELS[currentStatus] ?? currentStatus}
                </span>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Next renewal</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {subscription.currentPeriodEnd
                    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                    : '—'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
              {currentStatus !== 'canceled' && (
                <button
                  onClick={() => setConfirmCancel(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                  Cancel subscription
                </button>
              )}
              {currentStatus === 'canceled' && (
                <p className="text-sm text-slate-500">
                  Subscription canceled{subscription.canceledAt ? ` on ${new Date(subscription.canceledAt).toLocaleDateString()}` : ''}. Choose a plan below to resubscribe.
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            You do not have an active subscription. Choose a plan below to start your 7-day free trial.
          </p>
        )}
      </div>

      {/* Billing toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          {(['monthly', 'yearly'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setBillingPeriod(period)}
              className={`min-h-[44px] rounded-md px-5 py-2 text-sm font-medium capitalize transition-colors ${
                billingPeriod === period
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {period}
              {period === 'yearly' && <span className="ml-1.5 text-xs opacity-80">save ~17%</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Plan grid */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.name === currentPlanName;
          const isEnterprise = plan.monthly === 'Custom';
          const upgrade = isUpgrade(plan.name);
          const downgrade = isDowngrade(plan.name);
          return (
            <div
              key={plan.name}
              className={`flex flex-col rounded-xl border bg-white p-6 shadow-sm ${
                plan.popular ? 'border-blue-300 ring-2 ring-blue-200' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{plan.name}</h3>
                </div>
                {plan.popular && (
                  <span className="rounded-full bg-blue-900 px-2 py-0.5 text-[10px] font-semibold text-white">POPULAR</span>
                )}
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

              {isCurrent ? (
                <div className="mt-6 w-full rounded-lg bg-slate-100 px-4 py-2.5 text-center text-sm font-medium text-slate-500">
                  Current plan
                </div>
              ) : isEnterprise ? (
                <button
                  onClick={undefined}
                  disabled
                  className="mt-6 w-full cursor-not-allowed rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-500"
                  title="Contact your account manager"
                >
                  Contact Sales
                </button>
              ) : (
                <button
                  onClick={() => void openPlanCheckout(plan.name as PaddlePlanName, billingPeriod)}
                  className={`mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm transition-colors ${
                    upgrade
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : downgrade
                        ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                  title={upgrade ? 'Upgrade your plan' : downgrade ? 'Downgrade your plan' : 'Opens secure Paddle checkout'}
                >
                  {upgrade ? 'Upgrade' : downgrade ? 'Downgrade' : 'Subscribe'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Payment history (placeholder — populated when Paddle webhook records transactions) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-slate-900">Payment history</h3>
        <p className="mt-1 text-sm text-slate-500">
          Subscription invoices and payment records will appear here once Paddle webhooks are configured.
        </p>
        <div className="mt-4 rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
          No payment history yet.
        </div>
      </div>

      {/* Manage billing / Paddle customer portal */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-slate-900">Manage billing</h3>
        <p className="mt-1 text-sm text-slate-500">
          Update your payment method, billing address, or download invoices through the Paddle customer portal.
        </p>
        <button
          disabled
          className="mt-4 inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-400"
          title="Available after Paddle webhook is configured"
        >
          <ExternalLink className="h-4 w-4" />
          Open customer portal
        </button>
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          CollectPilot never collects or stores card numbers. All payment processing is handled securely by Paddle.
        </div>
      </div>

      {/* Cancel confirmation */}
      {confirmCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setConfirmCancel(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <h3 className="font-semibold text-slate-900">Cancel subscription?</h3>
            </div>
            <p className="text-sm text-slate-600">
              Your subscription will be canceled at the end of the current billing period. You will keep access until then.
              This action cannot be undone — you will need to resubscribe to regain access.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmCancel(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Keep subscription
              </button>
              <button
                onClick={() => void handleCancel()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700"
              >
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
