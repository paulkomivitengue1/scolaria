/*
# Gestilys — Multi-tenant school management schema

## Purpose
Each school using Gestilys has its own isolated data (students, payments, stock,
pricing). A single codebase serves all schools. Row-Level Security ensures no
school can ever see another school's data.

## Tables created
1. schools — one row per school (tenant). Tracks subscription/trial status.
2. users — links a Supabase auth.users account to a school + role.
3. classes — class names per school (Maternelle → 9ème année).
4. students — students per school, linked to a class.
5. payments — individual payment records per student/month/service.
6. stock_items — uniforms & books inventory per school.
7. pricing_config — annual fee per class/service per school.

## Security
- RLS enabled on every table.
- A SECURITY DEFINER function `current_school_id()` resolves the caller's
  school_id from the users table (cached per transaction).
- Every policy scopes rows through `current_school_id()` so a user from
  School A can never read, insert, update, or delete rows belonging to School B.
- A SECURITY DEFINER function `handle_new_school()` creates the school row,
  the admin user row, and seeds default pricing — all atomically during signup.

## Notes
- `auth.uid()` is used in the helper function (runs as the authenticated caller).
- Owner columns (school_id) are NOT defaulted to auth.uid() because the owner
  is the school, not the individual user. The data-access layer supplies
  school_id explicitly on every insert.
- Trial period: 14 days from creation. `subscription_status` starts as 'trial'
  and the frontend checks `trial_ends_at` for soft-block messaging.
*/

-- ── schools ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schools (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  director_name   text NOT NULL DEFAULT '',
  phone           text NOT NULL DEFAULT '',
  subscription_status text NOT NULL DEFAULT 'trial'
                    CHECK (subscription_status IN ('trial','active','expired')),
  trial_ends_at   timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── users (profile, linked to auth.users) ───────────────
CREATE TABLE IF NOT EXISTS users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_uid    uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id   uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'admin_ecole'
                CHECK (role IN ('admin_ecole','secretariat','enseignant')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_school ON users(school_id);

-- ── classes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name        text NOT NULL,
  level       text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, name)
);
CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id);

-- ── students ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id      uuid REFERENCES classes(id) ON DELETE SET NULL,
  first_name    text NOT NULL,
  last_name     text NOT NULL,
  birth_date    date,
  parent_name   text NOT NULL DEFAULT '',
  parent_phone  text NOT NULL DEFAULT '',
  status        text NOT NULL DEFAULT 'actif'
                  CHECK (status IN ('actif','transfere','archive')),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_class   ON students(class_id);

-- ── payments ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id    uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount        integer NOT NULL DEFAULT 0,
  type          text NOT NULL DEFAULT 'scolarite'
                  CHECK (type IN ('scolarite','cantine','transport')),
  method        text NOT NULL DEFAULT 'especes'
                  CHECK (method IN ('Orange Money','Moov','especes')),
  month_key     text NOT NULL,
  payment_date  timestamptz NOT NULL DEFAULT now(),
  receipt_sent  boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_payments_school  ON payments(school_id);
CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);

-- ── stock_items (uniforms + books in one table) ──────────
CREATE TABLE IF NOT EXISTS stock_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  category        text NOT NULL CHECK (category IN ('tenue','livre')),
  name            text NOT NULL DEFAULT '',
  size            text NOT NULL DEFAULT '',
  class_level     text NOT NULL DEFAULT '',
  cycle           text NOT NULL DEFAULT '',
  subject         text NOT NULL DEFAULT '',
  old_stock       integer NOT NULL DEFAULT 0,
  new_stock       integer NOT NULL DEFAULT 0,
  sold            integer NOT NULL DEFAULT 0,
  price           integer NOT NULL DEFAULT 0,
  in_stock        integer NOT NULL DEFAULT 0,
  alert_threshold integer NOT NULL DEFAULT 3,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stock_school ON stock_items(school_id);
CREATE INDEX IF NOT EXISTS idx_stock_cat    ON stock_items(school_id, category);

-- ── pricing_config ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS pricing_config (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_name  text NOT NULL,
  service     text NOT NULL CHECK (service IN ('scolarite','cantine','transport')),
  annual_fee  integer NOT NULL DEFAULT 0,
  UNIQUE(school_id, class_name, service)
);
CREATE INDEX IF NOT EXISTS idx_pricing_school ON pricing_config(school_id);

-- ══════════════════════════════════════════════════════════
-- HELPER FUNCTION: current_school_id()
-- SECURITY DEFINER — runs with table owner privileges, safe because it
-- only reads the users table filtered by auth.uid().
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION current_school_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT school_id FROM public.users WHERE auth_uid = auth.uid() LIMIT 1;
$$;

-- ══════════════════════════════════════════════════════════
-- HELPER FUNCTION: handle_new_school()
-- Called from the frontend after signUp. Creates the school row, the
-- admin user profile, and seeds default pricing — atomically.
-- SECURITY DEFINER so it can insert into schools+users even though
-- the caller has no RLS grants yet (brand-new school has no rows).
-- ══════════════════════════════════════════════════════════
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

  -- Seed default pricing (same defaults as the original app)
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

-- ══════════════════════════════════════════════════════════
-- RLS — enable on all tables
-- ══════════════════════════════════════════════════════════
ALTER TABLE schools        ENABLE ROW LEVEL SECURITY;
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE students       ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════
-- POLICIES — schools
-- A user can see/manage only their own school.
-- ══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "select_own_school" ON schools;
CREATE POLICY "select_own_school" ON schools
  FOR SELECT TO authenticated
  USING (id = current_school_id());

DROP POLICY IF EXISTS "update_own_school" ON schools;
CREATE POLICY "update_own_school" ON schools
  FOR UPDATE TO authenticated
  USING (id = current_school_id())
  WITH CHECK (id = current_school_id());

-- ══════════════════════════════════════════════════════════
-- POLICIES — users
-- A user can see all users in their school (colleagues), but only
-- update their own profile row.
-- ══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "select_school_users" ON users;
CREATE POLICY "select_school_users" ON users
  FOR SELECT TO authenticated
  USING (school_id = current_school_id());

DROP POLICY IF EXISTS "update_own_user" ON users;
CREATE POLICY "update_own_user" ON users
  FOR UPDATE TO authenticated
  USING (auth_uid = auth.uid())
  WITH CHECK (school_id = current_school_id());

-- ══════════════════════════════════════════════════════════
-- POLICIES — classes
-- ══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "select_own_classes" ON classes;
CREATE POLICY "select_own_classes" ON classes
  FOR SELECT TO authenticated
  USING (school_id = current_school_id());

DROP POLICY IF EXISTS "insert_own_classes" ON classes;
CREATE POLICY "insert_own_classes" ON classes
  FOR INSERT TO authenticated
  WITH CHECK (school_id = current_school_id());

DROP POLICY IF EXISTS "update_own_classes" ON classes;
CREATE POLICY "update_own_classes" ON classes
  FOR UPDATE TO authenticated
  USING (school_id = current_school_id())
  WITH CHECK (school_id = current_school_id());

DROP POLICY IF EXISTS "delete_own_classes" ON classes;
CREATE POLICY "delete_own_classes" ON classes
  FOR DELETE TO authenticated
  USING (school_id = current_school_id());

-- ══════════════════════════════════════════════════════════
-- POLICIES — students
-- ══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "select_own_students" ON students;
CREATE POLICY "select_own_students" ON students
  FOR SELECT TO authenticated
  USING (school_id = current_school_id());

DROP POLICY IF EXISTS "insert_own_students" ON students;
CREATE POLICY "insert_own_students" ON students
  FOR INSERT TO authenticated
  WITH CHECK (school_id = current_school_id());

DROP POLICY IF EXISTS "update_own_students" ON students;
CREATE POLICY "update_own_students" ON students
  FOR UPDATE TO authenticated
  USING (school_id = current_school_id())
  WITH CHECK (school_id = current_school_id());

DROP POLICY IF EXISTS "delete_own_students" ON students;
CREATE POLICY "delete_own_students" ON students
  FOR DELETE TO authenticated
  USING (school_id = current_school_id());

-- ══════════════════════════════════════════════════════════
-- POLICIES — payments
-- ══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "select_own_payments" ON payments;
CREATE POLICY "select_own_payments" ON payments
  FOR SELECT TO authenticated
  USING (school_id = current_school_id());

DROP POLICY IF EXISTS "insert_own_payments" ON payments;
CREATE POLICY "insert_own_payments" ON payments
  FOR INSERT TO authenticated
  WITH CHECK (school_id = current_school_id());

DROP POLICY IF EXISTS "update_own_payments" ON payments;
CREATE POLICY "update_own_payments" ON payments
  FOR UPDATE TO authenticated
  USING (school_id = current_school_id())
  WITH CHECK (school_id = current_school_id());

DROP POLICY IF EXISTS "delete_own_payments" ON payments;
CREATE POLICY "delete_own_payments" ON payments
  FOR DELETE TO authenticated
  USING (school_id = current_school_id());

-- ══════════════════════════════════════════════════════════
-- POLICIES — stock_items
-- ══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "select_own_stock" ON stock_items;
CREATE POLICY "select_own_stock" ON stock_items
  FOR SELECT TO authenticated
  USING (school_id = current_school_id());

DROP POLICY IF EXISTS "insert_own_stock" ON stock_items;
CREATE POLICY "insert_own_stock" ON stock_items
  FOR INSERT TO authenticated
  WITH CHECK (school_id = current_school_id());

DROP POLICY IF EXISTS "update_own_stock" ON stock_items;
CREATE POLICY "update_own_stock" ON stock_items
  FOR UPDATE TO authenticated
  USING (school_id = current_school_id())
  WITH CHECK (school_id = current_school_id());

DROP POLICY IF EXISTS "delete_own_stock" ON stock_items;
CREATE POLICY "delete_own_stock" ON stock_items
  FOR DELETE TO authenticated
  USING (school_id = current_school_id());

-- ══════════════════════════════════════════════════════════
-- POLICIES — pricing_config
-- ═══════════════ │═════════════════════════════════════════
DROP POLICY IF EXISTS "select_own_pricing" ON pricing_config;
CREATE POLICY "select_own_pricing" ON pricing_config
  FOR SELECT TO authenticated
  USING (school_id = current_school_id());

DROP POLICY IF EXISTS "insert_own_pricing" ON pricing_config;
CREATE POLICY "insert_own_pricing" ON pricing_config
  FOR INSERT TO authenticated
  WITH CHECK (school_id = current_school_id());

DROP POLICY IF EXISTS "update_own_pricing" ON pricing_config;
CREATE POLICY "update_own_pricing" ON pricing_config
  FOR UPDATE TO authenticated
  USING (school_id = current_school_id())
  WITH CHECK (school_id = current_school_id());

DROP POLICY IF EXISTS "delete_own_pricing" ON pricing_config;
CREATE POLICY "delete_own_pricing" ON pricing_config
  FOR DELETE TO authenticated
  USING (school_id = current_school_id());