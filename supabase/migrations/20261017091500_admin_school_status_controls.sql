-- Super-admin school suspension and restoration controls.
ALTER TABLE public.schools
  DROP CONSTRAINT IF EXISTS schools_subscription_status_check;

ALTER TABLE public.schools
  ADD CONSTRAINT schools_subscription_status_check
  CHECK (subscription_status IN ('trial','active','expired','suspended'));

ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS suspended_from_status text;

CREATE OR REPLACE FUNCTION public.admin_set_school_status(
  p_school_id uuid,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status text;
BEGIN
  IF p_status NOT IN ('suspend','restore') THEN
    RAISE EXCEPTION 'Statut demandé invalide';
  END IF;

  SELECT subscription_status INTO v_current_status
  FROM public.schools WHERE id = p_school_id FOR UPDATE;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'École introuvable';
  END IF;

  IF p_status = 'suspend' THEN
    IF v_current_status = 'suspended' THEN
      RETURN;
    END IF;
    UPDATE public.schools
    SET suspended_from_status = v_current_status,
        subscription_status = 'suspended'
    WHERE id = p_school_id;
  ELSE
    IF v_current_status <> 'suspended' THEN
      RETURN;
    END IF;
    UPDATE public.schools
    SET subscription_status = CASE
          WHEN suspended_from_status IN ('trial','active','expired') THEN suspended_from_status
          ELSE 'trial'
        END,
        suspended_from_status = NULL
    WHERE id = p_school_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_school_status(uuid, text) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_school_status(uuid, text) TO service_role;
NOTIFY pgrst, 'reload schema';
