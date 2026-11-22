# Project memory

## Product intent & audience

- CollectPilot: B2B SaaS with subscription billing via Paddle and auth/database via Supabase.
- Four plan tiers: Starter, Growth, Scale, Enterprise (custom pricing).
- Core user flows: landing/pricing → signup/login/forgot-password → protected dashboard → billing management.

## Brand personality & voice

- Professional, trust-oriented SaaS tone.
- Emphasizes security ("never stores card numbers") and transparency in billing.

## Visual design & UX direction

- Pricing UI: Monthly/Yearly toggle with "~17% save" hint on yearly; "MOST POPULAR" badge on Growth plan.
- Touch-target minimum 44px on toggles for mobile usability.
- Plan cards use dynamic button labels: Subscribe / Upgrade / Downgrade / Current plan (based on active subscription state).
- Destructive actions (cancel subscription) require confirmation modal (DeleteModal component).
- Not-yet-implemented features shown as disabled with explanatory notes rather than hidden.
- Dollar amounts formatted with commas for thousands (e.g. $1,990).

## Decisions, constraints & rationale

- Supabase `subscriptions` table stores plan, billingPeriod, status, canceledAt, and renewal date.
- `upsertSubscription` accepts `Partial<Subscription>`; cancel flow spreads existing subscription and overrides `status` + `canceledAt`.
- Paddle webhooks not yet configured — payment history and customer portal are placeholder/disabled until live.
- TypeScript strict; build must pass with zero errors.
- Project is in a multi-step continuation (Version 2): Step 1 (BillingPage) complete; Steps 2–4 pending user confirmation.

## Open questions & assumptions

- Paddle webhook integration timing and schema for payment history not yet defined.
- Auth end-to-end verification (signup → login → forgot password → protected dashboard) still pending (Step 2).
- Landing page pricing correctness check pending (Step 3): Starter $29/$290, Growth $79/$790, Scale $199/$1990, Enterprise Custom.
- Final review and remaining-items list pending (Step 4).