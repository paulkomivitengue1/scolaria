-- Academic-year rollover with preserved payment and stock history.
-- Additive migration: existing student, payment and stock rows are retained.
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS current_academic_year text;
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS academic_year text;

UPDATE public.schools
SET current_academic_year = CASE
  WHEN EXTRACT(MONTH FROM CURRENT_DATE)::int >= 8
    THEN EXTRACT(YEAR FROM CURRENT_DATE)::int::text || '-' || (EXTRACT(YEAR FROM CURRENT_DATE)::int + 1)::text
  ELSE (EXTRACT(YEAR FROM CURRENT_DATE)::int - 1)::text || '-' || EXTRACT(YEAR FROM CURRENT_DATE)::int::text
END
WHERE current_academic_year IS NULL OR btrim(current_academic_year) = '';

UPDATE public.payments p
SET academic_year = COALESCE(s.current_academic_year, '2026-2027')
FROM public.schools s
WHERE p.school_id = s.id AND (p.academic_year IS NULL OR btrim(p.academic_year) = '');

ALTER TABLE public.schools
  ALTER COLUMN current_academic_year SET DEFAULT (
    CASE
      WHEN EXTRACT(MONTH FROM CURRENT_DATE)::int >= 8
        THEN EXTRACT(YEAR FROM CURRENT_DATE)::int::text || '-' || (EXTRACT(YEAR FROM CURRENT_DATE)::int + 1)::text
      ELSE (EXTRACT(YEAR FROM CURRENT_DATE)::int - 1)::text || '-' || EXTRACT(YEAR FROM CURRENT_DATE)::int::text
    END
  ),
  ALTER COLUMN current_academic_year SET NOT NULL;
ALTER TABLE public.payments
  ALTER COLUMN academic_year SET DEFAULT '2026-2027',
  ALTER COLUMN academic_year SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.student_year_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  student_name text NOT NULL DEFAULT '',
  class_name text NOT NULL DEFAULT '',
  fee_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_expected numeric NOT NULL DEFAULT 0,
  total_paid numeric NOT NULL DEFAULT 0,
  total_unpaid numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, student_id, academic_year)
);
ALTER TABLE public.student_year_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_student_year_history" ON public.student_year_history;
CREATE POLICY "select_own_student_year_history" ON public.student_year_history
  FOR SELECT TO authenticated USING (school_id = public.current_school_id());
DROP POLICY IF EXISTS "insert_own_student_year_history" ON public.student_year_history;
CREATE POLICY "insert_own_student_year_history" ON public.student_year_history
  FOR INSERT TO authenticated WITH CHECK (school_id = public.current_school_id());
DROP POLICY IF EXISTS "update_own_student_year_history" ON public.student_year_history;
CREATE POLICY "update_own_student_year_history" ON public.student_year_history
  FOR UPDATE TO authenticated USING (school_id = public.current_school_id())
  WITH CHECK (school_id = public.current_school_id());

CREATE TABLE IF NOT EXISTS public.school_year_stock_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  stock_item_id uuid NOT NULL,
  category text NOT NULL,
  item_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, academic_year, stock_item_id)
);
ALTER TABLE public.school_year_stock_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_school_year_stock_history" ON public.school_year_stock_history;
CREATE POLICY "select_own_school_year_stock_history" ON public.school_year_stock_history
  FOR SELECT TO authenticated USING (school_id = public.current_school_id());

CREATE OR REPLACE FUNCTION public.gestilys_start_new_academic_year(
  p_school_id uuid,
  p_new_year text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_year text;
  v_expected numeric;
  v_paid numeric;
  v_student_count integer;
  v_stock_count integer;
BEGIN
  IF auth.role() <> 'service_role' AND p_school_id IS DISTINCT FROM public.current_school_id() THEN
    RAISE EXCEPTION 'Accès refusé pour cette école';
  END IF;
  IF p_new_year IS NULL OR p_new_year !~ '^\\d{4}-\\d{4}$' THEN
    RAISE EXCEPTION 'Saisis une année scolaire au format AAAA-AAAA, par exemple 2027-2028';
  END IF;

  SELECT current_academic_year INTO v_old_year
  FROM public.schools WHERE id = p_school_id FOR UPDATE;
  IF v_old_year IS NULL THEN RAISE EXCEPTION 'École introuvable'; END IF;
  IF p_new_year = v_old_year THEN RAISE EXCEPTION 'La nouvelle année doit être différente de l’année actuelle'; END IF;

  INSERT INTO public.school_year_stock_history (school_id, academic_year, stock_item_id, category, item_snapshot)
  SELECT p_school_id, v_old_year, si.id, si.category, to_jsonb(si)
  FROM public.stock_items si WHERE si.school_id = p_school_id
  ON CONFLICT (school_id, academic_year, stock_item_id) DO NOTHING;
  GET DIAGNOSTICS v_stock_count = ROW_COUNT;

  INSERT INTO public.student_year_history (
    school_id, student_id, academic_year, student_name, class_name, fee_breakdown,
    total_expected, total_paid, total_unpaid
  )
  SELECT s.school_id, s.id, v_old_year,
    trim(coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')),
    coalesce(s.class_name,''),
    coalesce(s.fees_json, '[]'::jsonb),
    coalesce((SELECT sum(nullif(f->>'totalExpected','')::numeric)
      FROM jsonb_array_elements(coalesce(s.fees_json, '[]'::jsonb)) f), 0),
    coalesce((SELECT sum(p.amount) FROM public.payments p
      WHERE p.school_id = p_school_id AND p.student_id = s.id AND p.academic_year = v_old_year), 0),
    greatest(
      coalesce((SELECT sum(nullif(f->>'totalExpected','')::numeric)
        FROM jsonb_array_elements(coalesce(s.fees_json, '[]'::jsonb)) f), 0)
      - coalesce((SELECT sum(p.amount) FROM public.payments p
        WHERE p.school_id = p_school_id AND p.student_id = s.id AND p.academic_year = v_old_year), 0),
      0
    )
  FROM public.students s WHERE s.school_id = p_school_id
  ON CONFLICT (school_id, student_id, academic_year) DO UPDATE SET
    student_name = EXCLUDED.student_name,
    class_name = EXCLUDED.class_name,
    fee_breakdown = EXCLUDED.fee_breakdown,
    total_expected = EXCLUDED.total_expected,
    total_paid = EXCLUDED.total_paid,
    total_unpaid = EXCLUDED.total_unpaid,
    created_at = now();
  GET DIAGNOSTICS v_student_count = ROW_COUNT;

  -- Uniforms: carry forward only the remaining quantity as old stock.
  UPDATE public.stock_items
  SET old_stock = greatest(coalesce(old_stock,0) + coalesce(new_stock,0) - coalesce(sold,0), 0),
      new_stock = 0, sold = 0
  WHERE school_id = p_school_id AND category = 'tenue';

  -- Books: retain the remaining quantity, reset the sold counter.
  UPDATE public.stock_items
  SET old_stock = greatest(coalesce(in_stock,0) - coalesce(sold,0), 0),
      new_stock = 0,
      in_stock = greatest(coalesce(in_stock,0) - coalesce(sold,0), 0),
      sold = 0
  WHERE school_id = p_school_id AND category = 'livre';

  -- Supplies: preserve the on-hand quantity as old stock; new stock starts at zero.
  UPDATE public.stock_items
  SET old_stock = greatest(coalesce(in_stock,0), 0),
      new_stock = 0
  WHERE school_id = p_school_id AND category = 'fourniture';

  UPDATE public.schools SET current_academic_year = p_new_year WHERE id = p_school_id;

  RETURN jsonb_build_object(
    'previous_year', v_old_year,
    'current_year', p_new_year,
    'students_archived', v_student_count,
    'stock_items_archived', v_stock_count
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.gestilys_start_new_academic_year(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gestilys_start_new_academic_year(uuid, text) TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';
