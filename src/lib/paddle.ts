import { initializePaddle, type Paddle } from '@paddle/paddle-js';

export type BillingPeriod = 'monthly' | 'yearly';
export type PaddlePlanName = 'Starter' | 'Growth' | 'Scale';

// ── Paddle configuration ────────────────────────────────────────────────
// Add your Paddle CLIENT-SIDE token here (Paddle Dashboard > Developer Tools
// > Authentication > Client-side tokens), or set VITE_PADDLE_CLIENT_TOKEN in
// a .env file. This token is public by design and safe in frontend code.
// NEVER place a Paddle secret API key here — secret keys must stay on a server.
//
// Set VITE_PADDLE_ENV to "sandbox" while testing, "live" for real payments.
const envToken = import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string | undefined;
const envEnvironment = import.meta.env.VITE_PADDLE_ENV as 'sandbox' | 'live' | undefined;

// Paddle.js names the live environment "production"
export const PADDLE_CLIENT_TOKEN = envToken ?? '';
export const PADDLE_ENVIRONMENT: 'sandbox' | 'live' = envEnvironment ?? 'live';
const PADDLE_JS_ENVIRONMENT: 'sandbox' | 'production' =
  PADDLE_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production';

// The 7-day free trial is configured on these prices in Paddle and is applied
// automatically by the checkout — no trial is added here.
const PRICE_IDS: Record<PaddlePlanName, Record<BillingPeriod, string>> = {
  Starter: {
    monthly: 'pri_01m7rb9vn4sxbfmxwehwxjz8kc',
    yearly: 'pri_01m7re7wzzvq96fp59fe7hancg',
  },
  Growth: {
    monthly: 'pri_01m7rbzdzrzp7xmawvfsj2bwkr',
    yearly: 'pri_01m7regyga6x35rrgjsx1pre96',
  },
  Scale: {
    monthly: 'pri_01m7rd0357zsqcm406jsy0tyr0',
    yearly: 'pri_01m7resyjhq5gt7phgeb67een7',
  },
};

export function getPriceId(plan: PaddlePlanName, billing: BillingPeriod): string {
  return PRICE_IDS[plan][billing];
}

export type CheckoutOutcome =
  | { kind: 'success'; subscriptionId?: string }
  | { kind: 'error'; message?: string }
  | { kind: 'cancel' };

const CHECKOUT_EVENT = 'collectpilot:paddle-checkout';

function emit(outcome: CheckoutOutcome): void {
  window.dispatchEvent(new CustomEvent<CheckoutOutcome>(CHECKOUT_EVENT, { detail: outcome }));
}

export function onCheckoutOutcome(handler: (outcome: CheckoutOutcome) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<CheckoutOutcome>).detail);
  window.addEventListener(CHECKOUT_EVENT, listener);
  return () => window.removeEventListener(CHECKOUT_EVENT, listener);
}

let paddlePromise: Promise<Paddle | undefined> | null = null;

function getPaddle(): Promise<Paddle | undefined> {
  if (!paddlePromise) {
    let completed = false;
    paddlePromise = initializePaddle({
      environment: PADDLE_JS_ENVIRONMENT,
      token: PADDLE_CLIENT_TOKEN,
      eventCallback: (event) => {
        if (event.name === 'checkout.completed') {
          completed = true;
          const data = event.data as { subscription_id?: string } | undefined;
          emit({ kind: 'success', subscriptionId: data?.subscription_id });
        } else if (event.name === 'checkout.error') {
          const data = event.data as { message?: string } | undefined;
          emit({ kind: 'error', message: data?.message });
        } else if (event.name === 'checkout.closed' && !completed) {
          emit({ kind: 'cancel' });
        }
      },
    });
  }
  return paddlePromise;
}

export async function openPlanCheckout(
  plan: PaddlePlanName,
  billing: BillingPeriod = 'monthly',
): Promise<boolean> {
  if (!PADDLE_CLIENT_TOKEN) {
    emit({ kind: 'error', message: 'Checkout is not configured yet — add your Paddle client-side token in src/lib/paddle.ts.' });
    return false;
  }
  try {
    const paddle = await getPaddle();
    if (!paddle) {
      emit({ kind: 'error', message: 'Paddle could not be initialized. Check the client-side token.' });
      return false;
    }
    paddle.Checkout.open({
      settings: { displayMode: 'overlay' },
      items: [{ priceId: getPriceId(plan, billing), quantity: 1 }],
    });
    return true;
  } catch (err) {
    emit({
      kind: 'error',
      message: err instanceof Error ? err.message : 'Checkout could not be opened.',
    });
    return false;
  }
}
