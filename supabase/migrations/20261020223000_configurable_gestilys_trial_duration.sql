-- Configurable global trial duration for new school registrations.
ALTER TABLE public.gestilys_public_settings
  ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 14;

ALTER TABLE public.gestilys_public_settings
  DROP CONSTRAINT IF EXISTS gestilys_public_settings_trial_days_check;
ALTER TABLE public.gestilys_public_settings
  ADD CONSTRAINT gestilys_public_settings_trial_days_check
  CHECK (trial_days BETWEEN 0 AND 365);

CREATE OR REPLACE FUNCTION public.apply_gestilys_trial_duration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trial_days integer;
BEGIN
  IF NEW.subscription_status = 'trial' THEN
    SELECT COALESCE((SELECT s.trial_days FROM public.gestilys_public_settings AS s WHERE s.id = 1), 14)
      INTO v_trial_days;
    NEW.trial_ends_at := now() + make_interval(days => v_trial_days);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_gestilys_trial_duration_before_insert ON public.schools;
CREATE TRIGGER apply_gestilys_trial_duration_before_insert
BEFORE INSERT ON public.schools
FOR EACH ROW
EXECUTE FUNCTION public.apply_gestilys_trial_duration();

REVOKE ALL ON FUNCTION public.apply_gestilys_trial_duration() FROM PUBLIC, anon, authenticated;
