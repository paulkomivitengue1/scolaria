-- Require and securely persist a Malian phone number for new school registrations.
-- Existing school records are preserved; this does not backfill or delete data.
CREATE OR REPLACE FUNCTION public.set_new_school_phone(p_school_id uuid, p_phone text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_phone IS NULL OR p_phone !~ '^\\+223[0-9]{8}$' THEN
    RAISE EXCEPTION 'Numéro invalide : utilisez +223 suivi de 8 chiffres.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.school_id = p_school_id AND u.auth_uid = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Accès refusé pour cette école.';
  END IF;
  UPDATE public.schools SET phone = p_phone WHERE id = p_school_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'École introuvable.';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_new_school_phone(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_new_school_phone(uuid, text) TO authenticated;

-- Add the registration email to the existing Super-Admin school listing.
DROP FUNCTION IF EXISTS public.admin_list_schools();
CREATE FUNCTION public.admin_list_schools()
RETURNS TABLE (
  id uuid,
  name text,
  city text,
  plan text,
  subscription_status text,
  trial_ends_at timestamptz,
  created_at timestamptz,
  director_name text,
  phone text,
  email text,
  student_count bigint,
  billing_period text,
  subscription_amount integer,
  last_paid_at timestamptz,
  subscription_started_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    s.id, s.name, s.city, s.plan, s.subscription_status, s.trial_ends_at, s.created_at,
    s.director_name, s.phone, u.email,
    (SELECT COUNT(*) FROM public.students st WHERE st.school_id = s.id) AS student_count,
    s.billing_period, s.subscription_amount, s.last_paid_at, s.subscription_started_at
  FROM public.schools s
  LEFT JOIN LATERAL (
    SELECT usr.email FROM public.users usr
    WHERE usr.school_id = s.id AND usr.role = 'admin_ecole'
    ORDER BY usr.created_at ASC
    LIMIT 1
  ) u ON true
  ORDER BY s.created_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_schools() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_schools() TO service_role;

-- The manual-payment listing is only accessed by the service-role Edge Function.
REVOKE EXECUTE ON FUNCTION public.admin_list_manual_payments() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_manual_payments() TO service_role;

NOTIFY pgrst, 'reload schema';
