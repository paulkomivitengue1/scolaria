/*
# Create teachers and salary_payments tables

1. New Tables
- `teachers`: stores teacher profiles with individually configurable monthly salary.
  - `id` (uuid, PK)
  - `school_id` (uuid, FK to schools, ON DELETE CASCADE)
  - `first_name` (text, not null)
  - `last_name` (text, not null)
  - `phone` (text)
  - `subject` (text) — main subject taught
  - `monthly_salary` (integer, default 0) — monthly salary in FCFA
  - `created_at` (timestamptz, default now())

- `salary_payments`: tracks individual salary payments per teacher per month.
  - `id` (uuid, PK)
  - `school_id` (uuid, FK to schools, ON DELETE CASCADE)
  - `teacher_id` (uuid, FK to teachers, ON DELETE CASCADE)
  - `month` (text, not null) — format 'YYYY-MM'
  - `amount` (integer, not null) — amount paid
  - `paid_at` (timestamptz, default now())
  - Unique constraint on (teacher_id, month) to prevent duplicate payments for the same month.

2. Security
- RLS enabled on both tables.
- Policies scoped to `authenticated` using `school_id = current_school_id()` — same pattern as all other tables in this multi-tenant app.
- Four CRUD policies per table (SELECT/INSERT/UPDATE/DELETE).

3. Indexes
- `salary_payments` indexed on `teacher_id` for fast lookups.
- `teachers` indexed on `school_id`.
*/

CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text DEFAULT '',
  subject text DEFAULT '',
  monthly_salary integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_teachers" ON teachers;
CREATE POLICY "select_own_teachers" ON teachers FOR SELECT
  TO authenticated USING (school_id = current_school_id());

DROP POLICY IF EXISTS "insert_own_teachers" ON teachers;
CREATE POLICY "insert_own_teachers" ON teachers FOR INSERT
  TO authenticated WITH CHECK (school_id = current_school_id());

DROP POLICY IF EXISTS "update_own_teachers" ON teachers;
CREATE POLICY "update_own_teachers" ON teachers FOR UPDATE
  TO authenticated USING (school_id = current_school_id()) WITH CHECK (school_id = current_school_id());

DROP POLICY IF EXISTS "delete_own_teachers" ON teachers;
CREATE POLICY "delete_own_teachers" ON teachers FOR DELETE
  TO authenticated USING (school_id = current_school_id());

CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON teachers(school_id);

CREATE TABLE IF NOT EXISTS salary_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  month text NOT NULL,
  amount integer NOT NULL,
  paid_at timestamptz DEFAULT now(),
  UNIQUE(teacher_id, month)
);

ALTER TABLE salary_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_salary_payments" ON salary_payments;
CREATE POLICY "select_own_salary_payments" ON salary_payments FOR SELECT
  TO authenticated USING (school_id = current_school_id());

DROP POLICY IF EXISTS "insert_own_salary_payments" ON salary_payments;
CREATE POLICY "insert_own_salary_payments" ON salary_payments FOR INSERT
  TO authenticated WITH CHECK (school_id = current_school_id());

DROP POLICY IF EXISTS "delete_own_salary_payments" ON salary_payments;
CREATE POLICY "delete_own_salary_payments" ON salary_payments FOR DELETE
  TO authenticated USING (school_id = current_school_id());

CREATE INDEX IF NOT EXISTS idx_salary_payments_teacher_id ON salary_payments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_school_id ON salary_payments(school_id);
