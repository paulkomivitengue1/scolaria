-- Record subscription-status transitions so churn is based on real events going forward.
CREATE TABLE IF NOT EXISTS public.subscription_status_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  school_id uuid NOT NULL,
  old_status text,
  new_status text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscription_status_events_changed_at_idx
  ON public.subscription_status_events (changed_at DESC);
CREATE INDEX IF NOT EXISTS subscription_status_events_school_idx
  ON public.subscription_status_events (school_id, changed_at DESC);
ALTER TABLE public.subscription_status_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.subscription_status_events FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.log_subscription_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.subscription_status_events (school_id, old_status, new_status)
    VALUES (NEW.id, NULL, NEW.subscription_status);
    RETURN NEW;
  END IF;
  IF OLD.subscription_status IS DISTINCT FROM NEW.subscription_status THEN
    INSERT INTO public.subscription_status_events (school_id, old_status, new_status)
    VALUES (NEW.id, OLD.subscription_status, NEW.subscription_status);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS schools_log_subscription_status ON public.schools;
CREATE TRIGGER schools_log_subscription_status
AFTER INSERT OR UPDATE OF subscription_status ON public.schools
FOR EACH ROW EXECUTE FUNCTION public.log_subscription_status_change();

CREATE OR REPLACE FUNCTION public.admin_subscription_churn_stats()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
WITH periods AS (
  SELECT
    now() - interval '30 days' AS rolling_start,
    date_trunc('month', now()) AS month_start
),
active_now AS (
  SELECT count(*)::integer AS total FROM public.schools WHERE subscription_status = 'active'
),
rolling AS (
  SELECT
    count(*) FILTER (WHERE e.old_status = 'active' AND e.new_status = 'expired')::integer AS churned,
    count(*) FILTER (WHERE e.old_status = 'active' AND e.new_status IS DISTINCT FROM 'active')::integer AS exits,
    count(*) FILTER (WHERE e.new_status = 'active' AND e.old_status IS DISTINCT FROM 'active')::integer AS entries
  FROM public.subscription_status_events e, periods p
  WHERE e.changed_at >= p.rolling_start
),
monthly AS (
  SELECT
    count(*) FILTER (WHERE e.old_status = 'active' AND e.new_status = 'expired')::integer AS churned,
    count(*) FILTER (WHERE e.old_status = 'active' AND e.new_status IS DISTINCT FROM 'active')::integer AS exits,
    count(*) FILTER (WHERE e.new_status = 'active' AND e.old_status IS DISTINCT FROM 'active')::integer AS entries
  FROM public.subscription_status_events e, periods p
  WHERE e.changed_at >= p.month_start
),
tracking AS (
  SELECT min(changed_at) AS tracking_started_at FROM public.subscription_status_events
)
SELECT jsonb_build_object(
  'churned_30_days', COALESCE((SELECT churned FROM rolling), 0),
  'churn_rate_30_days', CASE
    WHEN COALESCE((SELECT total FROM active_now), 0)
       + COALESCE((SELECT exits FROM rolling), 0)
       - COALESCE((SELECT entries FROM rolling), 0) > 0
    THEN round(
      COALESCE((SELECT churned FROM rolling), 0)::numeric * 100
      / (COALESCE((SELECT total FROM active_now), 0)
         + COALESCE((SELECT exits FROM rolling), 0)
         - COALESCE((SELECT entries FROM rolling), 0)), 1
    )
    ELSE 0
  END,
  'churned_this_month', COALESCE((SELECT churned FROM monthly), 0),
  'churn_rate_this_month', CASE
    WHEN COALESCE((SELECT total FROM active_now), 0)
       + COALESCE((SELECT exits FROM monthly), 0)
       - COALESCE((SELECT entries FROM monthly), 0) > 0
    THEN round(
      COALESCE((SELECT churned FROM monthly), 0)::numeric * 100
      / (COALESCE((SELECT total FROM active_now), 0)
         + COALESCE((SELECT exits FROM monthly), 0)
         - COALESCE((SELECT entries FROM monthly), 0)), 1
    )
    ELSE 0
  END,
  'tracking_started_at', (SELECT tracking_started_at FROM tracking)
);
$$;
REVOKE ALL ON FUNCTION public.admin_subscription_churn_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_subscription_churn_stats() TO service_role;
NOTIFY pgrst, 'reload schema';
