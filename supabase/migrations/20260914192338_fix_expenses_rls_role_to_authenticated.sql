-- Fix: expenses policies were scoped to `public` (includes anon) instead of `authenticated`.
-- Recreate them with TO authenticated to match all other tables in the schema.

DROP POLICY IF EXISTS select_own_expenses ON expenses;
DROP POLICY IF EXISTS insert_own_expenses ON expenses;
DROP POLICY IF EXISTS update_own_expenses ON expenses;
DROP POLICY IF EXISTS delete_own_expenses ON expenses;

CREATE POLICY select_own_expenses ON expenses
  FOR SELECT TO authenticated
  USING (school_id = current_school_id());

CREATE POLICY insert_own_expenses ON expenses
  FOR INSERT TO authenticated
  WITH CHECK (school_id = current_school_id());

CREATE POLICY update_own_expenses ON expenses
  FOR UPDATE TO authenticated
  USING (school_id = current_school_id())
  WITH CHECK (school_id = current_school_id());

CREATE POLICY delete_own_expenses ON expenses
  FOR DELETE TO authenticated
  USING (school_id = current_school_id());
