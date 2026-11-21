import type { Invoice } from '@/types';

/**
 * Isolated V10 test fixtures. NEVER inserted into the user's invoice list —
 * used only by automated tests and an optional in-app self-check.
 * Dates are computed relative to a controllable "today" so tests stay deterministic.
 */

export interface FixtureContext {
  today: string; // yyyy-mm-dd
}

export function testFixtures(ctx: FixtureContext): Invoice[] {
  const shift = (days: number): string => {
    const [y, m, d] = ctx.today.split('-').map(Number);
    const dt = new Date(y, m - 1, d + days);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };
  const base = (id: string, invoiceNumber: string, over: Partial<Invoice>): Invoice => ({
    id,
    clientName: 'V10 Fixture Client',
    invoiceNumber,
    invoiceDate: shift(-30),
    dueDate: shift(-2),
    amount: 0,
    paidAmount: 0,
    status: 'Open',
    email: 'fixture@example.com',
    remindersSent: 0,
    lastSentAt: null,
    pauseUntil: null,
    promiseNote: null,
    disputed: false,
    disputeNote: null,
    ...over,
  });
  return [
    base('v10-test-001', 'TEST-001', { amount: 500, status: 'Disputed', disputed: true, disputeNote: 'Fixture dispute' }),
    base('v10-test-002', 'TEST-002', { amount: 0, paidAmount: 0, status: 'Paid' }),
    base('v10-test-003', 'TEST-003', { amount: 750, dueDate: shift(-2) }),
    base('v10-test-004', 'TEST-004', { amount: 1200, dueDate: '2026-11-28', status: 'Open' }),
    base('v10-test-005', 'TEST-005', { amount: 900, dueDate: '2026-11-18' }),
  ];
}
