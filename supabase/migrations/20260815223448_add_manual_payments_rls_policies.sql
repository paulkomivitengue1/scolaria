/*
# Add RLS policies to manual_payments table

## Purpose
The manual_payments table was created with RLS enabled but NO policies,
making it completely inaccessible to authenticated school users. This
migration adds the standard 4 CRUD policies (SELECT, INSERT, UPDATE,
DELETE) scoped by current_school_id(), matching the pattern used on
every other table in the schema.

## Changes

### manual_payments — 4 new policies
- SELECT: authenticated users can read payments for their own school only
- INSERT: authenticated users can create payments for their own school only
- UPDATE: authenticated users can update payments for their own school only
- DELETE: authenticated users can delete payments for their own school only

All policies use `current_school_id()` (existing SECURITY DEFINER helper)
and are scoped `TO authenticated`, identical to the students/payments/
stock_items tables.

### Security
- No table structure changes, no new columns
- The admin edge function uses the service role key which bypasses RLS,
  so admin validate/reject actions are unaffected
- School users can now submit and view their own manual payments but
  cannot access other schools' payments
*/
DROP POLICY IF EXISTS "select_own_manual_payments" ON manual_payments;
CREATE POLICY "select_own_manual_payments" ON manual_payments
  FOR SELECT TO authenticated
  USING (school_id = current_school_id());

DROP POLICY IF EXISTS "insert_own_manual_payments" ON manual_payments;
CREATE POLICY "insert_own_manual_payments" ON manual_payments
  FOR INSERT TO authenticated
  WITH CHECK (school_id = current_school_id());

DROP POLICY IF EXISTS "update_own_manual_payments" ON manual_payments;
CREATE POLICY "update_own_manual_payments" ON manual_payments
  FOR UPDATE TO authenticated
  USING (school_id = current_school_id())
  WITH CHECK (school_id = current_school_id());

DROP POLICY IF EXISTS "delete_own_manual_payments" ON manual_payments;
CREATE POLICY "delete_own_manual_payments" ON manual_payments
  FOR DELETE TO authenticated
  USING (school_id = current_school_id());

NOTIFY pgrst, 'reload schema';
