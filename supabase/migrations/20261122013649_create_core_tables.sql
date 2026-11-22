/*
# Create core tables for CollectPilot AI

## Overview
Sets up the multi-tenant database schema for CollectPilot AI with full
Row Level Security so each authenticated agency only sees and modifies
their own invoices, activity log, settings, and subscription records.

## New Tables

1. `invoices` — stores invoice records for each agency
   - id (uuid PK)
   - user_id (uuid FK → auth.users, defaults to auth.uid())
   - client_name (text)
   - invoice_number (text)
   - invoice_date (date)
   - due_date (date)
   - amount (numeric)
   - paid_amount (numeric)
   - status (text — raw status label)
   - email (text — client contact email)
   - reminders_sent (int)
   - last_sent_at (timestamptz, nullable)
   - pause_until (date, nullable — promise date)
   - promise_note (text, nullable)
   - disputed (boolean)
   - dispute_note (text, nullable)
   - created_at (timestamptz)

2. `log_entries` — activity log per agency
   - id (uuid PK)
   - user_id (uuid FK → auth.users, defaults to auth.uid())
   - type (text — sent/promise/dispute/cleared/draft/blocked)
   - invoice_id (uuid, nullable FK → invoices)
   - invoice_number (text)
   - client_name (text)
   - note (text)
   - created_at (timestamptz)

3. `agency_settings` — per-agency settings (one row per user)
   - id (uuid PK)
   - user_id (uuid FK → auth.users, defaults to auth.uid(), unique)
   - currency (text)
   - timezone (text)
   - agency_name (text)
   - admin_email (text)
   - support_email (text)
   - sender_email (text)
   - updated_at (timestamptz)

4. `subscriptions` — subscription/billing state per agency
   - id (uuid PK)
   - user_id (uuid FK → auth.users, defaults to auth.uid(), unique)
   - plan (text — Starter/Growth/Scale/Enterprise)
   - billing_period (text — monthly/yearly)
   - status (text — active/canceled/past_due/trialing/incomplete)
   - paddle_subscription_id (text, nullable)
   - current_period_start (timestamptz, nullable)
   - current_period_end (timestamptz, nullable)
   - canceled_at (timestamptz, nullable)
   - created_at (timestamptz)
   - updated_at (timestamptz)

## Security
- RLS enabled on all four tables.
- Grants limited to `authenticated` (and `service_role` for webhook edge functions).
- 4 ownership-scoped policies per table (SELECT/INSERT/UPDATE/DELETE).
- All owner columns default to auth.uid() so client inserts that omit
  user_id still satisfy the WITH CHECK predicate.
*/

-- invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  invoice_number text NOT NULL,
  invoice_date date NOT NULL,
  due_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Open',
  email text NOT NULL DEFAULT '',
  reminders_sent integer NOT NULL DEFAULT 0,
  last_sent_at timestamptz,
  pause_until date,
  promise_note text,
  disputed boolean NOT NULL DEFAULT false,
  dispute_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON invoices TO service_role;

DROP POLICY IF EXISTS "select_own_invoices" ON invoices;
CREATE POLICY "select_own_invoices" ON invoices FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_invoices" ON invoices;
CREATE POLICY "insert_own_invoices" ON invoices FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_invoices" ON invoices;
CREATE POLICY "update_own_invoices" ON invoices FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_invoices" ON invoices;
CREATE POLICY "delete_own_invoices" ON invoices FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- log_entries
CREATE TABLE IF NOT EXISTS log_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  invoice_number text NOT NULL DEFAULT '',
  client_name text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE log_entries ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON log_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON log_entries TO service_role;

DROP POLICY IF EXISTS "select_own_log" ON log_entries;
CREATE POLICY "select_own_log" ON log_entries FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_log" ON log_entries;
CREATE POLICY "insert_own_log" ON log_entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_log" ON log_entries;
CREATE POLICY "update_own_log" ON log_entries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_log" ON log_entries;
CREATE POLICY "delete_own_log" ON log_entries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- agency_settings
CREATE TABLE IF NOT EXISTS agency_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  currency text NOT NULL DEFAULT 'USD',
  timezone text NOT NULL DEFAULT 'America/New_York',
  agency_name text NOT NULL DEFAULT '',
  admin_email text NOT NULL DEFAULT '',
  support_email text NOT NULL DEFAULT '',
  sender_email text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE agency_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON agency_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON agency_settings TO service_role;

DROP POLICY IF EXISTS "select_own_settings" ON agency_settings;
CREATE POLICY "select_own_settings" ON agency_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_settings" ON agency_settings;
CREATE POLICY "insert_own_settings" ON agency_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_settings" ON agency_settings;
CREATE POLICY "update_own_settings" ON agency_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_settings" ON agency_settings;
CREATE POLICY "delete_own_settings" ON agency_settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'Starter',
  billing_period text NOT NULL DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'incomplete',
  paddle_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON subscriptions TO service_role;

DROP POLICY IF EXISTS "select_own_sub" ON subscriptions;
CREATE POLICY "select_own_sub" ON subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_sub" ON subscriptions;
CREATE POLICY "insert_own_sub" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_sub" ON subscriptions;
CREATE POLICY "update_own_sub" ON subscriptions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_sub" ON subscriptions;
CREATE POLICY "delete_own_sub" ON subscriptions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_log_entries_user_id ON log_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_log_entries_created_at ON log_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agency_settings_user_id ON agency_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
