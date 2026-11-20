-- Minimal Supabase-like environment so the real migrations can be replayed on a
-- plain PostgreSQL instance (CI only, never run against a real project).
--
-- It recreates: the three API roles, auth.users / auth.uid() / auth.role() /
-- auth.jwt(), and the default privileges Supabase grants on the public schema.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.role', true), '')::text
$$;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth   TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;

-- Same defaults as a Supabase project: API roles get everything on new objects
-- unless a migration explicitly revokes it.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- ── Known schema drift ──────────────────────────────────────────────────────
-- These columns are used by committed SQL functions and by the scolaria-admin
-- Edge Function, but NO committed migration creates them (they were evidently
-- added directly on the live database). Without them the committed migrations
-- cannot be replayed from scratch, so the test environment adds them.
-- Types are inferred from how the code uses them.
CREATE SCHEMA IF NOT EXISTS test_support;

CREATE OR REPLACE FUNCTION test_support.apply_known_schema_drift() RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('schools',         'billing_period',          'text'),
    ('schools',         'subscription_amount',     'integer'),
    ('schools',         'last_paid_at',            'timestamptz'),
    ('schools',         'subscription_started_at', 'timestamptz'),
    ('manual_payments', 'billing_period',          'text'),
    ('manual_payments', 'plan',                    'text'),
    ('manual_payments', 'payment_period_start',    'date'),
    ('manual_payments', 'payment_period_end',      'date')
  ) AS t(tbl, col, typ) LOOP
    IF to_regclass('public.' || r.tbl) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS %I %s', r.tbl, r.col, r.typ);
    END IF;
  END LOOP;
END $$;
