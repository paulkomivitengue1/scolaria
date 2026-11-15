-- Gestilys affiliate program: referral attribution, commission ledger and payout history.
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS referred_by_code text;

CREATE TABLE IF NOT EXISTS public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (length(trim(full_name)) BETWEEN 2 AND 120),
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  referral_code text NOT NULL UNIQUE CHECK (referral_code ~ '^[A-Z0-9-]{5,32}$'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE RESTRICT,
  school_id uuid NOT NULL UNIQUE REFERENCES public.schools(id) ON DELETE RESTRICT,
  plan text NOT NULL CHECK (plan IN ('Essentiel','Premium','Élite')),
  subscription_amount integer NOT NULL CHECK (subscription_amount >= 0),
  commission_amount integer NOT NULL CHECK (commission_amount >= 0),
  status text NOT NULL DEFAULT 'due' CHECK (status IN ('due','paid')),
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  payment_method text,
  payment_reference text
);
CREATE INDEX IF NOT EXISTS affiliate_commissions_affiliate_idx
  ON public.affiliate_commissions(affiliate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS affiliate_commissions_status_idx
  ON public.affiliate_commissions(status, created_at DESC);

ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.affiliates FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.affiliate_commissions FROM PUBLIC, anon, authenticated;

-- Four-argument signup wrapper. The original atomic school creation function stays intact.
CREATE OR REPLACE FUNCTION public.handle_new_school_with_referral(
  p_school_name text,
  p_director_name text,
  p_email text,
  p_referral_code text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id uuid;
  v_code text := upper(trim(coalesce(p_referral_code, '')));
BEGIN
  v_school_id := public.handle_new_school(p_school_name, p_director_name, p_email);
  IF v_code <> '' AND EXISTS (
    SELECT 1 FROM public.affiliates
    WHERE referral_code = v_code AND status = 'active'
  ) THEN
    UPDATE public.schools SET referred_by_code = v_code WHERE id = v_school_id;
  END IF;
  RETURN v_school_id;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_school_with_referral(text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.handle_new_school_with_referral(text,text,text,text) TO authenticated;

-- One commission per school, created only when its first paid subscription is activated.
CREATE OR REPLACE FUNCTION public.create_affiliate_commission_on_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affiliate_id uuid;
  v_commission integer;
BEGIN
  IF NEW.subscription_status = 'active'
     AND OLD.subscription_status IS DISTINCT FROM 'active'
     AND coalesce(NEW.referred_by_code, '') <> '' THEN
    SELECT id INTO v_affiliate_id
    FROM public.affiliates
    WHERE referral_code = NEW.referred_by_code;
    IF v_affiliate_id IS NOT NULL THEN
      v_commission := CASE NEW.plan
        WHEN 'Essentiel' THEN 5000
        WHEN 'Premium' THEN 10000
        WHEN 'Élite' THEN 15000
        ELSE 0
      END;
      INSERT INTO public.affiliate_commissions
        (affiliate_id, school_id, plan, subscription_amount, commission_amount)
      VALUES
        (v_affiliate_id, NEW.id, NEW.plan, coalesce(NEW.subscription_amount,0), v_commission)
      ON CONFLICT (school_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS schools_create_affiliate_commission ON public.schools;
CREATE TRIGGER schools_create_affiliate_commission
AFTER UPDATE OF subscription_status ON public.schools
FOR EACH ROW EXECUTE FUNCTION public.create_affiliate_commission_on_activation();

NOTIFY pgrst, 'reload schema';
