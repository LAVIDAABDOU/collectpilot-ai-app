import type { Invoice } from '@/types';
import { todayISO } from '@/lib/logic';

function shiftDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

type Row = [string, string, number, number, number, string, string];
// [client, invoice #, issued days ago, due days from today, amount, status, email]
const ROWS: Row[] = [
  ['Northwind Retail Group', 'INV-1041', 75, 45, 8400, 'Open', 'ap@northwindretail.com'],
  ['Northwind Retail Group', 'INV-1088', 40, 12, 5250, 'Open', 'ap@northwindretail.com'],
  ['Halcyon Dental Partners', 'INV-1102', 32, 4, 3200, 'Open', 'billing@halcyondental.com'],
  ['Blue Harbor Fitness', 'INV-1110', 24, -2, 4750, 'Open', 'accounts@blueharborfit.com'],
  ['Summit Legal Advisors', 'INV-1118', 20, -6, 12800, 'Open', 'payables@summitlegal.com'],
  ['Crave Street Coffee Co.', 'INV-1121', 15, -10, 1850, 'Open', 'hello@cravestreetcoffee.com'],
  ['Vantage Realty Partners', 'INV-1129', 12, -14, 9600, 'Open', 'ar@vantagerealty.com'],
  ['Petal & Stem Florists', 'INV-1133', 9, -18, 2250, 'Open', 'owner@petalandstem.com'],
  ['Ironwood Construction', 'INV-1140', 7, -21, 15400, 'Partial', 'ap@ironwoodbuilds.com'],
  ['Lumen Skincare', 'INV-1147', 4, -26, 3600, 'Open', 'finance@lumenskincare.com'],
  ['Cedar Grove Veterinary', 'INV-1152', 2, -30, 2900, 'Open', 'office@cedargrovevet.com'],
  ['Harbor Line Media Group', 'INV-1158', 55, 25, 6700, 'Disputed', 'admin@harborlinemedia.com'],
  ['Trailhead Outfitters', 'INV-1163', 30, 0, 4100, 'Open', 'billing@trailheadoutdoors.com'],
  ['Gilded Spoon Restaurants', 'INV-1169', 10, -5, 5400, 'Partial', 'ap@gildedspoon.com'],
  ['Meadowbrook Clinics', 'INV-1174', 5, -34, 7200, 'Open', 'ar@meadowbrookclinics.com'],
  ['Atlas Freight Systems', 'INV-1180', 3, 12, 11300, 'Open', 'accountspayable@atlasfreight.com'],
  ['Juno Boutique Hotels', 'INV-1185', 6, 8, 8900, 'Open', 'finance@junohotels.com'],
  ['Ironwood Construction', 'INV-1150', 60, 30, 4900, 'Open', 'ap@ironwoodbuilds.com'],
  ['Wildflower Yoga Studio', 'INV-1191', 1, 15, 1200, 'Open', 'hello@wildfloweryoga.com'],
  ['Vertex Analytics', 'INV-1196', 2, 20, 6600, 'Open', 'ap@vertexanalytics.io'],
];

export function sampleInvoices(): Invoice[] {
  const today = todayISO();
  return ROWS.map(([clientName, invoiceNumber, issuedAgo, dueOffset, amount, status, email], idx) => {
    const paidAmount = status === 'Partial' ? Math.round(amount * 0.4 * 100) / 100 : 0;
    return {
      id: `sample-${idx}-${today}`,
      clientName,
      invoiceNumber,
      invoiceDate: shiftDays(-issuedAgo),
      dueDate: shiftDays(-dueOffset),
      amount,
      paidAmount,
      status,
      email,
      remindersSent: 0,
      lastSentAt: null,
      pauseUntil: null,
      promiseNote: null,
      disputed: false,
      disputeNote: null,
    };
  });
}

type SeedRow = [string, string, number, number, number, string, string];
// [client, invoice #, issued days ago, due days ago (overdue), amount, status, email]
const SEED_OVERDUE: SeedRow[] = [
  ['Northwind Retail Group', 'INV-1041', 75, 45, 8500, 'Open', 'ap@northwindretail.com'],
  ['Ironwood Construction', 'INV-1042', 60, 30, 12200, 'Open', 'ap@ironwoodbuilds.com'],
  ['BluePeak Marketing', 'INV-1043', 90, 60, 4750, 'Open', 'ap@bluepeakmarketing.com'],
  ['Harbor Logistics', 'INV-1044', 52, 22, 9800, 'Open', 'ap@harborlogistics.com'],
  ['Summit Dental', 'INV-1045', 45, 15, 3200, 'Open', 'billing@summitdental.com'],
  ['Cascade Builders', 'INV-1046', 80, 50, 7400, 'Open', 'ap@cascadebuilders.com'],
  ['Everline Media', 'INV-1047', 65, 35, 2900, 'Open', 'ar@everlinemedia.com'],
  ['Pinecrest Foods', 'INV-1048', 58, 28, 5100, 'Open', 'ap@pinecrestfoods.com'],
  ['Alder Legal Group', 'INV-1049', 70, 40, 2600, 'Open', 'ap@adderlegalgroup.com'],
];

type ExtraRow = [string, string, number, number, number, string, string, boolean];
// [client, invoice #, issued days ago, due in N days (negative = past), amount, status, email, fullyPaid]
const SEED_EXTRA: ExtraRow[] = [
  ['Trailhead Outfitters', 'INV-1050', 40, -10, 3850, 'Paid', 'billing@trailheadoutdoors.com', true],
  ['Vertex Analytics', 'INV-1051', 50, -20, 6600, 'Paid', 'ap@vertexanalytics.io', true],
  ['Juno Boutique Hotels', 'INV-1052', 45, -15, 8900, 'Paid', 'finance@junohotels.com', true],
  ['Atlas Freight Systems', 'INV-1053', 55, -25, 11300, 'Paid', 'accountspayable@atlasfreight.com', true],
  ['Crave Street Coffee Co.', 'INV-1054', 35, -5, 1850, 'Paid', 'hello@cravestreetcoffee.com', true],
  ['Wildflower Yoga Studio', 'INV-1055', 32, -2, 1200, 'Paid', 'hello@wildfloweryoga.com', true],
  ['Halcyon Dental Partners', 'INV-1056', 20, 10, 3200, 'Open', 'billing@halcyondental.com', false],
  ['Northwind Retail Group', 'INV-1058', 15, 15, 2400, 'Open', 'ap@northwindretail.com', false],
  ['Ironwood Construction', 'INV-1059', 22, 8, 3300, 'Open', 'ap@ironwoodbuilds.com', false],
  ['Lumen Skincare', 'INV-1060', 25, 20, 2750, 'Open', 'finance@lumenskincare.com', false],
  ['Summit Dental', 'INV-1061', 10, 5, 1900, 'Open', 'billing@summitdental.com', false],
];

/**
 * Hardcoded demo dataset shipped in the source: 20 invoices total,
 * 9 of them overdue with $56,450.00 outstanding. Used immediately as
 * the initial state whenever there is no saved data in the browser.
 */
export function seedInvoices(): Invoice[] {
  const overdue = SEED_OVERDUE.map(([clientName, invoiceNumber, issuedAgo, dueDaysAgo, amount, status, email], idx): Invoice => ({
    id: `seed-${idx + 1}`,
    clientName,
    invoiceNumber,
    invoiceDate: shiftDays(-issuedAgo),
    dueDate: shiftDays(-dueDaysAgo),
    amount,
    paidAmount: 0,
    status,
    email,
    remindersSent: 0,
    lastSentAt: null,
    pauseUntil: null,
    promiseNote: null,
    disputed: false,
    disputeNote: null,
  }));

  const extras = SEED_EXTRA.map(([clientName, invoiceNumber, issuedAgo, dueIn, amount, status, email, paid], idx): Invoice => ({
    id: `seed-x${idx + 1}`,
    clientName,
    invoiceNumber,
    invoiceDate: shiftDays(-issuedAgo),
    dueDate: shiftDays(dueIn),
    amount,
    paidAmount: paid ? amount : 0,
    status,
    email,
    remindersSent: 0,
    lastSentAt: null,
    pauseUntil: null,
    promiseNote: null,
    disputed: false,
    disputeNote: null,
  }));

  return [...overdue, ...extras];
}

export const SAMPLE_CSV = (() => {
  const header = 'Client Name,Invoice Number,Invoice Date,Due Date,Amount,Paid Amount,Status,Email';
  const lines = ROWS.map(([client, num, issuedAgo, dueOffset, amount, status, email]) => {
    const paid = status === 'Partial' ? Math.round(amount * 0.4 * 100) / 100 : 0;
    return [client, num, shiftDays(-issuedAgo), shiftDays(-dueOffset), amount.toFixed(2), paid.toFixed(2), status, email].join(',');
  });
  return [header, ...lines].join('\n');
})();
