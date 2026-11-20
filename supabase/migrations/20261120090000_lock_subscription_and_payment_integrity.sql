-- Lock subscription and payment integrity against client-side tampering.
--
-- Problems fixed (all reproducible with tests/security/*.test.sql):
--  1. The "update_own_school" policy lets any school user UPDATE every column of
--     its own school row: subscription_status, plan, trial_ends_at, billing and
--     payment columns, suspended_from_status, referred_by_code. A school could
--     activate itself without paying, lift an admin suspension, extend its trial
--     indefinitely, and (with a referral code) trigger a partner commission.
--  2. manual_payments (subscription payments) allowed school users to INSERT rows
--     already marked 'valide', UPDATE status/amount, and DELETE their own rows,
--     including payments the administrator rejected.
--  3. Every admin_* RPC is now closed to anon/authenticated, whatever earlier
--     migrations did.
--
-- Server-side operations keep working: the guards only apply to the anon and
-- authenticated API roles (current_user), so service_role (Edge Function) and
-- SECURITY DEFINER functions (admin_validate_payment, admin_set_school_status,
-- handle_new_school_with_referral, ...) are unaffected.
-- This migration changes no existing row.

-- ── 1. schools: protected columns ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.protect_school_subscription_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_old jsonb := to_jsonb(OLD);
  v_new jsonb := to_jsonb(NEW);
BEGIN
  -- Only API client roles are restricted. Inside a SECURITY DEFINER function
  -- current_user is the function owner, and service_role is never restricted.
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  FOREACH v_key IN ARRAY ARRAY[
    'id', 'created_at',
    'subscription_status', 'plan', 'trial_ends_at',
    'billing_period', 'subscription_amount', 'last_paid_at', 'subscription_started_at',
    'suspended_from_status', 'referred_by_code'
  ] LOOP
    IF (v_old -> v_key) IS DISTINCT FROM (v_new -> v_key) THEN
      RAISE EXCEPTION 'Le champ "%" est géré uniquement par l''administration Gestilys.', v_key
        USING ERRCODE = '42501';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_school_subscription_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_school_subscription_fields ON public.schools;
CREATE TRIGGER trg_protect_school_subscription_fields
BEFORE UPDATE ON public.schools
FOR EACH ROW
EXECUTE FUNCTION public.protect_school_subscription_fields();

-- ── 2. manual_payments: schools may only declare a pending payment ───────────────
DROP POLICY IF EXISTS "insert_own_manual_payments" ON public.manual_payments;
CREATE POLICY "insert_own_manual_payments" ON public.manual_payments
  FOR INSERT TO authenticated
  WITH CHECK (school_id = public.current_school_id() AND status = 'en_attente');

DROP POLICY IF EXISTS "update_own_manual_payments" ON public.manual_payments;
DROP POLICY IF EXISTS "delete_own_manual_payments" ON public.manual_payments;

-- Privilege-level defence in depth: even if a policy were re-added later, the
-- API roles cannot modify or delete payment rows.
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.manual_payments FROM anon, authenticated;
REVOKE INSERT ON public.manual_payments FROM anon;

-- A declared payment is always pending, attributed to the caller's own school,
-- and stamped with the server time.
CREATE OR REPLACE FUNCTION public.guard_manual_payment_client_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF NEW.status IS DISTINCT FROM 'en_attente' THEN
      RAISE EXCEPTION 'Un paiement déclaré doit être en attente de validation par l''administration.'
        USING ERRCODE = '42501';
    END IF;
    NEW.school_name := coalesce(
      (SELECT s.name FROM public.schools s WHERE s.id = NEW.school_id),
      NEW.school_name
    );
    NEW.received_at := now();
    NEW.created_at  := now();
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_manual_payment_client_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_manual_payment_client_insert ON public.manual_payments;
CREATE TRIGGER trg_guard_manual_payment_client_insert
BEFORE INSERT ON public.manual_payments
FOR EACH ROW
EXECUTE FUNCTION public.guard_manual_payment_client_insert();

CREATE OR REPLACE FUNCTION public.block_client_manual_payment_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'Les paiements ne peuvent être modifiés ou supprimés que par l''administration Gestilys.'
      USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.block_client_manual_payment_changes() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_block_client_manual_payment_changes ON public.manual_payments;
CREATE TRIGGER trg_block_client_manual_payment_changes
BEFORE UPDATE OR DELETE ON public.manual_payments
FOR EACH ROW
EXECUTE FUNCTION public.block_client_manual_payment_changes();

-- ── 3. Every admin_* RPC is service_role only ────────────────────────────────────
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname LIKE 'admin\_%'
      AND p.prokind = 'f'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
