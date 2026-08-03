/*
# Admin panel support: city/plan columns + manual_payments table

## Purpose
The super-admin panel (accessed only via /scolaria-admin URL with a developer
code) needs to list all schools with their city and subscription plan, and
manage manual payment validations (Orange Money, Wave, Moov) that extend a
school's subscription by 30 days when validated.

## Changes

### 1. schools table — add city and plan columns
- `city` (text, default '') — city where the school is located
- `plan` (text, default 'Essentiel') — subscription tier: Essentiel | Premium | Élite

### 2. New table: manual_payments
- `id` (uuid, PK)
- `school_id` (uuid, FK → schools, CASCADE)
- `school_name` (text) — denormalized for admin display
- `provider` (text) — Orange Money | Wave | Moov Money
- `sender` (text) — phone number or transaction ID
- `amount` (integer) — payment amount in FCFA
- `status` (text, default 'en_attente') — en_attente | valide | rejete
- `received_at` (timestamptz, default now())
- `created_at` (timestamptz, default now())

### 3. SECURITY DEFINER functions
- `admin_list_schools()` — returns all schools (bypasses RLS, service-role only)
- `admin_list_manual_payments()` — returns all manual payments (bypasses RLS)
- `admin_validate_payment(p_payment_id uuid)` — marks payment as valide and
  extends the school's trial_ends_at by 30 days, sets subscription_status to 'active'
- `admin_reject_payment(p_payment_id uuid)` — marks payment as rejete

### 4. Security
- RLS enabled on manual_payments, no policies for anon/authenticated (locked down)
- SECURITY DEFINER functions are executable ONLY by service_role (revoke from
  anon, authenticated, PUBLIC)
- The admin panel authenticates via a developer code checked in an edge function
  that uses the service role key to call these functions
*/
-- ── Add columns to schools ─────────────────────────────
ALTER TABLE schools ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT '';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'Essentiel'
  CHECK (plan IN ('Essentiel','Premium','Élite'));

-- ── manual_payments table ──────────────────────────────
CREATE TABLE IF NOT EXISTS manual_payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  school_name text NOT NULL DEFAULT '',
  provider    text NOT NULL DEFAULT 'Orange Money'
                CHECK (provider IN ('Orange Money','Wave','Moov Money')),
  sender      text NOT NULL DEFAULT '',
  amount      integer NOT NULL DEFAULT 0,
  status      text NOT NULL DEFAULT 'en_attente'
                CHECK (status IN ('en_attente','valide','rejete')),
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_manual_payments_school ON manual_payments(school_id);
CREATE INDEX IF NOT EXISTS idx_manual_payments_status ON manual_payments(status);

ALTER TABLE manual_payments ENABLE ROW LEVEL SECURITY;

-- No policies: table is locked down. Only SECURITY DEFINER functions access it.

-- ── Admin functions (SECURITY DEFINER, service-role only) ──

CREATE OR REPLACE FUNCTION admin_list_schools()
RETURNS TABLE (
  id uuid,
  name text,
  city text,
  plan text,
  subscription_status text,
  trial_ends_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id, name, city, plan, subscription_status, trial_ends_at, created_at
  FROM public.schools
  ORDER BY created_at DESC;
$$;

CREATE OR REPLACE FUNCTION admin_list_manual_payments()
RETURNS TABLE (
  id uuid,
  school_id uuid,
  school_name text,
  provider text,
  sender text,
  amount integer,
  status text,
  received_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id, school_id, school_name, provider, sender, amount, status, received_at
  FROM public.manual_payments
  ORDER BY received_at DESC;
$$;

CREATE OR REPLACE FUNCTION admin_validate_payment(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id uuid;
BEGIN
  SELECT school_id INTO v_school_id FROM public.manual_payments WHERE id = p_payment_id;
  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  UPDATE public.manual_payments SET status = 'valide' WHERE id = p_payment_id;
  UPDATE public.schools
    SET subscription_status = 'active',
        trial_ends_at = GREATEST(trial_ends_at, now()) + interval '30 days'
    WHERE id = v_school_id;
END;
$$;

CREATE OR REPLACE FUNCTION admin_reject_payment(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.manual_payments SET status = 'rejete' WHERE id = p_payment_id;
END;
$$;

-- ── Revoke all access, grant only to service_role ──────
REVOKE EXECUTE ON FUNCTION admin_list_schools() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_list_manual_payments() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_validate_payment(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_reject_payment(uuid) FROM anon, authenticated, PUBLIC;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
