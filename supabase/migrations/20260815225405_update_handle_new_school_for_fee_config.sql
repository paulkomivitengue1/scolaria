/*
# Update handle_new_school to seed fee_config and school_tranches

## Purpose
New schools created via signup now get default tranches (3) and fee_config
rows (scolarite, inscription, frais de fête, cantine, transport per class),
matching the new fee system. Previously handle_new_school only seeded
pricing_config which is the old system.

## Changes
1. Create default 3 tranches for the new school
2. Create fee_config rows for all 5 default fee types across all 10 classes
3. Keep the old pricing_config seeding for backward compatibility

## Security
- No table structure changes
- No policy changes
- The function is already SECURITY DEFINER and restricted to authenticated callers
*/

-- First, update handle_new_school to also seed fee_config and school_tranches
CREATE OR REPLACE FUNCTION handle_new_school(
  p_school_name    text,
  p_director_name  text,
  p_email          text
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
  v_cls_idx integer;
BEGIN
  -- Create the school
  INSERT INTO public.schools (name, director_name)
  VALUES (p_school_name, p_director_name)
  RETURNING id INTO v_school_id;

  -- Create the admin user profile
  INSERT INTO public.users (auth_uid, school_id, email, role)
  VALUES (auth.uid(), v_school_id, p_email, 'admin_ecole');

  -- Seed default classes
  FOREACH v_cls IN ARRAY v_class_names LOOP
    INSERT INTO public.classes (school_id, name)
    VALUES (v_school_id, v_cls)
    ON CONFLICT (school_id, name) DO NOTHING;
  END LOOP;

  -- Seed default tranches (3 tranches)
  INSERT INTO public.school_tranches (school_id, tranche_index, label)
  VALUES
    (v_school_id, 1, 'Tranche 1'),
    (v_school_id, 2, 'Tranche 2'),
    (v_school_id, 3, 'Tranche 3')
  ON CONFLICT (school_id, tranche_index) DO NOTHING;

  -- Seed default fee_config for all classes
  -- Scolarité: tranche-based, amounts from the old annual_fee / 3
  -- Inscription: single payment, 25000
  -- Frais de fête: single payment, 5000
  -- Cantine: tranche-based, annual / 3
  -- Transport: tranche-based, annual / 3
  v_cls_idx := 1;
  FOREACH v_cls IN ARRAY v_class_names LOOP
    -- Scolarité (tranche-based)
    INSERT INTO public.fee_config (school_id, fee_type, class_name, payment_mode, tranche_index, amount)
    VALUES
      (v_school_id, 'scolarite', v_cls, 'tranche', 1, CASE v_cls
        WHEN 'Jardin' THEN 45000 WHEN '1ère année' THEN 54000 WHEN '2ème année' THEN 54000
        WHEN '3ème année' THEN 60000 WHEN '4ème année' THEN 60000 WHEN '5ème année' THEN 66000
        WHEN '6ème année' THEN 75000 WHEN '7ème année' THEN 84000 WHEN '8ème année' THEN 90000
        WHEN '9ème année' THEN 105000 ELSE 45000 END),
      (v_school_id, 'scolarite', v_cls, 'tranche', 2, CASE v_cls
        WHEN 'Jardin' THEN 45000 WHEN '1ère année' THEN 54000 WHEN '2ème année' THEN 54000
        WHEN '3ème année' THEN 60000 WHEN '4ème année' THEN 60000 WHEN '5ème année' THEN 66000
        WHEN '6ème année' THEN 75000 WHEN '7ème année' THEN 84000 WHEN '8ème année' THEN 90000
        WHEN '9ème année' THEN 105000 ELSE 45000 END),
      (v_school_id, 'scolarite', v_cls, 'tranche', 3, CASE v_cls
        WHEN 'Jardin' THEN 45000 WHEN '1ère année' THEN 54000 WHEN '2ème année' THEN 54000
        WHEN '3ème année' THEN 60000 WHEN '4ème année' THEN 60000 WHEN '5ème année' THEN 66000
        WHEN '6ème année' THEN 75000 WHEN '7ème année' THEN 84000 WHEN '8ème année' THEN 90000
        WHEN '9ème année' THEN 105000 ELSE 45000 END)
    ON CONFLICT (school_id, fee_type, class_name, tranche_index) DO NOTHING;

    -- Inscription (single payment)
    INSERT INTO public.fee_config (school_id, fee_type, class_name, payment_mode, tranche_index, amount)
    VALUES (v_school_id, 'inscription', v_cls, 'single', NULL, 25000)
    ON CONFLICT (school_id, fee_type, class_name, tranche_index) DO NOTHING;

    -- Frais de fête (single payment)
    INSERT INTO public.fee_config (school_id, fee_type, class_name, payment_mode, tranche_index, amount)
    VALUES (v_school_id, 'frais de fête', v_cls, 'single', NULL, 5000)
    ON CONFLICT (school_id, fee_type, class_name, tranche_index) DO NOTHING;

    -- Cantine (tranche-based)
    INSERT INTO public.fee_config (school_id, fee_type, class_name, payment_mode, tranche_index, amount)
    VALUES
      (v_school_id, 'cantine', v_cls, 'tranche', 1, CASE v_cls
        WHEN 'Jardin' THEN 30000 WHEN '1ère année' THEN 30000 WHEN '2ème année' THEN 30000
        WHEN '3ème année' THEN 36000 WHEN '4ème année' THEN 36000 WHEN '5ème année' THEN 36000
        WHEN '6ème année' THEN 36000 WHEN '7ème année' THEN 42000 WHEN '8ème année' THEN 42000
        WHEN '9ème année' THEN 42000 ELSE 30000 END),
      (v_school_id, 'cantine', v_cls, 'tranche', 2, CASE v_cls
        WHEN 'Jardin' THEN 30000 WHEN '1ère année' THEN 30000 WHEN '2ème année' THEN 30000
        WHEN '3ème année' THEN 36000 WHEN '4ème année' THEN 36000 WHEN '5ème année' THEN 36000
        WHEN '6ème année' THEN 36000 WHEN '7ème année' THEN 42000 WHEN '8ème année' THEN 42000
        WHEN '9ème année' THEN 42000 ELSE 30000 END),
      (v_school_id, 'cantine', v_cls, 'tranche', 3, CASE v_cls
        WHEN 'Jardin' THEN 30000 WHEN '1ère année' THEN 30000 WHEN '2ème année' THEN 30000
        WHEN '3ème année' THEN 36000 WHEN '4ème année' THEN 36000 WHEN '5ème année' THEN 36000
        WHEN '6ème année' THEN 36000 WHEN '7ème année' THEN 42000 WHEN '8ème année' THEN 42000
        WHEN '9ème année' THEN 42000 ELSE 30000 END)
    ON CONFLICT (school_id, fee_type, class_name, tranche_index) DO NOTHING;

    -- Transport (tranche-based)
    INSERT INTO public.fee_config (school_id, fee_type, class_name, payment_mode, tranche_index, amount)
    VALUES
      (v_school_id, 'transport', v_cls, 'tranche', 1, CASE v_cls
        WHEN 'Jardin' THEN 21000 WHEN '1ère année' THEN 21000 WHEN '2ème année' THEN 21000
        WHEN '3ème année' THEN 24000 WHEN '4ème année' THEN 24000 WHEN '5ème année' THEN 24000
        WHEN '6ème année' THEN 24000 WHEN '7ème année' THEN 27000 WHEN '8ème année' THEN 27000
        WHEN '9ème année' THEN 27000 ELSE 21000 END),
      (v_school_id, 'transport', v_cls, 'tranche', 2, CASE v_cls
        WHEN 'Jardin' THEN 21000 WHEN '1ère année' THEN 21000 WHEN '2ème année' THEN 21000
        WHEN '3ème année' THEN 24000 WHEN '4ème année' THEN 24000 WHEN '5ème année' THEN 24000
        WHEN '6ème année' THEN 24000 WHEN '7ème année' THEN 27000 WHEN '8ème année' THEN 27000
        WHEN '9ème année' THEN 27000 ELSE 21000 END),
      (v_school_id, 'transport', v_cls, 'tranche', 3, CASE v_cls
        WHEN 'Jardin' THEN 21000 WHEN '1ère année' THEN 21000 WHEN '2ème année' THEN 21000
        WHEN '3ème année' THEN 24000 WHEN '4ème année' THEN 24000 WHEN '5ème année' THEN 24000
        WHEN '6ème année' THEN 24000 WHEN '7ème année' THEN 27000 WHEN '8ème année' THEN 27000
        WHEN '9ème année' THEN 27000 ELSE 21000 END)
    ON CONFLICT (school_id, fee_type, class_name, tranche_index) DO NOTHING;
  END LOOP;

  -- Also seed old pricing_config for backward compatibility
  INSERT INTO public.pricing_config (school_id, class_name, service, annual_fee)
  VALUES
    (v_school_id, 'Jardin',     'scolarite', 135000),
    (v_school_id, 'Jardin',     'cantine',    90000),
    (v_school_id, 'Jardin',     'transport',  63000),
    (v_school_id, '1ère année', 'scolarite', 162000),
    (v_school_id, '1ère année', 'cantine',    90000),
    (v_school_id, '1ère année', 'transport',  63000),
    (v_school_id, '2ème année', 'scolarite', 162000),
    (v_school_id, '2ème année', 'cantine',    90000),
    (v_school_id, '2ème année', 'transport',  63000),
    (v_school_id, '3ème année', 'scolarite', 180000),
    (v_school_id, '3ème année', 'cantine',   108000),
    (v_school_id, '3ème année', 'transport',  72000),
    (v_school_id, '4ème année', 'scolarite', 180000),
    (v_school_id, '4ème année', 'cantine',   108000),
    (v_school_id, '4ème année', 'transport',  72000),
    (v_school_id, '5ème année', 'scolarite', 198000),
    (v_school_id, '5ème année', 'cantine',   108000),
    (v_school_id, '5ème année', 'transport',  72000),
    (v_school_id, '6ème année', 'scolarite', 225000),
    (v_school_id, '6ème année', 'cantine',   108000),
    (v_school_id, '6ème année', 'transport',  72000),
    (v_school_id, '7ème année', 'scolarite', 252000),
    (v_school_id, '7ème année', 'cantine',   126000),
    (v_school_id, '7ème année', 'transport',  81000),
    (v_school_id, '8ème année', 'scolarite', 270000),
    (v_school_id, '8ème année', 'cantine',   126000),
    (v_school_id, '8ème année', 'transport',  81000),
    (v_school_id, '9ème année', 'scolarite', 315000),
    (v_school_id, '9ème année', 'cantine',   126000),
    (v_school_id, '9ème année', 'transport',  81000)
  ON CONFLICT (school_id, class_name, service) DO NOTHING;

  -- Seed default uniform stock
  INSERT INTO public.stock_items (school_id, category, size, cycle, old_stock, new_stock, sold, price)
  VALUES
    (v_school_id, 'tenue', '4',  'maternelle', 12, 8, 5, 5000),
    (v_school_id, 'tenue', '6',  'maternelle', 10, 6, 7, 5000),
    (v_school_id, 'tenue', '8',  'maternelle',  8, 4, 2, 5000),
    (v_school_id, 'tenue', '10', 'maternelle',  6, 3, 1, 5000),
    (v_school_id, 'tenue', '8',  'cycle1',     14, 10, 8, 6000),
    (v_school_id, 'tenue', '10', 'cycle1',     12,  8, 9, 6000),
    (v_school_id, 'tenue', '12', 'cycle1',     10,  6, 4, 6000),
    (v_school_id, 'tenue', 'S',  'cycle2',     10,  6, 3, 7000),
    (v_school_id, 'tenue', 'M',  'cycle2',      8,  4, 2, 7000),
    (v_school_id, 'tenue', 'L',  'cycle2',      6,  2, 2, 7000),
    (v_school_id, 'tenue', 'XL', 'cycle2',      4,  2, 0, 7000)
  ON CONFLICT DO NOTHING;

  -- Seed default book stock
  INSERT INTO public.stock_items (school_id, category, class_level, subject, in_stock, sold)
  VALUES
    (v_school_id, 'livre', 'Jardin',     'Lecture',      30, 12),
    (v_school_id, 'livre', 'Jardin',     'Calcul',       25, 10),
    (v_school_id, 'livre', 'Jardin',     'Écriture',     20,  8),
    (v_school_id, 'livre', '1ère année', 'Lecture',      35, 18),
    (v_school_id, 'livre', '1ère année', 'Calcul',       30, 15),
    (v_school_id, 'livre', '1ère année', 'Dictée',       20,  9),
    (v_school_id, 'livre', '2ème année', 'Lecture',      28, 14),
    (v_school_id, 'livre', '2ème année', 'Calcul',       26, 12),
    (v_school_id, 'livre', '2ème année', 'Grammaire',    18,  6),
    (v_school_id, 'livre', '3ème année', 'Lecture',      24, 11),
    (v_school_id, 'livre', '3ème année', 'Calcul',       22, 10),
    (v_school_id, 'livre', '3ème année', 'Histoire-Géo', 15,  4),
    (v_school_id, 'livre', '4ème année', 'Lecture',      20,  8),
    (v_school_id, 'livre', '4ème année', 'Calcul',       20,  7),
    (v_school_id, 'livre', '4ème année', 'Sciences',     14,  3),
    (v_school_id, 'livre', '5ème année', 'Calcul',       18,  9),
    (v_school_id, 'livre', '5ème année', 'Histoire-Géo', 16,  5),
    (v_school_id, 'livre', '5ème année', 'Anglais',      12,  4),
    (v_school_id, 'livre', '6ème année', 'Calcul',       16,  6),
    (v_school_id, 'livre', '6ème année', 'Grammaire',    14,  5),
    (v_school_id, 'livre', '6ème année', 'Sciences',     12,  2),
    (v_school_id, 'livre', '7ème année', 'Calcul',       14,  7),
    (v_school_id, 'livre', '7ème année', 'Histoire-Géo', 12,  4),
    (v_school_id, 'livre', '7ème année', 'Anglais',      10,  3),
    (v_school_id, 'livre', '8ème année', 'Calcul',       12,  5),
    (v_school_id, 'livre', '8ème année', 'Conjugaison',  10,  4),
    (v_school_id, 'livre', '8ème année', 'Sciences',      8,  1),
    (v_school_id, 'livre', '9ème année', 'Calcul',       10,  4),
    (v_school_id, 'livre', '9ème année', 'Histoire-Géo',  8,  2),
    (v_school_id, 'livre', '9ème année', 'Anglais',       6,  1)
  ON CONFLICT DO NOTHING;

  RETURN v_school_id;
END;
$$;
