-- Record app sign-ins and restored sessions for the private Gestilys admin dashboard.
CREATE TABLE IF NOT EXISTS public.login_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auth_uid uuid,
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('sign_in', 'session_restore')),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_events_occurred_at_idx ON public.login_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS login_events_school_id_idx ON public.login_events (school_id, occurred_at DESC);
ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.login_events FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_my_login(p_event_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Connexion requise.';
  END IF;
  IF p_event_type NOT IN ('sign_in', 'session_restore') THEN
    RAISE EXCEPTION 'Type de connexion invalide.';
  END IF;
  SELECT u.school_id INTO v_school_id FROM public.users u WHERE u.auth_uid = auth.uid() LIMIT 1;
  INSERT INTO public.login_events (auth_uid, school_id, event_type)
  VALUES (auth.uid(), v_school_id, p_event_type);
END;
$$;
REVOKE ALL ON FUNCTION public.record_my_login(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_my_login(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_login_stats()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
WITH
daily_counts AS (
  SELECT date_trunc('day', occurred_at)::date AS day, count(*)::integer AS total
  FROM public.login_events
  WHERE occurred_at >= date_trunc('day', now()) - interval '29 days'
  GROUP BY 1
),
monthly_counts AS (
  SELECT date_trunc('month', occurred_at)::date AS month, count(*)::integer AS total
  FROM public.login_events
  WHERE occurred_at >= date_trunc('month', now()) - interval '11 months'
  GROUP BY 1
),
daily_series AS (
  SELECT gs::date AS day FROM generate_series(
    date_trunc('day', now()) - interval '29 days',
    date_trunc('day', now()),
    interval '1 day'
  ) gs
),
monthly_series AS (
  SELECT gs::date AS month FROM generate_series(
    date_trunc('month', now()) - interval '11 months',
    date_trunc('month', now()),
    interval '1 month'
  ) gs
)
SELECT jsonb_build_object(
  'today', (SELECT count(*)::integer FROM public.login_events WHERE occurred_at >= date_trunc('day', now())),
  'this_month', (SELECT count(*)::integer FROM public.login_events WHERE occurred_at >= date_trunc('month', now())),
  'last_30_days', (SELECT count(*)::integer FROM public.login_events WHERE occurred_at >= now() - interval '30 days'),
  'daily', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('date', to_char(ds.day, 'YYYY-MM-DD'), 'count', COALESCE(dc.total, 0)) ORDER BY ds.day)
    FROM daily_series ds LEFT JOIN daily_counts dc ON dc.day = ds.day
  ), '[]'::jsonb),
  'monthly', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('month', to_char(ms.month, 'YYYY-MM'), 'count', COALESCE(mc.total, 0)) ORDER BY ms.month)
    FROM monthly_series ms LEFT JOIN monthly_counts mc ON mc.month = ms.month
  ), '[]'::jsonb)
);
$$;
REVOKE ALL ON FUNCTION public.admin_login_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_login_stats() TO service_role;
NOTIFY pgrst, 'reload schema';
