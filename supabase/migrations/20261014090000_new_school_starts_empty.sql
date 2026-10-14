-- New schools start with no invented revenue, stock, or fee prices.
-- Existing schools are intentionally untouched; this only changes future signups.
CREATE OR REPLACE FUNCTION handle_new_school(
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

  -- Keep the standard class list, but do not insert sample prices or stock.
  FOREACH v_cls IN ARRAY v_class_names LOOP
    INSERT INTO public.classes (school_id, name)
    VALUES (v_school_id, v_cls)
    ON CONFLICT (school_id, name) DO NOTHING;
  END LOOP;

  RETURN v_school_id;
END;
$$;
