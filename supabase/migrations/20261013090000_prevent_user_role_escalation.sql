-- Prevent a school user from changing their own privilege or tenant identity.
-- Service-role/server-side operations (where auth.uid() is NULL) remain possible.
CREATE OR REPLACE FUNCTION public.prevent_user_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.auth_uid IS DISTINCT FROM OLD.auth_uid
       OR NEW.school_id IS DISTINCT FROM OLD.school_id
       OR NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'You cannot change account identity, school, or role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_user_privilege_escalation ON public.users;
CREATE TRIGGER trg_prevent_user_privilege_escalation
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.prevent_user_privilege_escalation();
