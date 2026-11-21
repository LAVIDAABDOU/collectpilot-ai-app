import type { AgeBucket } from '@/lib/logic';

export const TONES = ['Friendly', 'Professional', 'Firm'] as const;
export type Tone = (typeof TONES)[number];

export interface MessageVars {
  client: string;
  agency: string;
  invoice: string;
  balance: string;
  days: number;
  dueDate: string;
  /** Set by callers so paid/disputed/promise-blocked invoices can never reach the templates. */
  disputeBlockReason?: string | null;
}

export class DisputeBlockError extends Error {}

const TEMPLATES: Record<AgeBucket, Record<Tone, string>> = {
  '1-7': {
    Friendly: `Hi {client},

Hope your week is going well! Quick friendly note from {agency}: invoice {invoice} (due {due_date}) has a balance of {balance}, about {days} day(s) past due.

If payment is already on its way, thank you — please disregard this note. Otherwise, could you take care of it this week?

Thanks so much,
The {agency} Team`,
    Professional: `Hi {client},

This is a courtesy reminder from {agency} regarding invoice {invoice}, which was due on {due_date} and now shows a balance of {balance} ({days} day(s) past due).

If you have already scheduled payment, thank you — no further action is needed. Otherwise, we would appreciate payment at your earliest convenience.

Best regards,
The {agency} Team`,
    Firm: `Hi {client},

Invoice {invoice} from {agency} was due on {due_date} and is now {days} day(s) past due, with an outstanding balance of {balance}.

Please submit payment or reply with the expected payment date by the end of this week. If payment has already been sent, let us know and we will confirm receipt.

Regards,
{agency} Accounts Team`,
  },
  '8-15': {
    Friendly: `Hi {client},

Just checking in — invoice {invoice} from {agency} is now {days} days past due, with a balance of {balance} (due {due_date}).

We know things slip through the cracks. Could you reply with a payment date so we can update our records? We really appreciate it.

Warm regards,
The {agency} Team`,
    Professional: `Hi {client},

Our records show that invoice {invoice} ({balance}) from {agency} remains unpaid, {days} days past its due date of {due_date}.

Please arrange payment within the next 5 business days, or reply to this email with the date we can expect payment. If there is an issue with the invoice, let us know so we can resolve it promptly.

Best regards,
{agency} Accounts Receivable`,
    Firm: `Hi {client},

Invoice {invoice} for {balance} is now {days} days past due (due {due_date}). Despite our earlier reminder, payment has not been received.

Please remit payment immediately or reply with a firm payment date within 3 business days. Continued delay may affect the status of your account with {agency}.

Regards,
{agency} Accounts Team`,
  },
  '16-30': {
    Friendly: `Hi {client},

Following up again on invoice {invoice} from {agency} — the balance of {balance} is now {days} days past due (due {due_date}).

We would love to get this sorted. Is anything blocking payment, or can you schedule it this week? A quick reply helps us keep your account in good standing.

Many thanks,
The {agency} Team`,
    Professional: `Hi {client},

Despite previous reminders, invoice {invoice} for {balance} remains unpaid and is now {days} days past due (due {due_date}).

Payment is required within 5 business days. If payment has been sent, please share the transaction details so we can locate it. If you are experiencing difficulty, contact us to discuss a payment plan.

Sincerely,
{agency} Accounts Receivable`,
    Firm: `Hi {client},

This is a formal notice: invoice {invoice} for {balance} is {days} days past due (due {due_date}) and remains unpaid after multiple reminders.

Payment must be received within 5 business days or your account will be placed on hold and the balance may be referred to collections. Please treat this as a priority.

{agency} Accounts Team`,
  },
  '30+': {
    Friendly: `Hi {client},

Our records show invoice {invoice} for {balance} has been outstanding for {days} days (due {due_date}), and previous reminders may not have reached you.

We would really like to resolve this with you. Please reply today with a payment date, or call us if there is an issue we should know about.

Thank you,
The {agency} Team`,
    Professional: `FINAL PAYMENT REMINDER

Dear {client},

Invoice {invoice} for {balance}, due {due_date}, is now {days} days past due and remains unpaid despite repeated reminders.

Please remit full payment within 3 business days. If we do not receive payment or a response by that date, we will escalate the account in line with our terms of service, which may include suspending services and referring the balance to a collections agency.

If payment has already been sent, please share the confirmation and we will update our records.

Sincerely,
{agency} Accounts Receivable`,
    Firm: `FINAL NOTICE — ACCOUNT PAST DUE

{client},

Despite repeated attempts to contact you, invoice {invoice} for {balance} issued by {agency} remains unpaid, {days} days past its due date of {due_date}.

Demand for payment: remit the full balance within 3 business days. Failure to pay will result in immediate escalation, including suspension of all services and referral to a third-party collections agency without further notice.

Settle this balance today to avoid further action.

{agency} Accounts Team`,
  },
};

export function generateMessage(bucket: AgeBucket, tone: Tone, vars: MessageVars): string {
  if (vars.disputeBlockReason) throw new DisputeBlockError(vars.disputeBlockReason);
  return TEMPLATES[bucket][tone]
    .replace(/\{client\}/g, vars.client)
    .replace(/\{agency\}/g, vars.agency)
    .replace(/\{invoice\}/g, vars.invoice)
    .replace(/\{balance\}/g, vars.balance)
    .replace(/\{days\}/g, String(vars.days))
    .replace(/\{due_date\}/g, vars.dueDate);
}
