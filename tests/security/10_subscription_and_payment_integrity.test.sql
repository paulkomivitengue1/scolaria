-- Security tests: subscription and payment integrity.
--
-- Each scenario runs a statement exactly as a client would (SET ROLE
-- authenticated/anon + JWT claims), then inspects the result as superuser.
-- ATTACK scenarios must leave the data untouched; REGRESSION scenarios must
-- keep working (legitimate flows must not be broken by the fixes).

\pset tuples_only on
\pset format unaligned

DROP SCHEMA IF EXISTS test_support_results CASCADE;
CREATE SCHEMA test_support_results;
CREATE TABLE test_support_results.results (
  name   text PRIMARY KEY,
  ok     boolean NOT NULL,
  detail text NOT NULL DEFAULT ''
);

CREATE OR REPLACE FUNCTION test_support.record(p_name text, p_ok boolean, p_detail text DEFAULT '')
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO test_support_results.results(name, ok, detail) VALUES (p_name, p_ok, coalesce(p_detail, ''));
  RAISE NOTICE '[%] %', CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END, p_name;
END $$;

-- Runs p_sql as the given API role with the given JWT subject.
-- Returns NULL when the statement succeeded, otherwise the error message.
CREATE OR REPLACE FUNCTION test_support.run_as(p_uid uuid, p_role text, p_sql text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_err text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub',  coalesce(p_uid::text, ''), true);
  PERFORM set_config('request.jwt.claim.role', p_role, true);
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', p_uid, 'role', p_role)::text, true);
  EXECUTE format('SET LOCAL ROLE %I', p_role);
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub',  '', true);
  PERFORM set_config('request.jwt.claim.role', '', true);
  PERFORM set_config('request.jwt.claims',     '', true);
  RETURN v_err;
END $$;

-- Same, but returns the first column of the first row of a SELECT as text.
CREATE OR REPLACE FUNCTION test_support.run_as_scalar(p_uid uuid, p_role text, p_sql text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub',  coalesce(p_uid::text, ''), true);
  PERFORM set_config('request.jwt.claim.role', p_role, true);
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub', p_uid, 'role', p_role)::text, true);
  EXECUTE format('SET LOCAL ROLE %I', p_role);
  BEGIN
    EXECUTE p_sql INTO v;
  EXCEPTION WHEN OTHERS THEN
    v := 'ERROR: ' || SQLERRM;
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claim.sub',  '', true);
  PERFORM set_config('request.jwt.claim.role', '', true);
  PERFORM set_config('request.jwt.claims',     '', true);
  RETURN v;
END $$;

-- Snapshot of every column a school must never be able to change by itself.
CREATE OR REPLACE FUNCTION test_support.school_state(p_id uuid) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v jsonb;
BEGIN
  SELECT jsonb_build_object(
    'status',                  s.subscription_status,
    'plan',                    s.plan,
    'trial_ends_at',           s.trial_ends_at,
    'billing_period',          s.billing_period,
    'subscription_amount',     s.subscription_amount,
    'last_paid_at',            s.last_paid_at,
    'subscription_started_at', s.subscription_started_at,
    'suspended_from_status',   s.suspended_from_status,
    'referred_by_code',        s.referred_by_code
  ) INTO v FROM public.schools s WHERE s.id = p_id;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION test_support.reset_school(p_id uuid, p_status text DEFAULT 'expired')
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.schools SET
    subscription_status     = p_status,
    plan                    = 'Essentiel',
    trial_ends_at           = now() - interval '1 day',
    billing_period          = DEFAULT,
    subscription_amount     = DEFAULT,
    last_paid_at            = DEFAULT,
    subscription_started_at = DEFAULT,
    suspended_from_status   = CASE WHEN p_status = 'suspended' THEN 'active' ELSE NULL END,
    referred_by_code        = NULL,
    name                    = 'Ecole A',
    director_name           = '',
    city                    = '',
    phone                   = ''
  WHERE id = p_id;
  DELETE FROM public.affiliate_commissions WHERE school_id = p_id;
END $$;

CREATE OR REPLACE FUNCTION test_support.reset_payments() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.manual_payments
   WHERE school_id IN ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002');
  INSERT INTO public.manual_payments (id, school_id, school_name, provider, sender, amount, status) VALUES
    ('d1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Ecole A', 'Orange Money', 'S1', 10000, 'en_attente'),
    ('d1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Ecole A', 'Wave',         'S2', 10000, 'rejete'),
    ('d1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000002', 'Ecole B', 'Moov Money',   'S3', 10000, 'en_attente'),
    ('d1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'Ecole A', 'Orange Money', 'S4', 20000, 'valide');
END $$;

-- ATTACK scenario on schools: the protected columns must be unchanged afterwards.
CREATE OR REPLACE FUNCTION test_support.expect_school_unchanged(p_name text, p_status text, p_role text, p_stmt text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_before jsonb;
  v_after  jsonb;
  v_err    text;
  v_uid    uuid := CASE WHEN p_role = 'anon' THEN NULL ELSE 'a0000000-0000-0000-0000-0000000000a1'::uuid END;
BEGIN
  PERFORM test_support.reset_school('a1000000-0000-0000-0000-000000000001', p_status);
  v_before := test_support.school_state('a1000000-0000-0000-0000-000000000001');
  v_err    := test_support.run_as(v_uid, p_role, p_stmt);
  v_after  := test_support.school_state('a1000000-0000-0000-0000-000000000001');
  PERFORM test_support.record(p_name, v_before = v_after,
    format('error=%s | before=%s | after=%s', coalesce(v_err, 'none'), v_before, v_after));
END $$;

-- Generic scenario: optional setup, statement as a role, then a boolean check as superuser.
CREATE OR REPLACE FUNCTION test_support.scenario(
  p_name text, p_setup text, p_uid uuid, p_role text, p_stmt text, p_check text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_err text;
  v_ok  boolean;
BEGIN
  IF p_setup IS NOT NULL THEN
    EXECUTE p_setup;
  END IF;
  v_err := test_support.run_as(p_uid, p_role, p_stmt);
  EXECUTE p_check INTO v_ok;
  PERFORM test_support.record(p_name, coalesce(v_ok, false), 'error=' || coalesce(v_err, 'none'));
END $$;

-- ── Fixtures ────────────────────────────────────────────────────────────────
INSERT INTO auth.users (id, email) VALUES
  ('a0000000-0000-0000-0000-0000000000a1', 'a@test.local'),
  ('b0000000-0000-0000-0000-0000000000b1', 'b@test.local'),
  ('c0000000-0000-0000-0000-0000000000c1', 'c@test.local');

INSERT INTO public.schools (id, name) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Ecole A'),
  ('b1000000-0000-0000-0000-000000000002', 'Ecole B');

INSERT INTO public.users (auth_uid, school_id, email, role) VALUES
  ('a0000000-0000-0000-0000-0000000000a1', 'a1000000-0000-0000-0000-000000000001', 'a@test.local', 'admin_ecole'),
  ('b0000000-0000-0000-0000-0000000000b1', 'b1000000-0000-0000-0000-000000000002', 'b@test.local', 'admin_ecole');

INSERT INTO public.affiliates (full_name, phone, email, referral_code)
VALUES ('Partenaire Test', '', '', 'GTTEST001');

-- ════════════════════════════════════════════════════════════════════════════
-- 1. SUBSCRIPTIONS — a school must not be able to change its own plan/status
-- ════════════════════════════════════════════════════════════════════════════
SELECT test_support.expect_school_unchanged('ATTACK subscription: school cannot self-activate (subscription_status=active)', 'expired', 'authenticated',
  $sql$UPDATE public.schools SET subscription_status = 'active' WHERE id = 'a1000000-0000-0000-0000-000000000001'$sql$);

SELECT test_support.expect_school_unchanged('ATTACK subscription: school cannot self-upgrade plan to Élite', 'expired', 'authenticated',
  $sql$UPDATE public.schools SET plan = 'Élite' WHERE id = 'a1000000-0000-0000-0000-000000000001'$sql$);

SELECT test_support.expect_school_unchanged('ATTACK subscription: school cannot extend trial_ends_at by 10 years', 'expired', 'authenticated',
  $sql$UPDATE public.schools SET trial_ends_at = now() + interval '3650 days' WHERE id = 'a1000000-0000-0000-0000-000000000001'$sql$);

SELECT test_support.expect_school_unchanged('ATTACK subscription: school cannot change billing_period', 'expired', 'authenticated',
  $sql$UPDATE public.schools SET billing_period = 'annuel' WHERE id = 'a1000000-0000-0000-0000-000000000001'$sql$);

SELECT test_support.expect_school_unchanged('ATTACK subscription: school cannot change subscription_amount', 'expired', 'authenticated',
  $sql$UPDATE public.schools SET subscription_amount = 99999999 WHERE id = 'a1000000-0000-0000-0000-000000000001'$sql$);

SELECT test_support.expect_school_unchanged('ATTACK subscription: school cannot forge last_paid_at', 'expired', 'authenticated',
  $sql$UPDATE public.schools SET last_paid_at = now() WHERE id = 'a1000000-0000-0000-0000-000000000001'$sql$);

SELECT test_support.expect_school_unchanged('ATTACK subscription: school cannot forge subscription_started_at', 'expired', 'authenticated',
  $sql$UPDATE public.schools SET subscription_started_at = now() WHERE id = 'a1000000-0000-0000-0000-000000000001'$sql$);

SELECT test_support.expect_school_unchanged('ATTACK subscription: school cannot edit suspended_from_status', 'expired', 'authenticated',
  $sql$UPDATE public.schools SET suspended_from_status = 'active' WHERE id = 'a1000000-0000-0000-0000-000000000001'$sql$);

SELECT test_support.expect_school_unchanged('ATTACK subscription: combined forgery in one UPDATE (active + Élite + annuel + paid)', 'expired', 'authenticated',
  $sql$UPDATE public.schools SET subscription_status = 'active', plan = 'Élite', billing_period = 'annuel',
        subscription_amount = 300000, last_paid_at = now(), subscription_started_at = now(),
        trial_ends_at = now() + interval '365 days'
      WHERE id = 'a1000000-0000-0000-0000-000000000001'$sql$);

SELECT test_support.expect_school_unchanged('ATTACK subscription: suspended school cannot lift its own suspension (to active)', 'suspended', 'authenticated',
  $sql$UPDATE public.schools SET subscription_status = 'active' WHERE id = 'a1000000-0000-0000-0000-000000000001'$sql$);

SELECT test_support.expect_school_unchanged('ATTACK subscription: suspended school cannot lift its own suspension (to trial)', 'suspended', 'authenticated',
  $sql$UPDATE public.schools SET subscription_status = 'trial', trial_ends_at = now() + interval '365 days' WHERE id = 'a1000000-0000-0000-0000-000000000001'$sql$);

SELECT test_support.expect_school_unchanged('ATTACK subscription: anonymous role cannot modify a school', 'expired', 'anon',
  $sql$UPDATE public.schools SET subscription_status = 'active' WHERE id = 'a1000000-0000-0000-0000-000000000001'$sql$);

SELECT test_support.scenario(
  'ATTACK subscription: self-activation with a referral code must not create an affiliate commission',
  $sql$SELECT test_support.reset_school('a1000000-0000-0000-0000-000000000001', 'expired')$sql$,
  'a0000000-0000-0000-0000-0000000000a1', 'authenticated',
  $sql$UPDATE public.schools SET referred_by_code = 'GTTEST001', plan = 'Élite', subscription_status = 'active'
        WHERE id = 'a1000000-0000-0000-0000-000000000001'$sql$,
  $sql$SELECT (SELECT count(*) FROM public.affiliate_commissions WHERE school_id = 'a1000000-0000-0000-0000-000000000001') = 0$sql$);

SELECT test_support.scenario(
  'ATTACK tenancy: a school cannot rename another school',
  NULL,
  'a0000000-0000-0000-0000-0000000000a1', 'authenticated',
  $sql$UPDATE public.schools SET name = 'HACKED' WHERE id = 'b1000000-0000-0000-0000-000000000002'$sql$,
  $sql$SELECT name = 'Ecole B' FROM public.schools WHERE id = 'b1000000-0000-0000-0000-000000000002'$sql$);

SELECT test_support.scenario(
  'ATTACK subscription: a client cannot create a school that is already active',
  NULL,
  'a0000000-0000-0000-0000-0000000000a1', 'authenticated',
  $sql$INSERT INTO public.schools (name, subscription_status, plan) VALUES ('FAKE ACTIVE SCHOOL', 'active', 'Élite')$sql$,
  $sql$SELECT NOT EXISTS (SELECT 1 FROM public.schools WHERE name = 'FAKE ACTIVE SCHOOL')$sql$);

SELECT test_support.scenario(
  'ATTACK tenancy: a school cannot delete itself or another school',
  NULL,
  'a0000000-0000-0000-0000-0000000000a1', 'authenticated',
  $sql$DELETE FROM public.schools WHERE id IN ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002')$sql$,
  $sql$SELECT (SELECT count(*) FROM public.schools WHERE id IN ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002')) = 2$sql$);

-- ════════════════════════════════════════════════════════════════════════════
-- 2. PAYMENTS — a school must not be able to forge or rewrite payment records
-- ════════════════════════════════════════════════════════════════════════════
SELECT test_support.scenario(
  'ATTACK payment: school cannot insert a payment already marked valide',
  $sql$SELECT test_support.reset_payments()$sql$,
  'a0000000-0000-0000-0000-0000000000a1', 'authenticated',
  $sql$INSERT INTO public.manual_payments (school_id, school_name, provider, sender, amount, status)
        VALUES ('a1000000-0000-0000-0000-000000000001', 'Ecole A', 'Orange Money', 'FORGED', 99999, 'valide')$sql$,
  $sql$SELECT NOT EXISTS (SELECT 1 FROM public.manual_payments WHERE sender = 'FORGED')$sql$);

SELECT test_support.scenario(
  'ATTACK payment: school cannot insert a payment already marked rejete',
  $sql$SELECT test_support.reset_payments()$sql$,
  'a0000000-0000-0000-0000-0000000000a1', 'authenticated',
  $sql$INSERT INTO public.manual_payments (school_id, school_name, provider, sender, amount, status)
        VALUES ('a1000000-0000-0000-0000-000000000001', 'Ecole A', 'Orange Money', 'FORGED2', 1, 'rejete')$sql$,
  $sql$SELECT NOT EXISTS (SELECT 1 FROM public.manual_payments WHERE sender = 'FORGED2')$sql$);

SELECT test_support.scenario(
  'ATTACK payment: school cannot insert a payment for another school',
  $sql$SELECT test_support.reset_payments()$sql$,
  'a0000000-0000-0000-0000-0000000000a1', 'authenticated',
  $sql$INSERT INTO public.manual_payments (school_id, school_name, provider, sender, amount)
        VALUES ('b1000000-0000-0000-0000-000000000002', 'Ecole B', 'Orange Money', 'CROSS', 10000)$sql$,
  $sql$SELECT NOT EXISTS (SELECT 1 FROM public.manual_payments WHERE sender = 'CROSS')$sql$);

SELECT test_support.scenario(
  'ATTACK payment: school cannot validate its own pending payment (UPDATE status=valide)',
  $sql$SELECT test_support.reset_payments()$sql$,
  'a0000000-0000-0000-0000-0000000000a1', 'authenticated',
  $sql$UPDATE public.manual_payments SET status = 'valide' WHERE id = 'd1000000-0000-0000-0000-000000000001'$sql$,
  $sql$SELECT status = 'en_attente' FROM public.manual_payments WHERE id = 'd1000000-0000-0000-0000-000000000001'$sql$);

SELECT test_support.scenario(
  'ATTACK payment: school cannot change the amount of its own payment',
  $sql$SELECT test_support.reset_payments()$sql$,
  'a0000000-0000-0000-0000-0000000000a1', 'authenticated',
  $sql$UPDATE public.manual_payments SET amount = 1 WHERE id = 'd1000000-0000-0000-0000-000000000001'$sql$,
  $sql$SELECT amount = 10000 FROM public.manual_payments WHERE id = 'd1000000-0000-0000-0000-000000000001'$sql$);

SELECT test_support.scenario(
  'ATTACK payment: school cannot reopen a payment the admin rejected',
  $sql$SELECT test_support.reset_payments()$sql$,
  'a0000000-0000-0000-0000-0000000000a1', 'authenticated',
  $sql$UPDATE public.manual_payments SET status = 'en_attente' WHERE id = 'd1000000-0000-0000-0000-000000000002'$sql$,
  $sql$SELECT status = 'rejete' FROM public.manual_payments WHERE id = 'd1000000-0000-0000-0000-000000000002'$sql$);

SELECT test_support.scenario(
  'ATTACK payment: school cannot delete a rejected payment (history erasure)',
  $sql$SELECT test_support.reset_payments()$sql$,
  'a0000000-0000-0000-0000-0000000000a1', 'authenticated',
  $sql$DELETE FROM public.manual_payments WHERE id = 'd1000000-0000-0000-0000-000000000002'$sql$,
  $sql$SELECT EXISTS (SELECT 1 FROM public.manual_payments WHERE id = 'd1000000-0000-0000-0000-000000000002')$sql$);

SELECT test_support.scenario(
  'ATTACK payment: school cannot delete a validated payment',
  $sql$SELECT test_support.reset_payments()$sql$,
  'a0000000-0000-0000-0000-0000000000a1', 'authenticated',
  $sql$DELETE FROM public.manual_payments WHERE id = 'd1000000-0000-0000-0000-000000000004'$sql$,
  $sql$SELECT EXISTS (SELECT 1 FROM public.manual_payments WHERE id = 'd1000000-0000-0000-0000-000000000004')$sql$);

SELECT test_support.scenario(
  'ATTACK tenancy: school cannot validate another school''s payment',
  $sql$SELECT test_support.reset_payments()$sql$,
  'a0000000-0000-0000-0000-0000000000a1', 'authenticated',
  $sql$UPDATE public.manual_payments SET status = 'valide' WHERE id = 'd1000000-0000-0000-0000-000000000003'$sql$,
  $sql$SELECT status = 'en_attente' FROM public.manual_payments WHERE id = 'd1000000-0000-0000-0000-000000000003'$sql$);

SELECT test_support.scenario(
  'ATTACK payment: anonymous role cannot touch payments',
  $sql$SELECT test_support.reset_payments()$sql$,
  NULL, 'anon',
  $sql$UPDATE public.manual_payments SET status = 'valide' WHERE id = 'd1000000-0000-0000-0000-000000000001'$sql$,
  $sql$SELECT status = 'en_attente' FROM public.manual_payments WHERE id = 'd1000000-0000-0000-0000-000000000001'$sql$);

-- ════════════════════════════════════════════════════════════════════════════
-- 3. PRIVILEGES — admin RPCs and financial tables must stay closed to clients
-- ════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_open text;
BEGIN
  SELECT string_agg(p.oid::regprocedure::text, ', ') INTO v_open
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname LIKE 'admin\_%'
    AND (has_function_privilege('anon', p.oid, 'EXECUTE')
      OR has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  PERFORM test_support.record('ATTACK privileges: no admin_* function is executable by anon/authenticated',
    v_open IS NULL, coalesce(v_open, 'none'));
END $$;

DO $$
DECLARE
  v_open text;
BEGIN
  SELECT string_agg(t, ', ') INTO v_open FROM unnest(ARRAY[
    'public.affiliates', 'public.affiliate_commissions', 'public.subscription_status_events'
  ]) AS t
  WHERE has_table_privilege('anon', t, 'SELECT') OR has_table_privilege('authenticated', t, 'SELECT')
     OR has_table_privilege('authenticated', t, 'INSERT') OR has_table_privilege('authenticated', t, 'UPDATE');
  PERFORM test_support.record('ATTACK privileges: affiliate and subscription-event tables are closed to clients',
    v_open IS NULL, coalesce(v_open, 'none'));
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. REGRESSION — legitimate flows must keep working
-- ════════════════════════════════════════════════════════════════════════════
SELECT test_support.scenario(
  'REGRESSION school: can still edit name, director and city',
  $sql$SELECT test_support.reset_school('a1000000-0000-0000-0000-000000000001', 'expired')$sql$,
  'a0000000-0000-0000-0000-0000000000a1', 'authenticated',
  $sql$UPDATE public.schools SET name = 'Ecole A renommee', director_name = 'Directeur A', city = 'Bamako'
        WHERE id = 'a1000000-0000-0000-0000-000000000001'$sql$,
  $sql$SELECT name = 'Ecole A renommee' AND director_name = 'Directeur A' AND city = 'Bamako'
        FROM public.schools WHERE id = 'a1000000-0000-0000-0000-000000000001'$sql$);

SELECT test_support.scenario(
  'REGRESSION school: set_new_school_phone still works for its own school',
  $sql$SELECT test_support.reset_school('a1000000-0000-0000-0000-000000000001', 'expired')$sql$,
  'a0000000-0000-0000-0000-0000000000a1', 'authenticated',
  $sql$SELECT public.set_new_school_phone('a1000000-0000-0000-0000-000000000001', '+22370123456')$sql$,
  $sql$SELECT phone = '+22370123456' FROM public.schools WHERE id = 'a1000000-0000-0000-0000-000000000001'$sql$);

SELECT test_support.scenario(
  'REGRESSION school: sees only its own school row',
  NULL, NULL, 'service_role', $sql$SELECT 1$sql$,
  $sql$SELECT test_support.run_as_scalar('a0000000-0000-0000-0000-0000000000a1', 'authenticated', 'SELECT count(*)::text FROM public.schools') = '1'$sql$);

SELECT test_support.scenario(
  'REGRESSION payments: school still reads its own payments and only those',
  $sql$SELECT test_support.reset_payments()$sql$,
  NULL, 'service_role', $sql$SELECT 1$sql$,
  $sql$SELECT test_support.run_as_scalar('a0000000-0000-0000-0000-0000000000a1', 'authenticated', 'SELECT count(*)::text FROM public.manual_payments') = '3'$sql$);

SELECT test_support.scenario(
  'REGRESSION payments: school can still declare a new pending payment',
  $sql$SELECT test_support.reset_payments()$sql$,
  'a0000000-0000-0000-0000-0000000000a1', 'authenticated',
  $sql$INSERT INTO public.manual_payments (school_id, school_name, provider, sender, amount)
        VALUES ('a1000000-0000-0000-0000-000000000001', 'Ecole A', 'Orange Money', 'DECLARED', 10000)$sql$,
  $sql$SELECT EXISTS (SELECT 1 FROM public.manual_payments WHERE sender = 'DECLARED' AND status = 'en_attente')$sql$);

SELECT test_support.scenario(
  'REGRESSION admin: admin_validate_payment activates the school (service_role)',
  $sql$SELECT test_support.reset_school('a1000000-0000-0000-0000-000000000001', 'expired'); SELECT test_support.reset_payments()$sql$,
  NULL, 'service_role',
  $sql$SELECT public.admin_validate_payment('d1000000-0000-0000-0000-000000000001')$sql$,
  $sql$SELECT (SELECT status FROM public.manual_payments WHERE id = 'd1000000-0000-0000-0000-000000000001') = 'valide'
        AND (SELECT subscription_status FROM public.schools WHERE id = 'a1000000-0000-0000-0000-000000000001') = 'active'$sql$);

SELECT test_support.scenario(
  'REGRESSION admin: admin_reject_payment still works (service_role)',
  $sql$SELECT test_support.reset_payments()$sql$,
  NULL, 'service_role',
  $sql$SELECT public.admin_reject_payment('d1000000-0000-0000-0000-000000000001')$sql$,
  $sql$SELECT status = 'rejete' FROM public.manual_payments WHERE id = 'd1000000-0000-0000-0000-000000000001'$sql$);

SELECT test_support.scenario(
  'REGRESSION admin: admin_set_school_status suspend works (service_role)',
  $sql$SELECT test_support.reset_school('a1000000-0000-0000-0000-000000000001', 'active')$sql$,
  NULL, 'service_role',
  $sql$SELECT public.admin_set_school_status('a1000000-0000-0000-0000-000000000001', 'suspend')$sql$,
  $sql$SELECT subscription_status = 'suspended' FROM public.schools WHERE id = 'a1000000-0000-0000-0000-000000000001'$sql$);

SELECT test_support.scenario(
  'REGRESSION admin: admin_set_school_status restore works (service_role)',
  NULL,
  NULL, 'service_role',
  $sql$SELECT public.admin_set_school_status('a1000000-0000-0000-0000-000000000001', 'restore')$sql$,
  $sql$SELECT subscription_status = 'active' FROM public.schools WHERE id = 'a1000000-0000-0000-0000-000000000001'$sql$);

SELECT test_support.scenario(
  'REGRESSION admin: Edge Function direct update of subscription columns still works (service_role)',
  $sql$SELECT test_support.reset_school('a1000000-0000-0000-0000-000000000001', 'expired')$sql$,
  NULL, 'service_role',
  $sql$UPDATE public.schools SET subscription_status = 'active', plan = 'Premium', billing_period = 'mensuel',
        subscription_amount = 20000, last_paid_at = now(), subscription_started_at = now(),
        trial_ends_at = now() + interval '30 days'
      WHERE id = 'a1000000-0000-0000-0000-000000000001'$sql$,
  $sql$SELECT subscription_status = 'active' AND plan = 'Premium' AND subscription_amount = 20000
        FROM public.schools WHERE id = 'a1000000-0000-0000-0000-000000000001'$sql$);

SELECT test_support.scenario(
  'REGRESSION signup: handle_new_school_with_referral still records the referral code',
  NULL,
  'c0000000-0000-0000-0000-0000000000c1', 'authenticated',
  $sql$SELECT public.handle_new_school_with_referral('Ecole C', 'Directeur C', 'c@test.local', 'GTTEST001')$sql$,
  $sql$SELECT EXISTS (SELECT 1 FROM public.schools WHERE name = 'Ecole C' AND referred_by_code = 'GTTEST001')$sql$);

SELECT test_support.scenario(
  'REGRESSION affiliates: admin activation of a referred school still creates the commission',
  NULL,
  NULL, 'service_role',
  $sql$UPDATE public.schools SET subscription_status = 'active', plan = 'Premium' WHERE name = 'Ecole C'$sql$,
  $sql$SELECT EXISTS (SELECT 1 FROM public.affiliate_commissions c JOIN public.schools s ON s.id = c.school_id
                      WHERE s.name = 'Ecole C' AND c.commission_amount = 10000)$sql$);

-- ── Summary ─────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_fail  integer;
  v_total integer;
  r       record;
BEGIN
  SELECT count(*) INTO v_total FROM test_support_results.results;
  SELECT count(*) INTO v_fail  FROM test_support_results.results WHERE NOT ok;
  RAISE NOTICE '================ % scenarios, % failed ================', v_total, v_fail;
  FOR r IN SELECT name, detail FROM test_support_results.results WHERE NOT ok ORDER BY name LOOP
    RAISE NOTICE 'FAILED: % -- %', r.name, left(r.detail, 400);
  END LOOP;
  IF v_fail > 0 THEN
    RAISE EXCEPTION '% security scenario(s) failed', v_fail;
  END IF;
END $$;
