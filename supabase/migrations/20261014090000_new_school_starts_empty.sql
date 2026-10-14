-- New schools start with zero fees configured and no invented revenue or stock.
-- Existing schools and their records are intentionally untouched.
-- Keep the secured public wrapper handle_new_school() unchanged.
CREATE OR REPLACE FUNCTION handle_new_school_unchecked(
  p_school_name   text,
  p_director_name text,
  p_email         text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id uuid;
  v_class_names text[] := ARRAY[
    'Jardin','1ère année','2ème année','3ème année','4ème année',
    '5ème année','6ème année','7ème année','8ème année','9ème année'
  ];
  v_cls text;
BEGIN
  INSERT INTO public.schools (name, director_name)
  VALUES (p_school_name, p_director_name)
  RETURNING id INTO v_school_id;

  INSERT INTO public.users (auth_uid, school_id, email, role)
  VALUES (auth.uid(), v_school_id, p_email, 'admin_ecole');

  -- Structural defaults only: no sample prices, students, payments, or stock.
  FOREACH v_cls IN ARRAY v_class_names LOOP
    INSERT INTO public.classes (school_id, name)
    VALUES (v_school_id, v_cls)
    ON CONFLICT (school_id, name) DO NOTHING;
  END LOOP;

  INSERT INTO public.school_tranches (school_id, tranche_index, label)
  VALUES
    (v_school_id, 1, 'Tranche 1'),
    (v_school_id, 2, 'Tranche 2'),
    (v_school_id, 3, 'Tranche 3')
  ON CONFLICT (school_id, tranche_index) DO NOTHING;

  INSERT INTO public.grade_periods (school_id, period_index, label)
  VALUES
    (v_school_id, 1, 'Trimestre 1'),
    (v_school_id, 2, 'Trimestre 2'),
    (v_school_id, 3, 'Trimestre 3')
  ON CONFLICT (school_id, period_index) DO NOTHING;

  RETURN v_school_id;
END;
$$;
